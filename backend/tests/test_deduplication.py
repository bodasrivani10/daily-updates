import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.services.deduplication import process_deduplication
from backend.services.validation import validate_records


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_exact_and_near_deduplication(test_db):
    records = [
        {
            "source_id": "msg-1",
            "timestamp": "2026-10-17T11:00:00Z",
            "author": "Sam",
            "work_item_id": "INFRA-550",
            "text": "PR #82 merged; deployment pending staging verification.",
            "visibility": "team",
            "source_system": "github"
        },
        # Exact duplicate of msg-1
        {
            "source_id": "msg-1",
            "timestamp": "2026-10-17T11:00:00Z",
            "author": "Sam",
            "work_item_id": "INFRA-550",
            "text": "PR #82 merged; deployment pending staging verification.",
            "visibility": "team",
            "source_system": "github"
        },
        # Near duplicate (slack cross-post)
        {
            "source_id": "msg-2",
            "timestamp": "2026-10-17T11:05:00Z",
            "author": "Sam",
            "work_item_id": "INFRA-550",
            "text": "PR #82 merged; deployment pending staging verification. (slack cross-post)",
            "visibility": "team",
            "source_system": "slack"
        }
    ]

    val = validate_records(records)
    messages, matches = process_deduplication(test_db, "test-import-1", val.accepted_records)

    assert len(messages) == 3
    # Two of the messages should be marked as duplicate
    dup_msgs = [m for m in messages if m.is_duplicate]
    assert len(dup_msgs) == 2
    assert len(matches) == 2

    # Check match types
    types = {m.match_type for m in matches}
    assert "exact_source_id" in types
    assert "near_duplicate" in types
