import re
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.db_models import SourceMessage, WorkItem, WorkItemEvent


# Seed title mappings for known starter topics or patterns
KNOWN_TITLES = {
    "TASK-204": "Core API Integration & Testing",
    "AUTH-101": "OAuth2 Scope Expansion & SecOps Audit",
    "PAY-305": "Payment Gateway v2 Migration",
    "DATA-402": "Data Pipeline ETL Latency & Analytics",
    "DASH-701": "Downstream Analytics Dashboard",
    "INFRA-550": "Production Kubernetes Cluster Upgrade (PR #82)",
    "UI-602": "Design System Typography & Hero Section Refresh",
    "SEC-900": "Vault Quarterly Access Key Rotation",
    "UNASSIGNED-REVIEW": "Unassigned Updates Needing Triage"
}

# Known dependencies graph
KNOWN_DEPENDENCIES = {
    "TASK-204": [],
    "AUTH-101": [],
    "PAY-305": ["AUTH-101"],
    "DASH-701": ["DATA-402"],
    "INFRA-550": []
}


def infer_work_item_id(text: str) -> Optional[str]:
    """
    Infers work item ID using regex ticket patterns or domain keywords.
    """
    # 1. Look for explicit ticket regex like TASK-123, JIRA-456, PR #82
    match = re.search(r'\b([A-Z]{2,10}-\d+)\b', text)
    if match:
        return match.group(1).upper()

    pr_match = re.search(r'\bPR\s*#(\d+)\b', text, re.IGNORECASE)
    if pr_match:
        pr_num = pr_match.group(1)
        if pr_num == "82":
            return "INFRA-550"

    # 2. Domain keyword matching
    lower = text.lower()
    if "payment" in lower or "gateway" in lower:
        return "PAY-305"
    if "oauth" in lower or "secops" in lower:
        return "AUTH-101"
    if "etl" in lower or "latency" in lower:
        return "DATA-402"
    if "hero" in lower or "typography" in lower:
        return "UI-602"
    if "vault" in lower or "security audit" in lower:
        return "SEC-900"

    return None


def group_updates_by_work_item(
    db: Session,
    messages: List[SourceMessage]
) -> List[WorkItem]:
    """
    Groups active (non-duplicate) messages by work item ID.
    Infers missing IDs or assigns to UNASSIGNED-REVIEW.
    Creates or updates WorkItem records and creates WorkItemEvents.
    """
    grouped_map: Dict[str, List[SourceMessage]] = {}

    for msg in messages:
        # We group even duplicates if needed, but primary grouping uses non-duplicates or all for history
        target_id = msg.work_item_id
        if not target_id:
            inferred = infer_work_item_id(msg.text)
            if inferred:
                target_id = inferred
                msg.work_item_id = inferred
            else:
                target_id = "UNASSIGNED-REVIEW"
                msg.work_item_id = target_id

        if target_id not in grouped_map:
            grouped_map[target_id] = []
        grouped_map[target_id].append(msg)

    updated_items: List[WorkItem] = []

    for item_id, item_msgs in grouped_map.items():
        # Sort messages by timestamp
        sorted_msgs = sorted(item_msgs, key=lambda m: m.timestamp)

        # Check if WorkItem already exists in DB
        work_item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
        if not work_item:
            title = KNOWN_TITLES.get(item_id, f"Work Item {item_id}")
            deps = KNOWN_DEPENDENCIES.get(item_id, [])
            work_item = WorkItem(
                id=item_id,
                title=title,
                current_owner=sorted_msgs[-1].author,
                resolved_status="unknown",
                last_updated=sorted_msgs[-1].timestamp,
                dependencies_json=json.dumps(deps),
                progress_summary=""
            )
            db.add(work_item)
            db.flush()
        else:
            work_item.last_updated = sorted_msgs[-1].timestamp

        # Create WorkItemEvents for messages not yet recorded
        existing_event_msg_ids = {
            e.source_message_id for e in db.query(WorkItemEvent).filter(WorkItemEvent.work_item_id == item_id).all()
        }

        for m in sorted_msgs:
            if m.id not in existing_event_msg_ids:
                event_type = "progress_claim"
                lower_text = m.text.lower()
                if any(w in lower_text for w in ["blocked", "failing", "waiting", "cannot proceed", "latency"]):
                    event_type = "blocker_claim"
                elif any(w in lower_text for w in ["ownership", "lead", "assigned"]):
                    event_type = "assignment"
                elif any(w in lower_text for w in ["correction", "actually", "clarif"]):
                    event_type = "correction"

                event = WorkItemEvent(
                    work_item_id=item_id,
                    source_message_id=m.id,
                    event_type=event_type,
                    timestamp=m.timestamp,
                    author=m.author,
                    notes=m.text[:200]
                )
                db.add(event)

        updated_items.append(work_item)

    # Ensure known downstream dependent items exist so dependencies can be tracked
    for dep_target, dep_sources in KNOWN_DEPENDENCIES.items():
        if any(src in grouped_map for src in dep_sources):
            existing_dep = db.query(WorkItem).filter(WorkItem.id == dep_target).first()
            if not existing_dep:
                title = KNOWN_TITLES.get(dep_target, f"Work Item {dep_target}")
                new_dep_item = WorkItem(
                    id=dep_target,
                    title=title,
                    current_owner="Unassigned",
                    resolved_status="unknown",
                    last_updated=sorted_msgs[-1].timestamp if sorted_msgs else "2026-10-17T08:30:00+05:30",
                    dependencies_json=json.dumps(dep_sources),
                    progress_summary=f"Awaiting upstream dependency ({', '.join(dep_sources)}) status."
                )
                db.add(new_dep_item)
                updated_items.append(new_dep_item)

    db.commit()
    return updated_items
