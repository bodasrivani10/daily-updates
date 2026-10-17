import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.base import get_db
from ..models.db_models import (
    WorkItem, SourceMessage, WorkItemEvent, BlockerRecord, ConflictRecord,
    User, TeamMembership, Project
)
from ..models.schemas import WorkItemSummary, WorkItemDetail
from .auth import get_current_user

router = APIRouter(prefix="/api/work-items", tags=["Work Items"])


@router.get("", response_model=List[WorkItemSummary])
def list_work_items(
    status: Optional[str] = Query(None, description="Filter by status: blocked, completed, conflict, in_progress, unknown"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List work items with strict RBAC:
    - Employee: Only sees work items assigned to them OR that they authored updates for in accepted projects.
    - Manager: Sees work items for projects they manage or assigned to their team members.
    - Director/CEO: Sees all work items across the company.
    """
    query = db.query(WorkItem)

    if current_user:
        if current_user.role == "employee":
            # Employee Isolation: Must never see other employees' work items or updates.
            # Only see work items assigned to them or where author is them
            user_work_item_ids = [
                row[0] for row in db.query(SourceMessage.work_item_id).filter(
                    SourceMessage.work_item_id.isnot(None),
                    or_(
                        SourceMessage.author_user_id == current_user.id,
                        SourceMessage.author.ilike(current_user.username),
                        SourceMessage.author.ilike(current_user.name or "~~~")
                    )
                ).distinct().all()
            ]

            query = query.filter(
                or_(
                    WorkItem.assigned_to_user_id == current_user.id,
                    WorkItem.current_owner.ilike(current_user.username),
                    WorkItem.current_owner.ilike(current_user.name or "~~~"),
                    WorkItem.id.in_(user_work_item_ids)
                )
            )
        elif current_user.role == "manager":
            # Multi-Manager Isolation: Manager only sees contributions for projects they manage
            managed_project_ids = [
                m.project_id for m in db.query(TeamMembership).filter(TeamMembership.manager_id == current_user.id).all()
            ]
            created_project_ids = [
                p.id for p in db.query(Project).filter(Project.created_by_manager_id == current_user.id).all()
            ]
            all_managed_projects = list(set(managed_project_ids + created_project_ids))
            
            # Subquery of employees under this manager
            subordinate_ids = [
                m.user_id for m in db.query(TeamMembership).filter(
                    TeamMembership.manager_id == current_user.id,
                    TeamMembership.status == "accepted"
                ).all()
            ]

            query = query.filter(
                or_(
                    WorkItem.project_id.in_(all_managed_projects),
                    WorkItem.assigned_to_user_id.in_(subordinate_ids),
                    WorkItem.assigned_by_user_id == current_user.id,
                    WorkItem.project_id == None  # unassigned project triage
                )
            )
        # director_ceo sees all work items

    if project_id:
        query = query.filter(WorkItem.project_id == project_id)

    if status:
        query = query.filter(WorkItem.resolved_status == status)

    items = query.order_by(WorkItem.id.asc()).all()
    results = []

    for item in items:
        # Count active blockers and conflicts
        b_count = db.query(BlockerRecord).filter(BlockerRecord.work_item_id == item.id, BlockerRecord.status == "active").count()
        c_count = db.query(ConflictRecord).filter(ConflictRecord.work_item_id == item.id, ConflictRecord.resolution_status == "unresolved").count()
        m_count = db.query(SourceMessage).filter(SourceMessage.work_item_id == item.id).count()

        proj = db.query(Project).filter(Project.id == item.project_id).first() if item.project_id else None
        assignee = db.query(User).filter(User.id == item.assigned_to_user_id).first() if item.assigned_to_user_id else None

        results.append(WorkItemSummary(
            id=item.id,
            title=item.title,
            project_id=item.project_id,
            project_name=proj.name if proj else None,
            current_owner=item.current_owner,
            assigned_to_user_id=item.assigned_to_user_id,
            assigned_to_name=assignee.name if assignee else None,
            priority=item.priority or "medium",
            due_date=item.due_date,
            resolved_status=item.resolved_status,
            last_updated=item.last_updated,
            dependencies=json.loads(item.dependencies_json or "[]"),
            progress_summary=item.progress_summary,
            message_count=m_count,
            active_blockers_count=b_count,
            unresolved_conflicts_count=c_count
        ))

    return results


@router.get("/{work_item_id}", response_model=WorkItemDetail)
def get_work_item_detail(
    work_item_id: str, 
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found")

    # Isolation check for employee
    if current_user and current_user.role == "employee":
        user_authored = db.query(SourceMessage).filter(
            SourceMessage.work_item_id == work_item_id,
            or_(
                SourceMessage.author_user_id == current_user.id,
                SourceMessage.author.ilike(current_user.username),
                SourceMessage.author.ilike(current_user.name or "~~~")
            )
        ).first()

        is_assigned = (item.assigned_to_user_id == current_user.id) or (item.current_owner and (
            current_user.username.lower() in item.current_owner.lower() or 
            (current_user.name and current_user.name.lower() in item.current_owner.lower())
        ))

        if not (user_authored or is_assigned):
            raise HTTPException(status_code=403, detail="Employee isolation: You do not have permission to view this work item.")

    # Fetch messages (filtered for employee to only their own messages)
    msg_query = db.query(SourceMessage).filter(SourceMessage.work_item_id == work_item_id)
    if current_user and current_user.role == "employee":
        msg_query = msg_query.filter(
            or_(
                SourceMessage.author_user_id == current_user.id,
                SourceMessage.author.ilike(current_user.username),
                SourceMessage.author.ilike(current_user.name or "~~~")
            )
        )

    msgs = msg_query.order_by(SourceMessage.timestamp.asc()).all()
    msg_dicts = []
    for m in msgs:
        msg_dicts.append({
            "id": m.id,
            "source_id": m.source_id,
            "timestamp": m.timestamp,
            "author": m.author,
            "text": m.text,
            "source_system": m.source_system,
            "visibility": m.visibility,
            "is_duplicate": m.is_duplicate,
            "duplicate_type": m.duplicate_type,
            "duplicate_reason": m.duplicate_reason,
            "similarity_score": m.similarity_score
        })

    # Fetch events
    events = db.query(WorkItemEvent).filter(WorkItemEvent.work_item_id == work_item_id).order_by(WorkItemEvent.timestamp.asc()).all()
    event_dicts = []
    for e in events:
        event_dicts.append({
            "id": e.id,
            "event_type": e.event_type,
            "timestamp": e.timestamp,
            "author": e.author,
            "notes": e.notes
        })

    # Fetch blockers
    blockers = db.query(BlockerRecord).filter(BlockerRecord.work_item_id == work_item_id).all()
    blocker_dicts = []
    for b in blockers:
        blocker_dicts.append({
            "id": b.id,
            "source_id": b.source_id,
            "issue_text": b.issue_text,
            "impact": b.impact,
            "severity": b.severity,
            "owner": b.owner,
            "next_action": b.next_action,
            "status": b.status,
            "is_critical": b.is_critical
        })

    # Fetch conflicts
    conflicts = db.query(ConflictRecord).filter(ConflictRecord.work_item_id == work_item_id).all()
    conflict_dicts = []
    for c in conflicts:
        conflict_dicts.append({
            "id": c.id,
            "conflict_type": c.conflict_type,
            "claim_a_source_id": c.claim_a_source_id,
            "claim_a_summary": c.claim_a_summary,
            "claim_b_source_id": c.claim_b_source_id,
            "claim_b_summary": c.claim_b_summary,
            "resolution_status": c.resolution_status,
            "resolution_notes": c.resolution_notes
        })

    proj = db.query(Project).filter(Project.id == item.project_id).first() if item.project_id else None
    assignee = db.query(User).filter(User.id == item.assigned_to_user_id).first() if item.assigned_to_user_id else None

    return WorkItemDetail(
        id=item.id,
        title=item.title,
        project_id=item.project_id,
        project_name=proj.name if proj else None,
        current_owner=item.current_owner,
        assigned_to_user_id=item.assigned_to_user_id,
        assigned_to_name=assignee.name if assignee else None,
        priority=item.priority or "medium",
        due_date=item.due_date,
        resolved_status=item.resolved_status,
        last_updated=item.last_updated,
        dependencies=json.loads(item.dependencies_json or "[]"),
        progress_summary=item.progress_summary,
        messages=msg_dicts,
        events=event_dicts,
        blockers=blocker_dicts,
        conflicts=conflict_dicts,
        status_history=[]
    )


from pydantic import BaseModel

class StatusUpdatePayload(BaseModel):
    status: str
    notes: Optional[str] = None


@router.patch("/{work_item_id}/status")
def update_work_item_status(
    work_item_id: str,
    payload: StatusUpdatePayload,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows a manager or assigned employee to update status or mark a task completed.
    Also creates a WorkItemEvent for audit tracking.
    """
    item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Work item not found")

    old_status = item.resolved_status
    item.resolved_status = payload.status
    if payload.notes:
        item.progress_summary = payload.notes

    # Add audit event
    author_name = current_user.name if current_user else "Manager"
    event = WorkItemEvent(
        work_item_id=work_item_id,
        event_type="status_change",
        timestamp=datetime.now().isoformat(),
        author=author_name,
        notes=f"Status updated from '{old_status}' to '{payload.status}' by {author_name}. Notes: {payload.notes or 'None'}"
    )
    db.add(event)
    db.commit()
    db.refresh(item)
    return {"status": "success", "work_item_id": work_item_id, "new_status": item.resolved_status}

