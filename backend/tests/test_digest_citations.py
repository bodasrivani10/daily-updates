import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.db_models import WorkItem, SourceMessage, BlockerRecord
from backend.services.digest_generator import generate_daily_digest


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_digest_citations_and_coverage(test_db):
    """
    Every factual claim in the generated digest must trace back to valid source IDs.
    """
    m1 = SourceMessage(
        import_id="b1",
        source_id="msg-1042",
        source_system="slack",
        timestamp="2026-10-17T09:00:00+05:30",
        author="Asha",
        work_item_id="TASK-204",
        text="API integration is complete.",
        visibility="team",
        content_hash="h1",
        is_duplicate=False
    )
    item = WorkItem(
        id="TASK-204",
        title="Core API Integration",
        current_owner="Asha",
        resolved_status="completed",
        last_updated="2026-10-17T09:00:00+05:30",
        dependencies_json="[]"
    )
    test_db.add_all([m1, item])
    test_db.commit()

    digest = generate_daily_digest(test_db, "2026-10-17", user_role="lead")

    assert digest is not None
    assert len(digest.claims) > 0
    assert digest.citation_coverage_pct == 100.0

    # Ensure all claims have msg-1042 cited
    for c in digest.claims:
        sources = json.loads(c.supporting_source_ids_json)
        assert len(sources) > 0
        assert "msg-1042" in sources
