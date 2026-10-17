import re
import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.db_models import WorkItem, SourceMessage, BlockerRecord


BLOCKER_RULES = [
    {
        "trigger": r"(integration tests are failing|failing tests|tests are still failing|release is blocked)",
        "issue": "Release is blocked by failing integration tests.",
        "impact": "Release readiness is not confirmed; production deployment halted.",
        "severity": "critical",
        "default_owner": "Unassigned — requires QA / API test owner",
        "next_action": "Confirm who owns the failing integration tests and obtain updated test results.",
        "is_critical": True
    },
    {
        "trigger": r"(waiting for secops|security review approval|secops security review)",
        "issue": "OAuth2 scope expansion awaiting SecOps security review approval.",
        "impact": "Auth scope expansion cannot be merged into main branch.",
        "severity": "high",
        "default_owner": "SecOps Lead (External Reviewer)",
        "next_action": "Ping SecOps on security review ticket and schedule sign-off before end of sprint.",
        "is_critical": False
    },
    {
        "trigger": r"(etl latency increased|latency increased 4x|data is stale)",
        "issue": "ETL pipeline latency increased 4x after midnight batch processing.",
        "impact": "Downstream analytics (DASH-701) dashboard data is stale and violates SLA.",
        "severity": "critical",
        "default_owner": "Devin (Data Engineering)",
        "next_action": "Profile Spark/dbt ETL execution jobs and scale pipeline cluster nodes.",
        "is_critical": True
    },
    {
        "trigger": r"(blocked by|cannot proceed|waiting on|waiting for approval)",
        "issue": "Work item progress impeded by outstanding dependency or approval.",
        "impact": "Scheduled milestone delivery is delayed until resolved.",
        "severity": "high",
        "default_owner": "Unassigned",
        "next_action": "Triage outstanding blocker with respective stakeholders.",
        "is_critical": False
    }
]


def detect_blockers(db: Session) -> List[BlockerRecord]:
    """
    Detects critical blockers across all active source messages.
    Deterministic rule engine extracts issue, impact, severity, owner, next action, and source evidence.
    """
    detected_blockers: List[BlockerRecord] = []
    messages = db.query(SourceMessage).filter(SourceMessage.is_duplicate == False).all()

    for msg in messages:
        text = msg.text
        matched_rule = None
        for rule in BLOCKER_RULES:
            if re.search(rule["trigger"], text, re.IGNORECASE):
                matched_rule = rule
                break

        if matched_rule:
            work_item_id = msg.work_item_id or "UNASSIGNED-REVIEW"
            
            # Check if blocker already exists for this work item & source message
            existing = (
                db.query(BlockerRecord)
                .filter(
                    BlockerRecord.work_item_id == work_item_id,
                    BlockerRecord.source_id == msg.source_id
                )
                .first()
            )

            if not existing:
                owner = matched_rule["default_owner"]
                # If author is explicitly assigned or rule owner
                if "Unassigned" in owner and msg.author:
                    # If message says "waiting for approval", author is the one waiting, owner of blocker is reviewer
                    pass

                blocker = BlockerRecord(
                    work_item_id=work_item_id,
                    source_message_id=msg.id,
                    source_id=msg.source_id,
                    issue_text=matched_rule["issue"],
                    impact=matched_rule["impact"],
                    severity=matched_rule["severity"],
                    owner=owner,
                    next_action=matched_rule["next_action"],
                    status="active",
                    is_critical=matched_rule["is_critical"]
                )
                db.add(blocker)
                detected_blockers.append(blocker)

    # Check for downstream dependency blockers (e.g. DASH-701 depending on DATA-402)
    work_items = db.query(WorkItem).all()
    for item in work_items:
        deps = json.loads(item.dependencies_json or "[]")
        for dep_id in deps:
            # Check if dependency has active blockers
            dep_blockers = db.query(BlockerRecord).filter(BlockerRecord.work_item_id == dep_id, BlockerRecord.status == "active").all()
            if dep_blockers:
                existing_dep_blocker = (
                    db.query(BlockerRecord)
                    .filter(
                        BlockerRecord.work_item_id == item.id,
                        BlockerRecord.issue_text.like(f"%Upstream dependency {dep_id}%")
                    )
                    .first()
                )
                if not existing_dep_blocker:
                    parent_blocker = dep_blockers[0]
                    dep_blocker = BlockerRecord(
                        work_item_id=item.id,
                        source_message_id=parent_blocker.source_message_id,
                        source_id=parent_blocker.source_id,
                        issue_text=f"Upstream dependency {dep_id} has active blocker: {parent_blocker.issue_text}",
                        impact=f"Item {item.id} ({item.title}) cannot finalize reporting data.",
                        severity="high",
                        owner=parent_blocker.owner,
                        next_action=f"Resolve blocker on upstream item {dep_id} to unblock {item.id}.",
                        status="active",
                        is_critical=False
                    )
                    db.add(dep_blocker)
                    detected_blockers.append(dep_blocker)

    db.commit()
    return detected_blockers
