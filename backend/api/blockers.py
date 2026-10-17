from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.db_models import BlockerRecord
from ..models.schemas import BlockerItem
from ..services.state_resolution import resolve_work_item_states

router = APIRouter(prefix="/api/blockers", tags=["Blockers"])


@router.get("", response_model=List[BlockerItem])
def list_blockers(
    severity: Optional[str] = Query(None, description="critical, high, medium, low"),
    status: Optional[str] = Query(None, description="active, mitigated, resolved"),
    db: Session = Depends(get_db)
):
    query = db.query(BlockerRecord)
    if severity:
        query = query.filter(BlockerRecord.severity == severity)
    if status:
        query = query.filter(BlockerRecord.status == status)

    blockers = query.order_by(BlockerRecord.is_critical.desc(), BlockerRecord.id.desc()).all()

    return [
        BlockerItem(
            id=b.id,
            work_item_id=b.work_item_id,
            source_id=b.source_id,
            issue_text=b.issue_text,
            impact=b.impact,
            severity=b.severity,
            owner=b.owner,
            next_action=b.next_action,
            status=b.status,
            is_critical=b.is_critical,
            detected_at=b.detected_at
        )
        for b in blockers
    ]


@router.post("/{blocker_id}/status")
def update_blocker_status(
    blocker_id: int,
    status: str = Query(..., description="active, mitigated, resolved"),
    db: Session = Depends(get_db)
):
    blocker = db.query(BlockerRecord).filter(BlockerRecord.id == blocker_id).first()
    if not blocker:
        raise HTTPException(status_code=404, detail="Blocker not found")

    blocker.status = status
    db.commit()

    # Re-evaluate work item states
    resolve_work_item_states(db)

    return {"status": "success", "blocker_id": blocker_id, "new_status": blocker.status}


@router.post("/clear-all")
def clear_all_blockers(db: Session = Depends(get_db)):
    """
    Resolves/clears all active blockers across work items and re-evaluates state.
    """
    active_count = db.query(BlockerRecord).filter(BlockerRecord.status == "active").count()
    db.query(BlockerRecord).filter(BlockerRecord.status == "active").update({"status": "resolved"})
    db.commit()

    # Re-evaluate work item states
    resolve_work_item_states(db)

    return {
        "status": "success",
        "message": f"Successfully resolved {active_count} active blockers across all work items.",
        "resolved_count": active_count
    }
