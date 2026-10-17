import json
import uuid
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.db_models import ImportBatch, SourceMessage
from ..models.schemas import ImportResponse, UpdateInput
from ..services.ingestion import parse_csv_content, parse_json_content
from ..services.validation import validate_records
from ..services.deduplication import process_deduplication
from ..services.grouping import group_updates_by_work_item
from ..services.state_resolution import resolve_work_item_states
from ..services.conflict_detection import detect_conflicts
from ..services.blocker_detection import detect_blockers

router = APIRouter(prefix="/api/imports", tags=["Imports"])


@router.post("", response_model=ImportResponse)
async def upload_import(
    file: Optional[UploadFile] = File(None),
    raw_json: Optional[str] = Form(None),
    user_role: str = Form("lead"),
    db: Session = Depends(get_db)
):
    """
    Uploads CSV or JSON updates. Executes:
    Stage 1: Ingestion
    Stage 2: Validation (Row-level errors and warnings)
    Stage 3: Deduplication
    Stage 4: Grouping
    Stage 5: State Resolution
    Stage 6: Conflict & Blocker Detection
    """
    records = []
    filename = "manual_entry.json"

    if file:
        filename = file.filename or "upload"
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="replace")
        if filename.endswith(".csv"):
            records = parse_csv_content(content_str)
        else:
            records = parse_json_content(content_str)
    elif raw_json:
        records = parse_json_content(raw_json)
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file upload or raw_json payload")

    import_id = str(uuid.uuid4())[:8]

    # Stage 2: Validation
    val_res = validate_records(records, user_role=user_role)

    # Persist batch record
    errors_serialized = [e.model_dump() for e in val_res.errors]
    warnings_serialized = [w.model_dump() for w in val_res.warnings]

    batch = ImportBatch(
        id=import_id,
        filename=filename,
        total_rows=val_res.total_records,
        accepted_rows=val_res.accepted_count,
        rejected_rows=val_res.rejected_count,
        warning_count=val_res.warning_count,
        duplicate_count=0,
        status="completed" if val_res.accepted_count > 0 else "failed",
        errors_json=json.dumps(errors_serialized),
        warnings_json=json.dumps(warnings_serialized)
    )
    db.add(batch)
    db.commit()

    if val_res.accepted_count > 0:
        # Stage 3: Deduplication
        created_msgs, dup_matches = process_deduplication(db, import_id, val_res.accepted_records)
        batch.duplicate_count = len(dup_matches)
        db.commit()

        # Stage 4: Grouping
        group_updates_by_work_item(db, created_msgs)

        # Stage 5: State Resolution
        resolve_work_item_states(db)

        # Stage 6: Conflict & Blocker Detection
        detect_conflicts(db)
        detect_blockers(db)

        # Re-run state resolution to account for newly detected conflicts/blockers
        resolve_work_item_states(db)

    return ImportResponse(
        import_id=import_id,
        filename=filename,
        total_rows=val_res.total_records,
        accepted_rows=val_res.accepted_count,
        rejected_rows=val_res.rejected_count,
        warning_count=val_res.warning_count,
        duplicate_count=batch.duplicate_count,
        status=batch.status,
        errors=val_res.errors,
        warnings=val_res.warnings
    )


@router.post("/load-starter")
def load_starter_fixtures(db: Session = Depends(get_db)):
    """
    One-click loads the starter fixture dataset containing the 5 seeded critical facts.
    """
    fixture_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "starter_fixtures.json")
    if not os.path.exists(fixture_path):
        raise HTTPException(status_code=404, detail="Starter fixture file not found")

    with open(fixture_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    import_id = f"starter-{str(uuid.uuid4())[:6]}"
    val_res = validate_records(records, user_role="lead")

    batch = ImportBatch(
        id=import_id,
        filename="starter_fixtures.json",
        total_rows=val_res.total_records,
        accepted_rows=val_res.accepted_count,
        rejected_rows=val_res.rejected_count,
        warning_count=val_res.warning_count,
        duplicate_count=0,
        status="completed",
        errors_json=json.dumps([e.model_dump() for e in val_res.errors]),
        warnings_json=json.dumps([w.model_dump() for w in val_res.warnings])
    )
    db.add(batch)
    db.commit()

    created_msgs, dup_matches = process_deduplication(db, import_id, val_res.accepted_records)
    batch.duplicate_count = len(dup_matches)
    db.commit()

    group_updates_by_work_item(db, created_msgs)
    detect_conflicts(db)
    detect_blockers(db)
    resolve_work_item_states(db)

    return {
        "status": "success",
        "import_id": import_id,
        "message": f"Successfully loaded starter fixture with {val_res.accepted_count} updates and seeded facts.",
        "duplicates_identified": len(dup_matches)
    }


@router.get("")
def list_imports(db: Session = Depends(get_db)):
    """
    Returns list of all import batches with processing metadata.
    """
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()
    out = []
    for b in batches:
        out.append({
            "id": b.id,
            "filename": b.filename,
            "total_rows": b.total_rows,
            "accepted_rows": b.accepted_rows,
            "rejected_rows": b.rejected_rows,
            "warning_count": b.warning_count,
            "duplicate_count": b.duplicate_count,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else ""
        })
    return out


@router.get("/{import_id}")
def get_import_details(import_id: str, db: Session = Depends(get_db)):
    """
    Returns full details for a batch including row errors and warnings.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.id == import_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    return {
        "id": batch.id,
        "filename": batch.filename,
        "total_rows": batch.total_rows,
        "accepted_rows": batch.accepted_rows,
        "rejected_rows": batch.rejected_rows,
        "warning_count": batch.warning_count,
        "duplicate_count": batch.duplicate_count,
        "status": batch.status,
        "created_at": batch.created_at.isoformat() if batch.created_at else "",
        "errors": json.loads(batch.errors_json or "[]"),
        "warnings": json.loads(batch.warnings_json or "[]")
    }
