from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.db_models import ConflictRecord, WorkItem
from ..models.schemas import ConflictItem, ResolveConflictRequest
from ..services.state_resolution import resolve_work_item_states

router = APIRouter(prefix="/api/conflicts", tags=["Conflicts"])


@router.get("", response_model=List[ConflictItem])
def list_conflicts(
    status: Optional[str] = Query(None, description="unresolved or resolved"),
    db: Session = Depends(get_db)
):
    query = db.query(ConflictRecord)
    if status:
        query = query.filter(ConflictRecord.resolution_status.startswith(status))
    conflicts = query.order_by(ConflictRecord.id.desc()).all()

    return [
        ConflictItem(
            id=c.id,
            work_item_id=c.work_item_id,
            conflict_type=c.conflict_type,
            claim_a_source_id=c.claim_a_source_id,
            claim_a_summary=c.claim_a_summary,
            claim_a_author=c.claim_a_author,
            claim_a_timestamp=c.claim_a_timestamp,
            claim_b_source_id=c.claim_b_source_id,
            claim_b_summary=c.claim_b_summary,
            claim_b_author=c.claim_b_author,
            claim_b_timestamp=c.claim_b_timestamp,
            resolution_status=c.resolution_status,
            resolution_notes=c.resolution_notes
        )
        for c in conflicts
    ]


@router.post("/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: int,
    req: ResolveConflictRequest,
    db: Session = Depends(get_db)
):
    conflict = db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    conflict.resolution_status = req.resolution
    conflict.resolution_notes = req.resolution_notes
    db.commit()

    # If owner conflict was resolved by choosing Claim A or B, update current owner of work item
    item = db.query(WorkItem).filter(WorkItem.id == conflict.work_item_id).first()
    if item and conflict.conflict_type == "owner_mismatch":
        if req.resolution == "resolved_accepted_a" and conflict.claim_a_author:
            item.current_owner = conflict.claim_a_author
        elif req.resolution == "resolved_accepted_b" and conflict.claim_b_author:
            item.current_owner = conflict.claim_b_author
        db.commit()

    # Re-run state resolution
    resolve_work_item_states(db)

    return {
        "status": "success",
        "conflict_id": conflict_id,
        "new_resolution_status": conflict.resolution_status,
        "message": f"Conflict resolved as '{conflict.resolution_status}'"
    }
