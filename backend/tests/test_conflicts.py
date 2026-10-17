import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.db_models import WorkItem, SourceMessage, ConflictRecord
from backend.services.conflict_detection import detect_conflicts


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_detect_owner_conflict(test_db):
    """
    PAY-305: Priya claims ownership, then Carlos claims sole tech lead.
    Should detect owner_mismatch conflict preserving both source IDs.
    """
    item = WorkItem(
        id="PAY-305",
        title="Payment Gateway v2 Migration",
        current_owner="Priya",
        resolved_status="unknown",
        last_updated="2026-10-17T10:15:00+05:30",
        dependencies_json="[]"
    )
    test_db.add(item)
    test_db.flush()

    m1 = SourceMessage(
        import_id="b1",
        source_id="msg-1046",
        source_system="slack",
        timestamp="2026-10-17T09:45:00+05:30",
        author="Priya",
        work_item_id="PAY-305",
        text="Taking full ownership of payment gateway migration. Core endpoints scaffolded.",
        visibility="team",
        content_hash="h1",
        is_duplicate=False
    )
    m2 = SourceMessage(
        import_id="b1",
        source_id="msg-1047",
        source_system="slack",
        timestamp="2026-10-17T10:15:00+05:30",
        author="Carlos",
        work_item_id="PAY-305",
        text="Migrating payment gateway v2 as sole tech lead. Please direct all PR reviews to me.",
        visibility="team",
        content_hash="h2",
        is_duplicate=False
    )
    test_db.add_all([m1, m2])
    test_db.commit()

    conflicts = detect_conflicts(test_db)
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c.work_item_id == "PAY-305"
    assert c.conflict_type == "owner_mismatch"
    assert c.claim_a_source_id == "msg-1046"
    assert c.claim_b_source_id == "msg-1047"
    assert c.resolution_status == "unresolved"
