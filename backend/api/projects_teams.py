import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.base import get_db
from ..models.db_models import (
    User, Project, TeamMembership, WorkItem, SourceMessage, 
    Feedback, AuditLog, StatusHistory
)
from ..models.schemas import (
    UserProfile, ProjectSchema, ProjectCreate, InvitationRequest, 
    InvitationResponse, RespondInvitationRequest, TaskAssignRequest,
    FeedbackCreate, FeedbackItem, AuditLogItem, EmployeeContributionMetric
)
from .auth import get_current_user

router = APIRouter(prefix="/api/projects-teams", tags=["Projects, Teams & RBAC"])


def log_audit(db: Session, user: User, action: str, entity_type: str, entity_id: str, details: dict):
    audit = AuditLog(
        user_id=user.id,
        user_name=user.name or user.username,
        user_role=user.role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details_json=json.dumps(details),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()


# -------------------------------------------------------------
# User Profiles & Switching
# -------------------------------------------------------------
@router.get("/users", response_model=List[UserProfile])
def list_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        UserProfile(
            id=u.id,
            username=u.username,
            name=u.name or u.username,
            email=u.email,
            role=u.role,
            department=u.department or "Engineering"
        )
        for u in users
    ]


@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name or current_user.username,
        email=current_user.email,
        role=current_user.role,
        department=current_user.department or "Engineering"
    )


from pydantic import BaseModel

class RegisterUserPayload(BaseModel):
    name: str
    username: str
    email: str
    role: str # 'employee' | 'manager' | 'director_ceo'
    department: Optional[str] = "Engineering"


@router.post("/register", response_model=UserProfile)
def register_new_user(
    payload: RegisterUserPayload,
    db: Session = Depends(get_db)
):
    """
    Register a new user account with personalized details (Employee, Manager, or Director).
    """
    # Check if username or email already exists
    existing = db.query(User).filter(
        or_(User.username == payload.username.lower(), User.email == payload.email.lower())
    ).first()
    if existing:
        return UserProfile(
            id=existing.id,
            username=existing.username,
            name=existing.name or existing.username,
            email=existing.email,
            role=existing.role,
            department=existing.department or "Engineering"
        )

    new_user = User(
        username=payload.username.lower().replace(" ", "_"),
        name=payload.name,
        email=payload.email.lower(),
        role=payload.role,
        department=payload.department or "Engineering"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If employee, auto-link to primary project so they have workspace immediately
    if new_user.role == "employee":
        first_proj = db.query(Project).first()
        first_mgr = db.query(User).filter(User.role == "manager").first()
        if first_proj:
            membership = TeamMembership(
                user_id=new_user.id,
                project_id=first_proj.id,
                manager_id=first_mgr.id if first_mgr else 1,
                role_in_team="Core Contributor",
                status="accepted",
                created_at=datetime.now(timezone.utc)
            )
            db.add(membership)
            db.commit()

    return UserProfile(
        id=new_user.id,
        username=new_user.username,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        department=new_user.department or "Engineering"
    )



# -------------------------------------------------------------
# Projects CRUD with Multi-tenant & Role-Based Filtering
# -------------------------------------------------------------
@router.get("/projects", response_model=List[ProjectSchema])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Director/CEO: sees all projects across the entire company.
    Manager: sees projects they created or manage.
    Employee: strictly sees only projects they have accepted invitation to.
    """
    if current_user.role == "director_ceo":
        projects = db.query(Project).all()
    elif current_user.role == "manager":
        # Projects created by this manager or where they are listed as manager in memberships
        managed_project_ids = [
            m.project_id for m in db.query(TeamMembership).filter(TeamMembership.manager_id == current_user.id).all()
        ]
        projects = db.query(Project).filter(
            or_(Project.created_by_manager_id == current_user.id, Project.id.in_(managed_project_ids))
        ).all()
    else:  # employee
        accepted_memberships = db.query(TeamMembership).filter(
            TeamMembership.user_id == current_user.id,
            TeamMembership.status == "accepted"
        ).all()
        project_ids = [m.project_id for m in accepted_memberships]
        projects = db.query(Project).filter(Project.id.in_(project_ids)).all()

    results = []
    for p in projects:
        m_count = db.query(TeamMembership).filter(
            TeamMembership.project_id == p.id, 
            TeamMembership.status == "accepted"
        ).count()
        w_count = db.query(WorkItem).filter(WorkItem.project_id == p.id).count()
        results.append(ProjectSchema(
            id=p.id,
            name=p.name,
            description=p.description,
            status=p.status,
            created_by_manager_id=p.created_by_manager_id,
            member_count=m_count,
            work_item_count=w_count
        ))
    return results


@router.post("/projects", response_model=ProjectSchema)
def create_project(
    req: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Only Managers and Directors can create projects.")

    existing = db.query(Project).filter(Project.id == req.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project ID already exists.")

    proj = Project(
        id=req.id,
        name=req.name,
        description=req.description,
        status=req.status,
        created_by_manager_id=current_user.id
    )
    db.add(proj)
    db.commit()

    log_audit(db, current_user, "project_created", "project", proj.id, {"name": proj.name})

    return ProjectSchema(
        id=proj.id,
        name=proj.name,
        description=proj.description,
        status=proj.status,
        created_by_manager_id=proj.created_by_manager_id,
        member_count=0,
        work_item_count=0
    )


# -------------------------------------------------------------
# Team Invitations & Onboarding Flow
# -------------------------------------------------------------
@router.post("/invitations", response_model=InvitationResponse)
def send_invitation(
    req: InvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Only Managers and Directors can send team invitations.")

    employee = db.query(User).filter(User.id == req.user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Check if already invited
    existing = db.query(TeamMembership).filter(
        TeamMembership.user_id == req.user_id,
        TeamMembership.project_id == req.project_id
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Employee is already a member of this project.")
        existing.status = "pending"
        existing.manager_id = current_user.id
        existing.role_in_team = req.role_in_team
        existing.invited_at = datetime.now(timezone.utc)
        db.commit()
        membership = existing
    else:
        membership = TeamMembership(
            user_id=req.user_id,
            project_id=req.project_id,
            manager_id=current_user.id,
            role_in_team=req.role_in_team,
            status="pending"
        )
        db.add(membership)
        db.commit()

    log_audit(db, current_user, "invitation_sent", "team_membership", str(membership.id), {
        "employee_id": employee.id,
        "employee_name": employee.name or employee.username,
        "project_id": project.id
    })

    return InvitationResponse(
        id=membership.id,
        user_id=employee.id,
        username=employee.username,
        user_name=employee.name,
        project_id=project.id,
        project_name=project.name,
        manager_id=current_user.id,
        manager_name=current_user.name or current_user.username,
        role_in_team=membership.role_in_team,
        status=membership.status,
        invited_at=membership.invited_at.isoformat() if membership.invited_at else ""
    )


@router.get("/invitations", response_model=List[InvitationResponse])
def get_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns invitations based on role:
    Employee: pending or received invitations.
    Manager: invitations sent by this manager.
    Director: all invitations.
    """
    query = db.query(TeamMembership)
    if current_user.role == "employee":
        query = query.filter(TeamMembership.user_id == current_user.id)
    elif current_user.role == "manager":
        query = query.filter(TeamMembership.manager_id == current_user.id)

    memberships = query.order_by(TeamMembership.invited_at.desc()).all()
    results = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        proj = db.query(Project).filter(Project.id == m.project_id).first()
        mgr = db.query(User).filter(User.id == m.manager_id).first() if m.manager_id else None

        results.append(InvitationResponse(
            id=m.id,
            user_id=m.user_id,
            username=user.username if user else "Unknown",
            user_name=user.name if user else "Unknown",
            project_id=m.project_id,
            project_name=proj.name if proj else m.project_id,
            manager_id=m.manager_id,
            manager_name=mgr.name if mgr else (mgr.username if mgr else "System"),
            role_in_team=m.role_in_team,
            status=m.status,
            invited_at=m.invited_at.isoformat() if m.invited_at else ""
        ))
    return results


@router.post("/invitations/{invitation_id}/respond", response_model=InvitationResponse)
def respond_invitation(
    invitation_id: int,
    req: RespondInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(TeamMembership).filter(TeamMembership.id == invitation_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if current_user.role == "employee" and membership.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot respond to an invitation for another user.")

    if req.action not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'rejected'.")

    membership.status = req.action
    membership.responded_at = datetime.now(timezone.utc)
    db.commit()

    log_audit(db, current_user, f"invitation_{req.action}", "team_membership", str(membership.id), {
        "project_id": membership.project_id,
        "action": req.action
    })

    user = db.query(User).filter(User.id == membership.user_id).first()
    proj = db.query(Project).filter(Project.id == membership.project_id).first()
    mgr = db.query(User).filter(User.id == membership.manager_id).first() if membership.manager_id else None

    return InvitationResponse(
        id=membership.id,
        user_id=membership.user_id,
        username=user.username if user else "",
        user_name=user.name if user else "",
        project_id=membership.project_id,
        project_name=proj.name if proj else membership.project_id,
        manager_id=membership.manager_id,
        manager_name=mgr.name if mgr else "",
        role_in_team=membership.role_in_team,
        status=membership.status,
        invited_at=membership.invited_at.isoformat() if membership.invited_at else ""
    )


# -------------------------------------------------------------
# Manager Roster & Team Members
# -------------------------------------------------------------
@router.get("/roster")
def get_manager_roster(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the 10-20 assigned employees under this manager's supervision across projects.
    """
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Roster view requires manager or director role.")

    if current_user.role == "director_ceo":
        memberships = db.query(TeamMembership).filter(TeamMembership.status == "accepted").all()
    else:
        memberships = db.query(TeamMembership).filter(
            TeamMembership.manager_id == current_user.id,
            TeamMembership.status == "accepted"
        ).all()

    user_map = {}
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if not u:
            continue
        proj = db.query(Project).filter(Project.id == m.project_id).first()
        proj_name = proj.name if proj else m.project_id

        if u.id not in user_map:
            # Count assigned tasks
            task_count = db.query(WorkItem).filter(WorkItem.assigned_to_user_id == u.id).count()
            # Count recent updates
            update_count = db.query(SourceMessage).filter(SourceMessage.author_user_id == u.id).count()
            user_map[u.id] = {
                "id": u.id,
                "username": u.username,
                "name": u.name or u.username,
                "email": u.email,
                "department": u.department,
                "projects": [proj_name],
                "active_tasks_count": task_count,
                "updates_submitted": update_count
            }
        else:
            if proj_name not in user_map[u.id]["projects"]:
                user_map[u.id]["projects"].append(proj_name)

    return list(user_map.values())


# -------------------------------------------------------------
# Manager Task Assignment & Next-Day Tasks
# -------------------------------------------------------------
@router.post("/assign-task")
def assign_task(
    req: TaskAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Only Managers and Directors can assign work items.")

    assignee = db.query(User).filter(User.id == req.assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found.")

    work_item = db.query(WorkItem).filter(WorkItem.id == req.work_item_id).first()
    if not work_item:
        # Create work item if doesn't exist yet
        work_item = WorkItem(
            id=req.work_item_id,
            title=req.title or f"Task {req.work_item_id}",
            project_id=req.project_id,
            current_owner=assignee.name or assignee.username,
            assigned_to_user_id=assignee.id,
            assigned_by_user_id=current_user.id,
            priority=req.priority,
            due_date=req.due_date,
            resolved_status="not_started",
            last_updated=datetime.now(timezone.utc).isoformat(),
            dependencies_json="[]",
            progress_summary=f"Task assigned to {assignee.name or assignee.username} by {current_user.name or current_user.username}"
        )
        db.add(work_item)
    else:
        work_item.current_owner = assignee.name or assignee.username
        work_item.assigned_to_user_id = assignee.id
        work_item.assigned_by_user_id = current_user.id
        work_item.project_id = req.project_id
        if req.title:
            work_item.title = req.title
        work_item.priority = req.priority
        work_item.due_date = req.due_date
        work_item.last_updated = datetime.now(timezone.utc).isoformat()

    db.commit()

    log_audit(db, current_user, "task_assigned", "work_item", work_item.id, {
        "assignee_id": assignee.id,
        "assignee_name": assignee.name or assignee.username,
        "project_id": req.project_id,
        "priority": req.priority
    })

    return {
        "status": "success",
        "message": f"Assigned {work_item.id} to {assignee.name or assignee.username}",
        "work_item_id": work_item.id
    }


# -------------------------------------------------------------
# Manager Feedback System
# -------------------------------------------------------------
@router.post("/feedback", response_model=FeedbackItem)
def create_feedback(
    req: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Only Managers can submit feedback.")

    employee = db.query(User).filter(User.id == req.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    fb = Feedback(
        manager_id=current_user.id,
        employee_id=employee.id,
        work_item_id=req.work_item_id,
        project_id=req.project_id,
        feedback_text=req.feedback_text,
        sentiment=req.sentiment,
        rating=req.rating
    )
    db.add(fb)
    db.commit()

    log_audit(db, current_user, "feedback_created", "feedback", str(fb.id), {
        "employee_id": employee.id,
        "employee_name": employee.name or employee.username,
        "work_item_id": req.work_item_id
    })

    return FeedbackItem(
        id=fb.id,
        manager_id=current_user.id,
        manager_name=current_user.name or current_user.username,
        employee_id=employee.id,
        employee_name=employee.name or employee.username,
        work_item_id=fb.work_item_id,
        project_id=fb.project_id,
        feedback_text=fb.feedback_text,
        sentiment=fb.sentiment,
        rating=fb.rating,
        created_at=fb.created_at.isoformat() if fb.created_at else ""
    )


@router.get("/feedback", response_model=List[FeedbackItem])
def list_feedback(
    employee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Feedback)
    if current_user.role == "employee":
        query = query.filter(Feedback.employee_id == current_user.id)
    elif current_user.role == "manager":
        query = query.filter(Feedback.manager_id == current_user.id)
    elif employee_id:
        query = query.filter(Feedback.employee_id == employee_id)

    feedbacks = query.order_by(Feedback.created_at.desc()).all()
    out = []
    for f in feedbacks:
        mgr = db.query(User).filter(User.id == f.manager_id).first()
        emp = db.query(User).filter(User.id == f.employee_id).first()
        out.append(FeedbackItem(
            id=f.id,
            manager_id=f.manager_id,
            manager_name=mgr.name if mgr else "Manager",
            employee_id=f.employee_id,
            employee_name=emp.name if emp else "Employee",
            work_item_id=f.work_item_id,
            project_id=f.project_id,
            feedback_text=f.feedback_text,
            sentiment=f.sentiment,
            rating=f.rating,
            created_at=f.created_at.isoformat() if f.created_at else ""
        ))
    return out


# -------------------------------------------------------------
# Director / Manager Audit Trail
# -------------------------------------------------------------
@router.get("/audit-logs", response_model=List[AuditLogItem])
def get_audit_trail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ("manager", "director_ceo"):
        raise HTTPException(status_code=403, detail="Audit trail is only available to Managers and Directors.")

    query = db.query(AuditLog)
    if current_user.role == "manager":
        query = query.filter(AuditLog.user_id == current_user.id)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(100).all()
    results = []
    for l in logs:
        results.append(AuditLogItem(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user_name,
            user_role=l.user_role,
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            details=json.loads(l.details_json or "{}"),
            timestamp=l.timestamp.isoformat() if l.timestamp else ""
        ))
    return results


# -------------------------------------------------------------
# Global Employee Search & Contribution Deep-Dive (Director/CEO)
# -------------------------------------------------------------
@router.get("/global-search", response_model=List[EmployeeContributionMetric])
def global_employee_search(
    q: str = Query(..., min_length=1, description="Search term for employee name or username"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "director_ceo":
        raise HTTPException(status_code=403, detail="Global cross-organization employee search is restricted to Director/CEO.")

    search_filter = f"%{q.lower()}%"
    users = db.query(User).filter(
        or_(
            User.username.ilike(search_filter),
            User.name.ilike(search_filter)
        )
    ).all()

    results = []
    for u in users:
        # Projects and Teams
        memberships = db.query(TeamMembership).filter(
            TeamMembership.user_id == u.id,
            TeamMembership.status == "accepted"
        ).all()
        teams_and_projects = []
        for m in memberships:
            proj = db.query(Project).filter(Project.id == m.project_id).first()
            p_name = proj.name if proj else m.project_id
            mgr = db.query(User).filter(User.id == m.manager_id).first() if m.manager_id else None
            mgr_name = mgr.name if mgr else "No manager"
            teams_and_projects.append(f"{p_name} (Lead: {mgr_name})")

        # Work items assigned
        assigned_items = db.query(WorkItem).filter(WorkItem.assigned_to_user_id == u.id).all()
        tasks = []
        completed_count = 0
        for item in assigned_items:
            if item.resolved_status == "completed":
                completed_count += 1
            tasks.append({
                "id": item.id,
                "title": item.title,
                "project_id": item.project_id,
                "status": item.resolved_status,
                "priority": item.priority
            })

        # Messages and updates
        user_msgs = db.query(SourceMessage).filter(
            or_(SourceMessage.author_user_id == u.id, SourceMessage.author.ilike(u.username), SourceMessage.author.ilike(u.name or "~~~"))
        ).all()
        total_updates = len(user_msgs)

        # Active blockers
        blockers = db.query(BlockerRecord).filter(
            BlockerRecord.status == "active",
            BlockerRecord.owner.ilike(f"%{u.username}%")
        ).count()

        # Recent events
        recent = []
        for m in sorted(user_msgs, key=lambda x: x.timestamp or "", reverse=True)[:5]:
            recent.append({
                "source_id": m.source_id,
                "timestamp": m.timestamp,
                "text": m.text,
                "work_item_id": m.work_item_id
            })

        results.append(EmployeeContributionMetric(
            user_id=u.id,
            username=u.username,
            name=u.name or u.username,
            department=u.department or "Engineering",
            teams_and_projects=teams_and_projects,
            tasks_participating=tasks,
            total_updates_submitted=total_updates,
            completed_milestones=completed_count,
            active_blockers_assigned=blockers,
            recent_events=recent
        ))

    return results


# -------------------------------------------------------------
# AI Intelligence Agent & Copilot Triage
# -------------------------------------------------------------
@router.get("/ai-agent-triage")
def get_ai_agent_triage(
    query: Optional[str] = Query(None, description="Prompt or query for AI summary"),
    work_item_id: Optional[str] = Query(None, description="Optional target work item ID"),
    db: Session = Depends(get_db)
):
    """
    Synthesizes project progress, blocker root causes, and duplicate rationale into intelligent summaries.
    """
    from ..services.ai_agent import run_ai_agent_triage
    return run_ai_agent_triage(db, query=query, work_item_id=work_item_id)


# -------------------------------------------------------------
# Duplicate Records Management & Clearing
# -------------------------------------------------------------
@router.get("/duplicates")
def list_duplicate_records(db: Session = Depends(get_db)):
    """
    Lists all detected duplicate source messages with reasons, similarity scores, and primary links.
    """
    from ..models.db_models import DuplicateMatch
    duplicates = db.query(SourceMessage).filter(SourceMessage.is_duplicate == True).all()
    results = []
    for d in duplicates:
        primary = db.query(SourceMessage).filter(SourceMessage.id == d.duplicate_of_id).first() if d.duplicate_of_id else None
        results.append({
            "id": d.id,
            "source_id": d.source_id,
            "work_item_id": d.work_item_id,
            "author": d.author,
            "text": d.text,
            "timestamp": d.timestamp,
            "duplicate_type": d.duplicate_type,
            "duplicate_reason": d.duplicate_reason or "Identified by sequence similarity",
            "similarity_score": d.similarity_score or 1.0,
            "primary_source_id": primary.source_id if primary else "Original Upload"
        })
    return results


@router.post("/duplicates/clear")
def clear_duplicate_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Safely dismisses and clears duplicate records from active grouping.
    """
    from ..models.db_models import DuplicateMatch
    from ..services.state_resolution import resolve_work_item_states

    dup_count = db.query(SourceMessage).filter(SourceMessage.is_duplicate == True).count()
    db.query(DuplicateMatch).delete()
    db.query(SourceMessage).filter(SourceMessage.is_duplicate == True).delete()
    db.commit()

    # Re-evaluate work item states
    resolve_work_item_states(db)
    log_audit(db, current_user, "duplicates_cleared", "source_messages", "all", {"cleared_count": dup_count})

    return {
        "status": "success",
        "message": f"Successfully cleared {dup_count} duplicate records. Clean state resolution re-run."
    }

