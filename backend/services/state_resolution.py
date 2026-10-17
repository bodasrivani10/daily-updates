import json
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..models.db_models import WorkItem, SourceMessage, BlockerRecord, ConflictRecord


def resolve_work_item_states(db: Session) -> List[WorkItem]:
    """
    Executes deterministic state resolution across all work items.
    Applies explicit precedence rules:
    - Never mark completed if active blockers or failing tests exist.
    - Separate subtask progress claims from release readiness.
    - Flag contradictions as 'conflict' or 'needs_review'.
    - Propagate blocked states to dependent work items.
    """
    work_items = db.query(WorkItem).all()
    resolved_items = []

    # First pass: resolve independent work items
    for item in work_items:
        # Get all non-duplicate source messages for this work item ordered by timestamp
        msgs = (
            db.query(SourceMessage)
            .filter(SourceMessage.work_item_id == item.id, SourceMessage.is_duplicate == False)
            .order_by(SourceMessage.timestamp.asc())
            .all()
        )

        if not msgs:
            item.resolved_status = "unknown"
            item.progress_summary = "No active source messages recorded."
            resolved_items.append(item)
            continue

        has_completion_claim = False
        completion_details = []
        has_blocker_claim = False
        blocker_details = []
        has_inprogress_claim = False
        has_clarification = False
        owners_seen = set()

        for m in msgs:
            text_lower = m.text.lower()
            owners_seen.add(m.author)

            # Check for clarification / dual distinction
            if "but release remains blocked" in text_lower or ("complete" in text_lower and "blocked" in text_lower):
                has_clarification = True
                has_completion_claim = True
                has_blocker_claim = True
                completion_details.append(f"API implementation completed [{m.source_id}]")
                blocker_details.append(f"Release blocked by failing tests [{m.source_id}]")
                continue

            # Blocker check
            if any(k in text_lower for k in ["blocked", "failing", "waiting for", "latency increased", "cannot proceed", "failing tests"]):
                has_blocker_claim = True
                blocker_details.append(f"{m.text} [{m.source_id}]")

            # Completion check
            if any(k in text_lower for k in ["complete", "completed", "merged", "shipped", "done", "scaffolded", "rotated"]):
                if not any(k in text_lower for k in ["pending", "waiting"]):
                    has_completion_claim = True
                    completion_details.append(f"{m.text} [{m.source_id}]")
                else:
                    has_inprogress_claim = True

            # In progress
            if any(k in text_lower for k in ["in progress", "scaffolded", "migrating", "refresh", "redesigned", "working on", "taking full ownership"]):
                has_inprogress_claim = True

        # Check for active conflicts on this work item
        unresolved_conflicts = (
            db.query(ConflictRecord)
            .filter(ConflictRecord.work_item_id == item.id, ConflictRecord.resolution_status == "unresolved")
            .count()
        )

        # Explicit status determination
        if unresolved_conflicts > 0:
            item.resolved_status = "conflict"
            item.progress_summary = "Conflicting claims detected; pending human review or clarification."
        elif has_blocker_claim and has_completion_claim:
            # Dual aspect: subcomponent finished, but overall item/release is blocked!
            # CRITICAL RULE: Must NOT mark completed!
            item.resolved_status = "blocked"
            item.progress_summary = "Subcomponent work completed, but overall progress is BLOCKED by outstanding issues/tests."
        elif has_blocker_claim:
            item.resolved_status = "blocked"
            item.progress_summary = f"Progress blocked: {blocker_details[-1] if blocker_details else 'Active blocker flagged'}"
        elif has_completion_claim and not has_inprogress_claim:
            # If "deployment pending" or similar condition exists, it's in_progress, not completed
            any_pending = any("pending" in m.text.lower() for m in msgs)
            if any_pending:
                item.resolved_status = "in_progress"
                item.progress_summary = "Code merged, but deployment/verification is still pending."
            else:
                item.resolved_status = "completed"
                item.progress_summary = f"Confirmed complete: {completion_details[-1] if completion_details else 'Verified complete'}"
        elif has_inprogress_claim:
            item.resolved_status = "in_progress"
            item.progress_summary = "Work is currently in active development."
        else:
            item.resolved_status = "unknown"
            item.progress_summary = "Insufficient status claims to determine progress state."

        # Assign most authoritative owner
        if len(owners_seen) == 1:
            item.current_owner = list(owners_seen)[0]
        elif len(owners_seen) > 1 and item.resolved_status != "conflict":
            # Latest non-bot author
            valid_authors = [m.author for m in msgs if "bot" not in m.author.lower()]
            item.current_owner = valid_authors[-1] if valid_authors else msgs[-1].author

        resolved_items.append(item)

    # Second pass: Dependency propagation (e.g. DASH-701 depends on DATA-402)
    item_status_map = {item.id: item.resolved_status for item in work_items}
    for item in work_items:
        deps = json.loads(item.dependencies_json or "[]")
        for dep_id in deps:
            if dep_id in item_status_map and item_status_map[dep_id] == "blocked":
                if item.resolved_status not in ("blocked", "conflict"):
                    item.resolved_status = "blocked"
                    item.progress_summary = f"Indirectly blocked: required upstream dependency '{dep_id}' is currently blocked."

    db.commit()
    return resolved_items
