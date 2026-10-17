from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class UpdateInput(BaseModel):
    source_id: str = Field(..., description="Unique source message identifier, e.g. msg-1042")
    timestamp: str = Field(..., description="Timestamp in ISO-8601 or common format")
    author: str = Field(..., description="Author name or username")
    work_item_id: Optional[str] = Field(None, description="Related task/ticket, e.g. TASK-204")
    project_id: Optional[str] = Field(None, description="Related project ID, e.g. PRJ-ALPHA")
    text: str = Field(..., min_length=1, description="Message text or update description")
    visibility: str = Field("team", description="Visibility level: public, team, restricted, admin")
    source_system: str = Field("slack", description="Source system: slack, jira, github, manual, csv")

    @field_validator("source_id")
    @classmethod
    def validate_source_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("source_id cannot be blank")
        return v

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text cannot be blank")
        return v


class ValidationErrorItem(BaseModel):
    row_number: int
    field: Optional[str] = None
    issue: str
    suggested_correction: str
    raw_record: Optional[Dict[str, Any]] = None


class ValidationWarningItem(BaseModel):
    row_number: int
    field: Optional[str] = None
    warning: str
    action_taken: str


class BatchValidationResult(BaseModel):
    total_records: int
    accepted_count: int
    rejected_count: int
    warning_count: int
    errors: List[ValidationErrorItem]
    warnings: List[ValidationWarningItem]
    accepted_records: List[Dict[str, Any]]


class ImportResponse(BaseModel):
    import_id: str
    filename: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    warning_count: int
    duplicate_count: int
    status: str
    errors: List[ValidationErrorItem]
    warnings: List[ValidationWarningItem]


class DuplicateMatchItem(BaseModel):
    id: int
    primary_message_id: int
    duplicate_message_id: int
    primary_source_id: str
    duplicate_source_id: str
    match_type: str
    confidence_score: float
    reason: str
    resolution: str
    created_at: Optional[datetime] = None


class WorkItemSummary(BaseModel):
    id: str
    title: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    current_owner: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    resolved_status: str
    last_updated: str
    dependencies: List[str] = []
    progress_summary: Optional[str] = None
    message_count: int = 0
    active_blockers_count: int = 0
    unresolved_conflicts_count: int = 0


class WorkItemDetail(BaseModel):
    id: str
    title: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    current_owner: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    resolved_status: str
    last_updated: str
    dependencies: List[str] = []
    progress_summary: Optional[str] = None
    messages: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    blockers: List[Dict[str, Any]] = []
    conflicts: List[Dict[str, Any]] = []
    status_history: List[Dict[str, Any]] = []


class ConflictItem(BaseModel):
    id: int
    work_item_id: str
    conflict_type: str
    claim_a_source_id: Optional[str] = None
    claim_a_summary: str
    claim_a_author: Optional[str] = None
    claim_a_timestamp: Optional[str] = None
    claim_b_source_id: Optional[str] = None
    claim_b_summary: str
    claim_b_author: Optional[str] = None
    claim_b_timestamp: Optional[str] = None
    resolution_status: str
    resolution_notes: Optional[str] = None


class ResolveConflictRequest(BaseModel):
    resolution: str = Field(..., description="resolved_accepted_a, resolved_accepted_b, or resolved_dual_aspect")
    resolution_notes: str = Field(..., description="Explanation of why this resolution was chosen")


class BlockerItem(BaseModel):
    id: int
    work_item_id: str
    source_id: Optional[str] = None
    issue_text: str
    impact: str
    severity: str
    owner: str
    next_action: str
    status: str
    is_critical: bool
    detected_at: Optional[datetime] = None


class DigestClaimItem(BaseModel):
    id: Optional[int] = None
    section: str
    claim_text: str
    work_item_id: Optional[str] = None
    severity: Optional[str] = None
    owner: Optional[str] = None
    impact: Optional[str] = None
    confidence: float = 1.0
    supporting_source_ids: List[str] = []
    verification_status: str = "verified"


class DigestDetail(BaseModel):
    id: str
    digest_date: str
    title: str
    summary_headline: str
    total_updates_analyzed: int
    confirmed_progress_count: int
    active_blockers_count: int
    unresolved_conflicts_count: int
    citation_coverage_pct: float
    claims: List[DigestClaimItem]


class EvaluationReport(BaseModel):
    timestamp: str
    total_test_scenarios: int
    passed_scenarios: int
    critical_fact_recall_pct: float
    citation_coverage_pct: float
    false_completion_rate_pct: float
    duplicate_handling_accuracy_pct: float
    blocker_recall_pct: float
    conflict_detection_accuracy_pct: float
    scenario_results: List[Dict[str, Any]]
    seeded_facts_status: List[Dict[str, Any]]


# Multi-Tenant & RBAC Schemas
class UserProfile(BaseModel):
    id: int
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: str  # employee, manager, director_ceo
    department: str


class ProjectSchema(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_by_manager_id: Optional[int] = None
    member_count: int = 0
    work_item_count: int = 0


class ProjectCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str = "active"


class InvitationRequest(BaseModel):
    user_id: int
    project_id: str
    role_in_team: str = "contributor"


class InvitationResponse(BaseModel):
    id: int
    user_id: int
    username: str
    user_name: Optional[str] = None
    project_id: str
    project_name: str
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    role_in_team: str
    status: str
    invited_at: str


class RespondInvitationRequest(BaseModel):
    action: str = Field(..., description="accepted or rejected")


class TaskAssignRequest(BaseModel):
    work_item_id: str
    title: Optional[str] = None
    project_id: str
    assignee_id: int
    priority: str = "medium"
    due_date: Optional[str] = None


class FeedbackCreate(BaseModel):
    employee_id: int
    work_item_id: Optional[str] = None
    project_id: Optional[str] = None
    feedback_text: str
    sentiment: str = "constructive"
    rating: Optional[int] = 5


class FeedbackItem(BaseModel):
    id: int
    manager_id: int
    manager_name: str
    employee_id: int
    employee_name: str
    work_item_id: Optional[str] = None
    project_id: Optional[str] = None
    feedback_text: str
    sentiment: str
    rating: Optional[int] = None
    created_at: str


class AuditLogItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    details: Dict[str, Any] = {}
    timestamp: str


class EmployeeContributionMetric(BaseModel):
    user_id: int
    username: str
    name: str
    department: str
    teams_and_projects: List[str]
    tasks_participating: List[Dict[str, Any]]
    total_updates_submitted: int
    completed_milestones: int
    active_blockers_assigned: int
    recent_events: List[Dict[str, Any]]
