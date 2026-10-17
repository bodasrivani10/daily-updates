import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.db_models import WorkItem, SourceMessage, BlockerRecord
from backend.services.state_resolution import resolve_work_item_states


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_state_resolution_prevents_false_completion(test_db):
    """
    Critical requirement: When completion claim coexists with blocker claim,
    the system must NOT guess completion. TASK-204 should be resolved to blocked.
    """
    item = WorkItem(
        id="TASK-204",
        title="Core API Integration",
        current_owner="Asha",
        resolved_status="unknown",
        last_updated="2026-10-17T10:30:00+05:30",
        dependencies_json="[]"
    )
    test_db.add(item)
    test_db.flush()

    # Add message 1: completion claim
    m1 = SourceMessage(
        import_id="b1",
        source_id="msg-1042",
        source_system="slack",
        timestamp="2026-10-17T09:00:00+05:30",
        author="Asha",
        work_item_id="TASK-204",
        text="API integration is complete.",
        visibility="team",
        content_hash="hash1",
        is_duplicate=False
    )
    # Add message 2: blocker claim
    m2 = SourceMessage(
        import_id="b1",
        source_id="msg-1043",
        source_system="slack",
        timestamp="2026-10-17T10:00:00+05:30",
        author="Marcus",
        work_item_id="TASK-204",
        text="Integration tests are failing; release is blocked.",
        visibility="team",
        content_hash="hash2",
        is_duplicate=False
    )
    test_db.add_all([m1, m2])
    test_db.commit()

    resolve_work_item_states(test_db)
    test_db.refresh(item)

    assert item.resolved_status == "blocked"
    assert "blocked" in item.progress_summary.lower()


def test_dependency_blocked_propagation(test_db):
    """
    When upstream item DATA-402 is blocked, dependent item DASH-701 should reflect blocked status.
    """
    upstream = WorkItem(
        id="DATA-402",
        title="ETL Pipeline",
        current_owner="Devin",
        resolved_status="unknown",
        last_updated="2026-10-17T08:30:00+05:30",
        dependencies_json="[]"
    )
    downstream = WorkItem(
        id="DASH-701",
        title="Analytics Dashboard",
        current_owner="Devin",
        resolved_status="unknown",
        last_updated="2026-10-17T08:30:00+05:30",
        dependencies_json=json.dumps(["DATA-402"])
    )
    test_db.add_all([upstream, downstream])
    test_db.flush()

    m = SourceMessage(
        import_id="b1",
        source_id="msg-1048",
        source_system="jira",
        timestamp="2026-10-17T08:30:00+05:30",
        author="Devin",
        work_item_id="DATA-402",
        text="ETL latency increased 4x after midnight batch; downstream analytics DASH-701 data is stale.",
        visibility="team",
        content_hash="hash_etl",
        is_duplicate=False
    )
    test_db.add(m)
    test_db.commit()

    resolve_work_item_states(test_db)
    test_db.refresh(upstream)
    test_db.refresh(downstream)

    assert upstream.resolved_status == "blocked"
    assert downstream.resolved_status == "blocked"
    assert "DATA-402" in downstream.progress_summary
