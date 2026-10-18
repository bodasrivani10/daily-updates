import os
import json
import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from ..models.base import get_db
from ..models.db_models import SlackWorkspaceIntegration, User, ImportBatch
from ..services.validation import validate_records
from ..services.deduplication import process_deduplication
from ..services.grouping import group_updates_by_work_item
from ..services.state_resolution import resolve_work_item_states
from ..services.conflict_detection import detect_conflicts
from ..services.blocker_detection import detect_blockers

router = APIRouter(prefix="/api/slack", tags=["Slack Integration"])

# Environment variables for Slack App credentials
# Users can set these in .env or provide them via API configuration
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI", "http://localhost:8000/api/slack/oauth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Scopes needed for Slack bot & user reads
SLACK_SCOPES = "channels:read,channels:history,groups:read,groups:history,chat:write,incoming-webhook"
SLACK_USER_SCOPES = "identify"


class SlackConfigUpdate(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    bot_token: Optional[str] = None
    default_channel: Optional[str] = None


class SlackSendMessageRequest(BaseModel):
    message: str
    channel: Optional[str] = None


class SlackSyncRequest(BaseModel):
    channel_id: Optional[str] = None
    limit: Optional[int] = 30


@router.get("/config")
def get_slack_config(db: Session = Depends(get_db)):
    """Returns the current Slack OAuth and integration configuration status."""
    integration = db.query(SlackWorkspaceIntegration).filter_by(is_active=True).first()
    return {
        "client_id_configured": bool(SLACK_CLIENT_ID or (integration and integration.bot_access_token)),
        "client_id": SLACK_CLIENT_ID[:6] + "..." if len(SLACK_CLIENT_ID) > 6 else SLACK_CLIENT_ID,
        "is_connected": bool(integration and integration.bot_access_token),
        "team_name": integration.team_name if integration else None,
        "team_id": integration.team_id if integration else None,
        "selected_channel_name": integration.selected_channel_name if integration else None,
        "selected_channel_id": integration.selected_channel_id if integration else None,
        "has_token": bool(integration and integration.bot_access_token),
    }


@router.get("/oauth/authorize")
def slack_oauth_authorize(
    client_id: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None
):
    """
    Redirects the user directly to Slack's OAuth authorization page.
    If no client_id is configured yet, guides the user to supply their Slack App credentials.
    """
    c_id = client_id or SLACK_CLIENT_ID
    r_uri = redirect_uri or SLACK_REDIRECT_URI

    if not c_id:
        # If client ID is missing, redirect to Slack Apps page to create an app or prompt setup
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?slack_setup_required=true&reason=missing_client_id"
        )

    slack_auth_url = (
        f"https://slack.com/oauth/v2/authorize"
        f"?client_id={c_id}"
        f"&scope={SLACK_SCOPES}"
        f"&user_scope={SLACK_USER_SCOPES}"
        f"&redirect_uri={r_uri}"
    )
    if state:
        slack_auth_url += f"&state={state}"

    return RedirectResponse(url=slack_auth_url)


@router.get("/oauth/callback")
async def slack_oauth_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Receives authorization code from Slack, exchanges for bot token,
    saves the integration to the database, and redirects back to the frontend.
    """
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?slack_status=error&error={error}"
        )

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Slack.")

    # Exchange code for access token via Slack API
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": SLACK_CLIENT_ID,
                "client_secret": SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": SLACK_REDIRECT_URI,
            }
        )
        token_data = token_resp.json()

    if not token_data.get("ok"):
        error_msg = token_data.get("error", "Failed to exchange OAuth code")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?slack_status=error&error={error_msg}"
        )

    # Save or update integration in SQLite
    team = token_data.get("team", {})
    authed_user = token_data.get("authed_user", {})
    incoming_webhook = token_data.get("incoming_webhook", {})

    existing = db.query(SlackWorkspaceIntegration).filter_by(team_id=team.get("id")).first()
    if not existing:
        existing = SlackWorkspaceIntegration(
            team_id=team.get("id", "unknown_team"),
            team_name=team.get("name", "Slack Workspace"),
            bot_access_token=token_data.get("access_token", ""),
            bot_user_id=token_data.get("bot_user_id", ""),
            scope=token_data.get("scope", ""),
            incoming_webhook_url=incoming_webhook.get("url"),
            incoming_webhook_channel=incoming_webhook.get("channel"),
            authed_user_id=authed_user.get("id"),
            authed_user_token=authed_user.get("access_token"),
            is_active=True,
        )
        db.add(existing)
    else:
        existing.team_name = team.get("name", existing.team_name)
        existing.bot_access_token = token_data.get("access_token", existing.bot_access_token)
        existing.bot_user_id = token_data.get("bot_user_id", existing.bot_user_id)
        existing.scope = token_data.get("scope", existing.scope)
        if incoming_webhook.get("url"):
            existing.incoming_webhook_url = incoming_webhook.get("url")
            existing.incoming_webhook_channel = incoming_webhook.get("channel")
        existing.is_active = True

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/?slack_status=success&team={team.get('name', 'Slack')}"
    )


@router.post("/manual-connect")
def manual_slack_connect(
    payload: SlackConfigUpdate,
    db: Session = Depends(get_db)
):
    """
    Allows developers or users to directly paste a Slack Bot User OAuth Token
    (e.g., 'xoxb-...') or custom client credentials without running full web redirect.
    """
    if not payload.bot_token and not (payload.client_id and payload.client_secret):
        raise HTTPException(status_code=400, detail="Provide a bot_token (xoxb-...) or client_id + client_secret")

    # If bot token is provided directly:
    if payload.bot_token:
        # Test connection to Slack auth.test
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://slack.com/api/auth.test",
                    headers={"Authorization": f"Bearer {payload.bot_token}"}
                )
                auth_info = res.json()
                if not auth_info.get("ok"):
                    raise HTTPException(status_code=400, detail=f"Slack authentication failed: {auth_info.get('error')}")

                team_id = auth_info.get("team_id", "manual_team")
                team_name = auth_info.get("team", "Slack Workspace")
                bot_user_id = auth_info.get("user_id")

                integration = db.query(SlackWorkspaceIntegration).filter_by(team_id=team_id).first()
                if not integration:
                    integration = SlackWorkspaceIntegration(
                        team_id=team_id,
                        team_name=team_name,
                        bot_access_token=payload.bot_token,
                        bot_user_id=bot_user_id,
                        selected_channel_name=payload.default_channel or "#daily-standup",
                        is_active=True
                    )
                    db.add(integration)
                else:
                    integration.bot_access_token = payload.bot_token
                    integration.team_name = team_name
                    integration.bot_user_id = bot_user_id
                    if payload.default_channel:
                        integration.selected_channel_name = payload.default_channel
                    integration.is_active = True

                db.commit()
                return {
                    "status": "connected",
                    "team_name": team_name,
                    "team_id": team_id,
                    "bot_user_id": bot_user_id,
                    "message": "Slack Bot Token connected successfully!"
                }
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Network error contacting Slack API: {str(e)}")

    # If OAuth Client ID and secret are configured
    global SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
    if payload.client_id:
        SLACK_CLIENT_ID = payload.client_id
    if payload.client_secret:
        SLACK_CLIENT_SECRET = payload.client_secret

    return {"status": "configured", "message": "Slack App credentials updated successfully."}


@router.get("/channels")
async def list_slack_channels(db: Session = Depends(get_db)):
    """Fetches public channels available to the bot in the connected Slack workspace."""
    integration = db.query(SlackWorkspaceIntegration).filter_by(is_active=True).first()
    if not integration or not integration.bot_access_token:
        # Return fallback channels so the user interface continues to function gracefully
        return {
            "channels": [
                {"id": "C_STANDUP", "name": "daily-standup", "is_member": True},
                {"id": "C_PROJECT", "name": "project-sync", "is_member": True},
                {"id": "C_GENERAL", "name": "general", "is_member": True},
            ],
            "connected": False
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://slack.com/api/conversations.list",
                headers={"Authorization": f"Bearer {integration.bot_access_token}"},
                params={"types": "public_channel,private_channel", "limit": 100}
            )
            data = res.json()
            if not data.get("ok"):
                return {"channels": [], "error": data.get("error"), "connected": True}

            channels = [
                {"id": ch["id"], "name": ch["name"], "is_member": ch.get("is_member", False)}
                for ch in data.get("channels", [])
            ]
            return {"channels": channels, "connected": True}
    except Exception as e:
        return {"channels": [], "error": str(e), "connected": True}


@router.post("/sync-messages")
async def sync_slack_messages(
    payload: SlackSyncRequest,
    user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Pulls recent messages from the Slack channel and pipes them through the DailySignal 7-stage
    processing pipeline (deduplication, state resolution, conflict & blocker detection).
    """
    integration = db.query(SlackWorkspaceIntegration).filter_by(is_active=True).first()
    if not integration or not integration.bot_access_token:
        # In mock / demo mode if no live Slack app has been linked yet
        # Synthesize a simulated real-time pull from Slack #daily-standup
        simulated_records = [
            {
                "source_id": f"slack-sync-{str(uuid.uuid4())[:6]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "author": "Slack Standup Bot",
                "work_item_id": "TASK-204",
                "text": "Sync from Slack #daily-standup: Fixed validation webhook bugs. Staging pipeline triggered.",
                "visibility": "team",
                "source_system": "slack"
            }
        ]
        return _ingest_slack_records(db, simulated_records, channel_name="daily-standup (Simulated)")

    channel_id = payload.channel_id or integration.selected_channel_id
    if not channel_id:
        raise HTTPException(status_code=400, detail="No channel specified or selected for sync.")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://slack.com/api/conversations.history",
                headers={"Authorization": f"Bearer {integration.bot_access_token}"},
                params={"channel": channel_id, "limit": payload.limit or 20}
            )
            data = res.json()
            if not data.get("ok"):
                raise HTTPException(status_code=400, detail=f"Slack API error: {data.get('error')}")

            messages = data.get("messages", [])
            records = []
            for msg in messages:
                # Ignore bot joins and channel updates
                if msg.get("subtype") in ["channel_join", "channel_leave", "pinned_item"]:
                    continue

                records.append({
                    "source_id": f"slack-{msg.get('ts', str(uuid.uuid4()))}",
                    "timestamp": datetime.fromtimestamp(float(msg.get("ts", 0)), tz=timezone.utc).isoformat() if "ts" in msg else datetime.now(timezone.utc).isoformat(),
                    "author": msg.get("user") or "Slack Member",
                    "work_item_id": None, # Will be parsed or grouped
                    "text": msg.get("text", ""),
                    "visibility": "team",
                    "source_system": "slack"
                })

            return _ingest_slack_records(db, records, channel_name=channel_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync messages: {str(e)}")


def _ingest_slack_records(db: Session, records: List[dict], channel_name: str):
    """Feeds Slack records through DailySignal 7-stage engine."""
    import_id = f"slack-{str(uuid.uuid4())[:6]}"
    val_res = validate_records(records, user_role="lead")

    batch = ImportBatch(
        id=import_id,
        filename=f"Slack Channel #{channel_name}",
        total_rows=val_res.total_records,
        accepted_rows=val_res.accepted_count,
        rejected_rows=val_res.rejected_count,
        warning_count=val_res.warning_count,
        duplicate_count=0,
        status="completed" if val_res.accepted_count > 0 else "failed",
        errors_json=json.dumps([e.model_dump() for e in val_res.errors]),
        warnings_json=json.dumps([w.model_dump() for w in val_res.warnings])
    )
    db.add(batch)
    db.commit()

    if val_res.accepted_count > 0:
        created_msgs, dup_matches = process_deduplication(db, import_id, val_res.accepted_records)
        batch.duplicate_count = len(dup_matches)
        db.commit()

        group_updates_by_work_item(db, created_msgs)
        resolve_work_item_states(db)
        detect_conflicts(db)
        detect_blockers(db)
        resolve_work_item_states(db)

    return {
        "status": "success",
        "synced_count": val_res.accepted_count,
        "import_id": import_id,
        "channel": channel_name,
        "message": f"Successfully ingested {val_res.accepted_count} Slack message(s) through DailySignal pipeline!"
    }


@router.post("/disconnect")
def disconnect_slack(db: Session = Depends(get_db)):
    """Removes active Slack connection."""
    integrations = db.query(SlackWorkspaceIntegration).all()
    for item in integrations:
        item.is_active = False
        db.delete(item)
    db.commit()
    return {"status": "disconnected", "message": "Slack workspace disconnected."}
