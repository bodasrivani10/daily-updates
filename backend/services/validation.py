import re
from typing import List, Dict, Any, Tuple
from ..models.schemas import ValidationErrorItem, ValidationWarningItem, BatchValidationResult
from .ingestion import normalize_timestamp, compute_content_hash


WORK_ITEM_PATTERN = re.compile(r'^[A-Z0-9]+-[0-9]+$', re.IGNORECASE)
VALID_VISIBILITY = {"public", "team", "restricted", "admin"}
VALID_SOURCES = {"slack", "jira", "github", "manual", "csv", "email", "linear"}


def validate_records(
    records: List[Dict[str, Any]],
    user_role: str = "lead"
) -> BatchValidationResult:
    """
    Validates a batch of updates at Structural, Semantic, Security, and Consistency levels.
    Separates rejected records (blocking) from accepted records (with optional warnings).
    """
    errors: List[ValidationErrorItem] = []
    warnings: List[ValidationWarningItem] = []
    accepted: List[Dict[str, Any]] = []
    seen_source_ids: Dict[str, int] = {}

    for idx, rec in enumerate(records, start=1):
        row_has_fatal_error = False

        # 1. Structural Checks
        source_id = str(rec.get("source_id", "")).strip()
        if not source_id:
            errors.append(ValidationErrorItem(
                row_number=idx,
                field="source_id",
                issue="Missing or empty required field 'source_id'",
                suggested_correction="Assign a unique source identifier, e.g. 'msg-1001'",
                raw_record=rec
            ))
            row_has_fatal_error = True

        raw_text = str(rec.get("text", "")).strip()
        if not raw_text:
            errors.append(ValidationErrorItem(
                row_number=idx,
                field="text",
                issue="Missing or empty required field 'text'",
                suggested_correction="Provide update description text describing the work performed or blocker",
                raw_record=rec
            ))
            row_has_fatal_error = True

        author = str(rec.get("author", "")).strip()
        if not author:
            errors.append(ValidationErrorItem(
                row_number=idx,
                field="author",
                issue="Missing or empty required field 'author'",
                suggested_correction="Specify author username or display name",
                raw_record=rec
            ))
            row_has_fatal_error = True

        raw_timestamp = str(rec.get("timestamp", "")).strip()
        normalized_ts = ""
        if not raw_timestamp:
            errors.append(ValidationErrorItem(
                row_number=idx,
                field="timestamp",
                issue="Missing timestamp field",
                suggested_correction="Provide an ISO timestamp, e.g. '2026-10-17T09:00:00+05:30'",
                raw_record=rec
            ))
            row_has_fatal_error = True
        else:
            try:
                normalized_ts = normalize_timestamp(raw_timestamp)
                # Check for year sanity
                year_match = re.search(r'^(\d{4})', normalized_ts)
                if year_match:
                    year = int(year_match.group(1))
                    if year < 2020 or year > 2035:
                        warnings.append(ValidationWarningItem(
                            row_number=idx,
                            field="timestamp",
                            warning=f"Timestamp year {year} is unusual or potentially outside project range",
                            action_taken="Preserved timestamp but flagged for verification"
                        ))
            except Exception as e:
                errors.append(ValidationErrorItem(
                    row_number=idx,
                    field="timestamp",
                    issue=f"Failed to parse timestamp format: {str(e)}",
                    suggested_correction="Format timestamp in ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)",
                    raw_record=rec
                ))
                row_has_fatal_error = True

        # Stop processing this row if fatal structural errors occurred
        if row_has_fatal_error:
            continue

        # 2. Consistency Checks (Batch-level duplicate source_id check)
        if source_id in seen_source_ids:
            warnings.append(ValidationWarningItem(
                row_number=idx,
                field="source_id",
                warning=f"Duplicate source_id '{source_id}' detected within this same batch (previously in row {seen_source_ids[source_id]})",
                action_taken="Will pass to deduplication stage for exact match handling"
            ))
        else:
            seen_source_ids[source_id] = idx

        # 3. Semantic Checks
        work_item_id = str(rec.get("work_item_id", "")).strip()
        if work_item_id:
            if not WORK_ITEM_PATTERN.match(work_item_id):
                warnings.append(ValidationWarningItem(
                    row_number=idx,
                    field="work_item_id",
                    warning=f"Work item ID '{work_item_id}' does not follow standard convention (e.g. TASK-204)",
                    action_taken="Accepted but grouped under normalized work item reference"
                ))
        else:
            warnings.append(ValidationWarningItem(
                row_number=idx,
                field="work_item_id",
                warning="Work item ID is missing",
                action_taken="Will attempt heuristic classification during grouping stage"
            ))

        visibility = str(rec.get("visibility", "team")).strip().lower()
        if visibility not in VALID_VISIBILITY:
            warnings.append(ValidationWarningItem(
                row_number=idx,
                field="visibility",
                warning=f"Unknown visibility level '{visibility}'; defaulting to 'team'",
                action_taken="Normalized visibility to 'team'"
            ))
            visibility = "team"

        # 4. Security Checks
        is_restricted = False
        if visibility in ("restricted", "admin"):
            is_restricted = True
            if user_role not in ("lead", "admin", "security_team"):
                warnings.append(ValidationWarningItem(
                    row_number=idx,
                    field="visibility",
                    warning=f"Row has '{visibility}' visibility; caller role '{user_role}' has limited view permissions",
                    action_taken="Content masked in public digest views"
                ))

        source_system = str(rec.get("source_system", "slack")).strip().lower()
        if source_system not in VALID_SOURCES:
            source_system = "manual"

        # Content hash
        content_hash = compute_content_hash(raw_text)

        # Successfully accepted row
        accepted.append({
            "source_id": source_id,
            "timestamp": normalized_ts,
            "author": author,
            "work_item_id": work_item_id if work_item_id else None,
            "text": raw_text,
            "visibility": visibility,
            "source_system": source_system,
            "content_hash": content_hash,
            "is_restricted": is_restricted,
            "original_row_number": idx
        })

    return BatchValidationResult(
        total_records=len(records),
        accepted_count=len(accepted),
        rejected_count=len(errors),
        warning_count=len(warnings),
        errors=errors,
        warnings=warnings,
        accepted_records=accepted
    )
