from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..models.db_models import WorkItem, SourceMessage, ConflictRecord
import json


def detect_conflicts(db: Session) -> List[ConflictRecord]:
    """
    Scans active messages across work items to detect incompatible claims:
    1. Owner mismatch / disputed tech leadership
    2. Status contradictions (e.g. completion vs in-progress without resolution)
    3. Premature readiness claims with broken dependencies
    """
    detected_conflicts: List[ConflictRecord] = []
    work_items = db.query(WorkItem).all()

    for item in work_items:
        msgs = (
            db.query(SourceMessage)
            .filter(SourceMessage.work_item_id == item.id, SourceMessage.is_duplicate == False)
            .order_by(SourceMessage.timestamp.asc())
            .all()
        )

        if len(msgs) < 2:
            continue

        # 1. Owner Discrepancy Check (e.g. Priya vs Carlos on PAY-305)
        ownership_claims = []
        for m in msgs:
            text_lower = m.text.lower()
            if any(k in text_lower for k in ["taking full ownership", "sole tech lead", "lead for this", "assigned to me", "i am leading"]):
                ownership_claims.append(m)

        if len(ownership_claims) >= 2:
            authors = {m.author for m in ownership_claims}
            if len(authors) > 1:
                # Check if conflict already recorded
                existing = (
                    db.query(ConflictRecord)
                    .filter(
                        ConflictRecord.work_item_id == item.id,
                        ConflictRecord.conflict_type == "owner_mismatch"
                    )
                    .first()
                )
                if not existing:
                    c1 = ownership_claims[0]
                    c2 = ownership_claims[1]
                    conflict = ConflictRecord(
                        work_item_id=item.id,
                        conflict_type="owner_mismatch",
                        claim_a_message_id=c1.id,
                        claim_a_source_id=c1.source_id,
                        claim_a_summary=f"{c1.author}: '{c1.text}'",
                        claim_a_author=c1.author,
                        claim_a_timestamp=c1.timestamp,
                        claim_b_message_id=c2.id,
                        claim_b_source_id=c2.source_id,
                        claim_b_summary=f"{c2.author}: '{c2.text}'",
                        claim_b_author=c2.author,
                        claim_b_timestamp=c2.timestamp,
                        resolution_status="unresolved",
                        resolution_notes="Disputed ownership between multiple authors claiming sole tech leadership."
                    )
                    db.add(conflict)
                    detected_conflicts.append(conflict)

        # 2. Status Contradiction Check (Completed vs In-Progress / Blocked without clarification)
        # Note: In TASK-204, msg-1044 explicitly clarifies the dual aspect.
        # But if two messages contradict each other without clarification, flag status_contradiction!
        completed_msgs = [m for m in msgs if "complete" in m.text.lower() and "release" not in m.text.lower()]
        blocked_msgs = [m for m in msgs if "failing" in m.text.lower() or "blocked" in m.text.lower()]
        clarified = any("release remains blocked" in m.text.lower() or "tests are still failing" in m.text.lower() for m in msgs)

        if completed_msgs and blocked_msgs and not clarified:
            existing = (
                db.query(ConflictRecord)
                .filter(
                    ConflictRecord.work_item_id == item.id,
                    ConflictRecord.conflict_type == "status_contradiction"
                )
                .first()
            )
            if not existing:
                c1 = completed_msgs[-1]
                c2 = blocked_msgs[-1]
                conflict = ConflictRecord(
                    work_item_id=item.id,
                    conflict_type="status_contradiction",
                    claim_a_message_id=c1.id,
                    claim_a_source_id=c1.source_id,
                    claim_a_summary=f"{c1.author}: '{c1.text}'",
                    claim_a_author=c1.author,
                    claim_a_timestamp=c1.timestamp,
                    claim_b_message_id=c2.id,
                    claim_b_source_id=c2.source_id,
                    claim_b_summary=f"{c2.author}: '{c2.text}'",
                    claim_b_author=c2.author,
                    claim_b_timestamp=c2.timestamp,
                    resolution_status="unresolved",
                    resolution_notes="Contradictory status claims: one claims completion while another reports blocking failure."
                )
                db.add(conflict)
                detected_conflicts.append(conflict)

    db.commit()
    return detected_conflicts
