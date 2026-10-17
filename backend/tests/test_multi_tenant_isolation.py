import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.db_models import User, Project, TeamMembership, WorkItem, SourceMessage
from backend.services.seed_data import seed_initial_users_and_projects
from backend.api.work_items import list_work_items, get_work_item_detail
from fastapi import HTTPException


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    seed_initial_users_and_projects(session)
    yield session
    session.close()


def test_seed_data_presence(db_session):
    users = db_session.query(User).all()
    projects = db_session.query(Project).all()
    memberships = db_session.query(TeamMembership).all()

    assert len(users) >= 15
    assert len(projects) >= 4
    assert len(memberships) >= 14

    # Verify roles
    ceo = db_session.query(User).filter(User.role == "director_ceo").first()
    assert ceo is not None
    assert ceo.name == "Elena Vance"

    managers = db_session.query(User).filter(User.role == "manager").all()
    assert len(managers) == 2


def test_employee_isolation(db_session):
    # Create work item for Asha (User 4)
    item_asha = WorkItem(
        id="TASK-ASHA-1",
        title="Asha Private Microservice",
        assigned_to_user_id=4,
        current_owner="Asha",
        resolved_status="in_progress",
        last_updated="2026-10-18T00:00:00Z"
    )
    # Create work item for Carlos (User 5)
    item_carlos = WorkItem(
        id="TASK-CARLOS-1",
        title="Carlos Backend Service",
        assigned_to_user_id=5,
        current_owner="carlos_dev",
        resolved_status="in_progress",
        last_updated="2026-10-18T00:00:00Z"
    )
    db_session.add_all([item_asha, item_carlos])
    db_session.commit()

    asha_user = db_session.query(User).filter(User.id == 4).first()
    carlos_user = db_session.query(User).filter(User.id == 5).first()

    # Query items as Asha
    asha_items = list_work_items(None, None, asha_user, db_session)
    asha_item_ids = [it.id for it in asha_items]
    assert "TASK-ASHA-1" in asha_item_ids
    assert "TASK-CARLOS-1" not in asha_item_ids  # Asha CANNOT see Carlos's work

    # Direct detail access check: Asha trying to access Carlos's work item directly
    with pytest.raises(HTTPException) as exc:
        get_work_item_detail("TASK-CARLOS-1", asha_user, db_session)
    assert exc.value.status_code == 403
    assert "Employee isolation" in exc.value.detail


def test_manager_and_director_visibility(db_session):
    marcus_mgr = db_session.query(User).filter(User.id == 2).first()
    ceo = db_session.query(User).filter(User.id == 1).first()

    # Add work item in PRJ-ALPHA
    item_alpha = WorkItem(
        id="TASK-ALPHA-99",
        title="Team Alpha Core Pipeline",
        project_id="PRJ-ALPHA",
        assigned_to_user_id=4,
        current_owner="Asha",
        resolved_status="in_progress",
        last_updated="2026-10-18T00:00:00Z"
    )
    # Add work item in PRJ-PAY (Team Priya)
    item_pay = WorkItem(
        id="TASK-PAY-99",
        title="Team Beta Payment Engine",
        project_id="PRJ-PAY",
        assigned_to_user_id=12,
        current_owner="chloe_dev",
        resolved_status="in_progress",
        last_updated="2026-10-18T00:00:00Z"
    )
    db_session.add_all([item_alpha, item_pay])
    db_session.commit()

    # Marcus (Manager of Team Alpha) should see PRJ-ALPHA item
    marcus_items = list_work_items(None, None, marcus_mgr, db_session)
    marcus_ids = [it.id for it in marcus_items]
    assert "TASK-ALPHA-99" in marcus_ids

    # CEO should see all items across the company
    ceo_items = list_work_items(None, None, ceo, db_session)
    ceo_ids = [it.id for it in ceo_items]
    assert "TASK-ALPHA-99" in ceo_ids
    assert "TASK-PAY-99" in ceo_ids
