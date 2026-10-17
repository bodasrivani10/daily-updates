import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from ..models.base import get_db
from ..models.db_models import Digest, DigestClaim, SourceMessage, WorkItem
from ..models.schemas import DigestDetail, DigestClaimItem
from ..services.digest_generator import generate_daily_digest

router = APIRouter(prefix="/api/digests", tags=["Digests"])


@router.post("/generate", response_model=DigestDetail)
def create_digest(
    date: str = Query("2026-10-17", description="Reporting date YYYY-MM-DD"),
    user_role: str = Query("lead", description="Caller role for visibility checks"),
    db: Session = Depends(get_db)
):
    digest = generate_daily_digest(db, digest_date=date, user_role=user_role)
    return get_digest(digest.id, db)


@router.get("", response_model=List[dict])
def list_digests(db: Session = Depends(get_db)):
    digests = db.query(Digest).order_by(Digest.created_at.desc()).all()
    out = []
    for d in digests:
        out.append({
            "id": d.id,
            "digest_date": d.digest_date,
            "title": d.title,
            "summary_headline": d.summary_headline,
            "total_updates_analyzed": d.total_updates_analyzed,
            "confirmed_progress_count": d.confirmed_progress_count,
            "active_blockers_count": d.active_blockers_count,
            "unresolved_conflicts_count": d.unresolved_conflicts_count,
            "citation_coverage_pct": d.citation_coverage_pct,
            "created_at": d.created_at.isoformat() if d.created_at else ""
        })
    return out


@router.get("/{digest_id}", response_model=DigestDetail)
def get_digest(digest_id: str, db: Session = Depends(get_db)):
    digest = db.query(Digest).filter(Digest.id == digest_id).first()
    if not digest:
        raise HTTPException(status_code=404, detail="Digest not found")

    claim_items = []
    for c in digest.claims:
        sources = json.loads(c.supporting_source_ids_json or "[]")
        claim_items.append(DigestClaimItem(
            id=c.id,
            section=c.section,
            claim_text=c.claim_text,
            work_item_id=c.work_item_id,
            severity=c.severity,
            owner=c.owner,
            impact=c.impact,
            confidence=c.confidence,
            supporting_source_ids=sources,
            verification_status=c.verification_status
        ))

    return DigestDetail(
        id=digest.id,
        digest_date=digest.digest_date,
        title=digest.title,
        summary_headline=digest.summary_headline,
        total_updates_analyzed=digest.total_updates_analyzed,
        confirmed_progress_count=digest.confirmed_progress_count,
        active_blockers_count=digest.active_blockers_count,
        unresolved_conflicts_count=digest.unresolved_conflicts_count,
        citation_coverage_pct=digest.citation_coverage_pct,
        claims=claim_items
    )


@router.get("/{digest_id}/export")
def export_digest(
    digest_id: str,
    format: str = Query("markdown", description="markdown, json, or text"),
    db: Session = Depends(get_db)
):
    detail = get_digest(digest_id, db)
    
    if format == "json":
        return detail.model_dump()

    # Markdown export
    lines = [
        f"# {detail.title}",
        f"**Date:** {detail.digest_date} | **Coverage:** {detail.citation_coverage_pct}% evidence cited",
        "",
        f"> {detail.summary_headline}",
        "",
        "## 1. Confirmed Progress",
    ]

    for c in detail.claims:
        if c.section == "confirmed_progress":
            citations = " ".join([f"[[{sid}]]" for sid in c.supporting_source_ids])
            lines.append(f"- **{c.work_item_id or 'General'}**: {c.claim_text} {citations}")

    lines.extend(["", "## 2. Blockers & Risks"])
    for c in detail.claims:
        if c.section == "blockers_and_risks":
            citations = " ".join([f"[[{sid}]]" for sid in c.supporting_source_ids])
            lines.append(f"- 🔴 **[{c.severity.upper() if c.severity else 'RISK'}] {c.work_item_id}**: {c.claim_text} {citations}")
            if c.impact:
                lines.append(f"  *Impact:* {c.impact}")
            if c.owner:
                lines.append(f"  *Owner:* {c.owner}")

    lines.extend(["", "## 3. Next Actions"])
    for c in detail.claims:
        if c.section == "next_actions":
            citations = " ".join([f"[[{sid}]]" for sid in c.supporting_source_ids])
            owner_tag = f"({c.owner})" if c.owner else ""
            lines.append(f"- [ ] **{c.work_item_id or 'General'}** {owner_tag}: {c.claim_text} {citations}")

    lines.extend(["", "## 4. Conflicts & Items Needing Review"])
    for c in detail.claims:
        if c.section == "conflicts_review":
            citations = " ".join([f"[[{sid}]]" for sid in c.supporting_source_ids])
            lines.append(f"- ⚠️ **{c.work_item_id}**: {c.claim_text} {citations}")

    content = "\n".join(lines)
    return Response(content=content, media_type="text/markdown")


@router.get("/citation/{source_id}")
def get_citation_evidence(source_id: str, db: Session = Depends(get_db)):
    """
    Lookup original evidence for a citation pill [msg-1042].
    Returns exact raw text, author, timestamp, work item, and duplicate status.
    """
    msg = db.query(SourceMessage).filter(SourceMessage.source_id == source_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail=f"Source evidence for ID '{source_id}' not found")

    work_item = None
    if msg.work_item_id:
        item = db.query(WorkItem).filter(WorkItem.id == msg.work_item_id).first()
        if item:
            work_item = {"id": item.id, "title": item.title, "resolved_status": item.resolved_status}

    return {
        "source_id": msg.source_id,
        "author": msg.author,
        "timestamp": msg.timestamp,
        "work_item_id": msg.work_item_id,
        "work_item": work_item,
        "source_system": msg.source_system,
        "text": msg.text,
        "visibility": msg.visibility,
        "is_duplicate": msg.is_duplicate,
        "duplicate_type": msg.duplicate_type,
        "duplicate_reason": msg.duplicate_reason,
        "created_at": msg.created_at.isoformat() if msg.created_at else ""
    }
