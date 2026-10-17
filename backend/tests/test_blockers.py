import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.db_models import WorkItem, SourceMessage, BlockerRecord
from backend.services.blocker_detection import detect_blockers


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_blocker_detection_rules(test_db):
    """
    Verifies detection of critical test failures and SecOps approval blockers.
    """
    m1 = SourceMessage(
        import_id="b1",
        source_id="msg-1043",
        source_system="slack",
        timestamp="2026-10-17T10:00:00+05:30",
        author="Marcus",
        work_item_id="TASK-204",
        text="Integration tests are failing; release is blocked.",
        visibility="team",
        content_hash="h1",
        is_duplicate=False
    )
    m2 = SourceMessage(
        import_id="b1",
        source_id="msg-1045",
        source_system="github",
        timestamp="2026-10-17T09:15:00+05:30",
        author="Elena",
        work_item_id="AUTH-101",
        text="OAuth2 scope expansion submitted; waiting for SecOps security review approval before merge.",
        visibility="team",
        content_hash="h2",
        is_duplicate=False
    )
    test_db.add_all([m1, m2])
    test_db.commit()

    blockers = detect_blockers(test_db)
    assert len(blockers) == 2

    # Check TASK-204 blocker
    b_t204 = next(b for b in blockers if b.work_item_id == "TASK-204")
    assert b_t204.severity == "critical"
    assert b_t204.is_critical is True
    assert "failing" in b_t204.issue_text.lower()
    assert b_t204.source_id == "msg-1043"

    # Check AUTH-101 blocker
    b_auth = next(b for b in blockers if b.work_item_id == "AUTH-101")
    assert "secops" in b_auth.issue_text.lower()
    assert b_auth.source_id == "msg-1045"
