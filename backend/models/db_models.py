from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    name = Column(String(150), nullable=True)
    email = Column(String(150), unique=True, nullable=True)
    role = Column(String(50), default="employee")  # employee, manager, director_ceo
    department = Column(String(100), default="Engineering")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    team_memberships = relationship("TeamMembership", back_populates="user", cascade="all, delete-orphan", foreign_keys="TeamMembership.user_id")
    feedbacks_received = relationship("Feedback", back_populates="employee", foreign_keys="Feedback.employee_id")
    feedbacks_given = relationship("Feedback", back_populates="manager", foreign_keys="Feedback.manager_id")
    assigned_work_items = relationship("WorkItem", back_populates="assignee", foreign_keys="WorkItem.assigned_to_user_id")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True)  # e.g. "PRJ-ALPHA", "PRJ-CORE"
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # upcoming, active, completed, on_hold
    created_by_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by_manager_id])
    memberships = relationship("TeamMembership", back_populates="project", cascade="all, delete-orphan")
    work_items = relationship("WorkItem", back_populates="project", cascade="all, delete-orphan")


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role_in_team = Column(String(50), default="contributor")
    status = Column(String(50), default="pending")  # pending, accepted, rejected
    invited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="team_memberships")
    project = relationship("Project", foreign_keys=[project_id], back_populates="memberships")
    manager = relationship("User", foreign_keys=[manager_id])


class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(String(50), primary_key=True)  # e.g. "TASK-204"
    title = Column(String(255), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    current_owner = Column(String(100), nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    due_date = Column(String(50), nullable=True)
    resolved_status = Column(String(50), default="unknown")  # not_started, in_progress, blocked, completed, conflict, needs_review, unknown
    last_updated = Column(String(50), nullable=False)
    dependencies_json = Column(Text, default="[]")  # e.g. '["AUTH-101"]'
    progress_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="work_items")
    assignee = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="assigned_work_items")
    assigner = relationship("User", foreign_keys=[assigned_by_user_id])
    events = relationship("WorkItemEvent", back_populates="work_item", cascade="all, delete-orphan")
    conflicts = relationship("ConflictRecord", back_populates="work_item", cascade="all, delete-orphan")
    blockers = relationship("BlockerRecord", back_populates="work_item", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="work_item", cascade="all, delete-orphan")
    messages = relationship("SourceMessage", back_populates="work_item")


class ImportBatch(Base):
    __tablename__ = "imports"

    id = Column(String(100), primary_key=True)
    filename = Column(String(255), nullable=False)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    total_rows = Column(Integer, default=0)
    accepted_rows = Column(Integer, default=0)
    rejected_rows = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    status = Column(String(50), default="completed")  # completed, failed, partial
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    errors_json = Column(Text, default="[]")  # Row-level error messages
    warnings_json = Column(Text, default="[]")  # Row-level warnings

    messages = relationship("SourceMessage", back_populates="import_batch", cascade="all, delete-orphan")
    uploader = relationship("User", foreign_keys=[uploaded_by_user_id])


class SourceMessage(Base):
    __tablename__ = "source_messages"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(String(100), ForeignKey("imports.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(100), nullable=False, index=True)
    source_system = Column(String(50), default="slack")  # slack, jira, github, manual, csv
    timestamp = Column(String(50), nullable=False, index=True)  # Normalized ISO string
    author = Column(String(100), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="SET NULL"), index=True, nullable=True)
    text = Column(Text, nullable=False)
    visibility = Column(String(50), default="team")  # public, team, restricted, admin
    content_hash = Column(String(64), index=True, nullable=False)
    
    # Deduplication metadata
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("source_messages.id"), nullable=True)
    duplicate_type = Column(String(50), default="none")  # none, exact_source_id, exact_content_hash, near_duplicate
    duplicate_reason = Column(String(255), nullable=True)
    similarity_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    import_batch = relationship("ImportBatch", back_populates="messages")
    work_item = relationship("WorkItem", back_populates="messages")
    events = relationship("WorkItemEvent", back_populates="source_message")
    author_user = relationship("User", foreign_keys=[author_user_id])


class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(String(100), ForeignKey("imports.id", ondelete="CASCADE"), nullable=False)
    primary_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=False)
    duplicate_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=False)
    match_type = Column(String(50), nullable=False)  # exact_source_id, exact_content_hash, near_duplicate
    confidence_score = Column(Float, default=1.0)
    reason = Column(String(255), nullable=False)
    resolution = Column(String(50), default="flagged_possible_duplicate")  # deduplicated, flagged_possible_duplicate, dismissed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WorkItemEvent(Base):
    __tablename__ = "work_item_events"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    source_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # progress_claim, blocker_claim, status_update, correction, assignment
    claimed_status = Column(String(50), nullable=True)
    timestamp = Column(String(50), nullable=False)
    author = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)

    work_item = relationship("WorkItem", back_populates="events")
    source_message = relationship("SourceMessage", back_populates="events")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_by_name = Column(String(100), nullable=True)
    source_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    work_item = relationship("WorkItem", back_populates="status_history")
    changer = relationship("User", foreign_keys=[changed_by_user_id])


class ConflictRecord(Base):
    __tablename__ = "conflicts"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    conflict_type = Column(String(50), nullable=False)  # status_contradiction, owner_mismatch, dependency_inconsistency, correction_dispute
    
    claim_a_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=True)
    claim_a_source_id = Column(String(100), nullable=True)
    claim_a_summary = Column(Text, nullable=False)
    claim_a_author = Column(String(100), nullable=True)
    claim_a_timestamp = Column(String(50), nullable=True)

    claim_b_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=True)
    claim_b_source_id = Column(String(100), nullable=True)
    claim_b_summary = Column(Text, nullable=False)
    claim_b_author = Column(String(100), nullable=True)
    claim_b_timestamp = Column(String(50), nullable=True)

    resolution_status = Column(String(50), default="unresolved")  # unresolved, resolved_accepted_a, resolved_accepted_b, resolved_dual_aspect
    resolution_notes = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    work_item = relationship("WorkItem", back_populates="conflicts")


class BlockerRecord(Base):
    __tablename__ = "blockers"

    id = Column(Integer, primary_key=True, index=True)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False)
    source_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=True)
    source_id = Column(String(100), nullable=True)
    
    issue_text = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    severity = Column(String(50), default="high")  # critical, high, medium, low
    owner = Column(String(100), default="Unassigned")
    next_action = Column(Text, nullable=False)
    status = Column(String(50), default="active")  # active, mitigated, resolved
    is_critical = Column(Boolean, default=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    work_item = relationship("WorkItem", back_populates="blockers")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    work_item_id = Column(String(50), ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    feedback_text = Column(Text, nullable=False)
    sentiment = Column(String(20), default="constructive")  # positive, constructive, critical
    rating = Column(Integer, nullable=True)  # 1-5
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    manager = relationship("User", foreign_keys=[manager_id], back_populates="feedbacks_given")
    employee = relationship("User", foreign_keys=[employee_id], back_populates="feedbacks_received")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(100), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)  # status_update, task_assigned, invitation_sent, conflict_resolved, update_imported
    entity_type = Column(String(50), nullable=False)  # work_item, project, team_membership, conflict, feedback
    entity_id = Column(String(100), nullable=False)
    details_json = Column(Text, default="{}")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id])


class EvidenceLink(Base):
    __tablename__ = "evidence_links"

    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String(50), nullable=False)  # work_item, conflict, blocker, digest_claim
    target_id = Column(String(100), nullable=False)
    source_message_id = Column(Integer, ForeignKey("source_messages.id"), nullable=False)
    source_id = Column(String(100), nullable=False)
    relevance_note = Column(String(255), nullable=True)


class Digest(Base):
    __tablename__ = "digests"

    id = Column(String(100), primary_key=True)
    digest_date = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    summary_headline = Column(Text, nullable=False)
    total_updates_analyzed = Column(Integer, default=0)
    confirmed_progress_count = Column(Integer, default=0)
    active_blockers_count = Column(Integer, default=0)
    unresolved_conflicts_count = Column(Integer, default=0)
    citation_coverage_pct = Column(Float, default=100.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    claims = relationship("DigestClaim", back_populates="digest", cascade="all, delete-orphan")


class DigestClaim(Base):
    __tablename__ = "digest_claims"

    id = Column(Integer, primary_key=True, index=True)
    digest_id = Column(String(100), ForeignKey("digests.id", ondelete="CASCADE"), nullable=False)
    section = Column(String(50), nullable=False)  # confirmed_progress, blockers_and_risks, next_actions, conflicts_review
    claim_text = Column(Text, nullable=False)
    work_item_id = Column(String(50), nullable=True)
    severity = Column(String(50), nullable=True)  # for blockers
    owner = Column(String(100), nullable=True)
    impact = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    supporting_source_ids_json = Column(Text, default="[]")  # list of source_id strings e.g. ["msg-1042"]
    verification_status = Column(String(50), default="verified")  # verified, flagged_unsupported, needs_review

    digest = relationship("Digest", back_populates="claims")
