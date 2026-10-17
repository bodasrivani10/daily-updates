import pytest
from backend.services.validation import validate_records


def test_missing_required_fields():
    records = [
        {"source_id": "", "timestamp": "2026-10-17T09:00:00Z", "author": "Alice", "text": "Valid text", "visibility": "team"},
        {"source_id": "msg-1", "timestamp": "", "author": "Alice", "text": "Valid text", "visibility": "team"},
        {"source_id": "msg-2", "timestamp": "2026-10-17T09:00:00Z", "author": "", "text": "Valid text", "visibility": "team"},
        {"source_id": "msg-3", "timestamp": "2026-10-17T09:00:00Z", "author": "Alice", "text": "", "visibility": "team"},
    ]
    res = validate_records(records)
    assert res.rejected_count == 4
    assert res.accepted_count == 0
    assert len(res.errors) == 4
    assert any(e.field == "source_id" for e in res.errors)
    assert any(e.field == "timestamp" for e in res.errors)
    assert any(e.field == "author" for e in res.errors)
    assert any(e.field == "text" for e in res.errors)


def test_valid_record_acceptance():
    records = [
        {
            "source_id": "msg-1042",
            "timestamp": "2026-10-17T09:00:00+05:30",
            "author": "Asha",
            "work_item_id": "TASK-204",
            "text": "API integration is complete.",
            "visibility": "team",
            "source_system": "slack"
        }
    ]
    res = validate_records(records)
    assert res.accepted_count == 1
    assert res.rejected_count == 0
    rec = res.accepted_records[0]
    assert rec["source_id"] == "msg-1042"
    assert rec["work_item_id"] == "TASK-204"
    assert rec["content_hash"] is not None


def test_restricted_visibility_warning():
    records = [
        {
            "source_id": "msg-999",
            "timestamp": "2026-10-17T11:45:00Z",
            "author": "Zoe",
            "work_item_id": "SEC-900",
            "text": "Restricted encryption key rotate",
            "visibility": "restricted",
            "source_system": "manual"
        }
    ]
    # As standard team member role
    res = validate_records(records, user_role="team_member")
    assert res.accepted_count == 1
    assert res.warning_count >= 1
    assert any("restricted" in w.warning.lower() for w in res.warnings)
