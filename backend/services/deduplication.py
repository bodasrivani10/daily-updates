import difflib
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from ..models.db_models import SourceMessage, DuplicateMatch
from datetime import datetime


def compute_text_similarity(text1: str, text2: str) -> float:
    """
    Computes normalized sequence similarity between two texts (0.0 to 1.0).
    """
    clean1 = " ".join(text1.lower().strip().split())
    clean2 = " ".join(text2.lower().strip().split())
    if clean1 == clean2:
        return 1.0
    return difflib.SequenceMatcher(None, clean1, clean2).ratio()


def process_deduplication(
    db: Session,
    import_id: str,
    valid_records: List[Dict[str, Any]]
) -> Tuple[List[SourceMessage], List[DuplicateMatch]]:
    """
    Runs the 3-tier deduplication engine:
    1. Exact match (same source_system & source_id)
    2. Content match (normalized whitespace sha256 content_hash)
    3. Near-duplicate match (text similarity >= 0.80 within same work_item or author)

    Preserves original evidence and stores explicit duplicate match reasons.
    """
    created_messages: List[SourceMessage] = []
    created_matches: List[DuplicateMatch] = []

    # Cache existing messages in DB for cross-batch matching
    existing_by_source_id: Dict[str, SourceMessage] = {
        m.source_id: m for m in db.query(SourceMessage).filter(SourceMessage.is_duplicate == False).all()
    }
    existing_by_hash: Dict[str, SourceMessage] = {
        m.content_hash: m for m in db.query(SourceMessage).filter(SourceMessage.is_duplicate == False).all()
    }

    # Also keep track within current batch
    batch_by_source_id: Dict[str, SourceMessage] = {}
    batch_by_hash: Dict[str, SourceMessage] = {}

    for rec in valid_records:
        source_id = rec["source_id"]
        source_system = rec["source_system"]
        content_hash = rec["content_hash"]
        text = rec["text"]
        author = rec["author"]
        work_item_id = rec["work_item_id"]
        timestamp = rec["timestamp"]
        visibility = rec["visibility"]

        is_dup = False
        dup_type = "none"
        dup_reason = ""
        primary_msg_id: Optional[int] = None
        similarity_score = 0.0

        # Tier 1: Exact source_id match
        primary = None
        if source_id in batch_by_source_id:
            primary = batch_by_source_id[source_id]
            dup_type = "exact_source_id"
            dup_reason = f"Duplicate source ID '{source_id}' within current batch"
            similarity_score = 1.0
            is_dup = True
        elif source_id in existing_by_source_id:
            primary = existing_by_source_id[source_id]
            dup_type = "exact_source_id"
            dup_reason = f"Source ID '{source_id}' was already imported previously (msg #{primary.id})"
            similarity_score = 1.0
            is_dup = True

        # Tier 2: Exact content hash match (different source_id but identical text)
        if not is_dup:
            if content_hash in batch_by_hash:
                primary = batch_by_hash[content_hash]
                dup_type = "exact_content_hash"
                dup_reason = f"Identical normalized content hash to msg '{primary.source_id}' in batch"
                similarity_score = 1.0
                is_dup = True
            elif content_hash in existing_by_hash:
                primary = existing_by_hash[content_hash]
                dup_type = "exact_content_hash"
                dup_reason = f"Identical normalized content hash to existing msg '{primary.source_id}'"
                similarity_score = 1.0
                is_dup = True

        # Tier 3: Near-duplicate match (fuzzy similarity >= 0.80)
        if not is_dup:
            # Check candidates within same work_item or author
            candidates = list(batch_by_source_id.values()) + list(existing_by_source_id.values())
            for cand in candidates:
                # If they share work_item_id or author or text has high overlap
                if cand.work_item_id == work_item_id or cand.author == author or "merge" in text.lower():
                    sim = compute_text_similarity(text, cand.text)
                    if sim >= 0.80 and sim < 1.0:
                        primary = cand
                        dup_type = "near_duplicate"
                        dup_reason = f"Near-duplicate match ({sim * 100:.1f}% similarity) with msg '{cand.source_id}'"
                        similarity_score = sim
                        is_dup = True
                        break

        # Persist SourceMessage (retains full evidence even if duplicate)
        msg_obj = SourceMessage(
            import_id=import_id,
            source_id=source_id,
            source_system=source_system,
            timestamp=timestamp,
            author=author,
            work_item_id=work_item_id,
            text=text,
            visibility=visibility,
            content_hash=content_hash,
            is_duplicate=is_dup,
            duplicate_of_id=primary.id if (is_dup and primary and primary.id) else None,
            duplicate_type=dup_type,
            duplicate_reason=dup_reason if is_dup else None,
            similarity_score=similarity_score if is_dup else None
        )
        db.add(msg_obj)
        db.flush()  # assign ID

        # If duplicate, record match relationship
        if is_dup and primary:
            # If primary was just created in this batch and didn't have ID earlier
            if not msg_obj.duplicate_of_id and primary.id:
                msg_obj.duplicate_of_id = primary.id
                db.flush()

            dup_match = DuplicateMatch(
                import_id=import_id,
                primary_message_id=primary.id if primary.id else msg_obj.id,
                duplicate_message_id=msg_obj.id,
                match_type=dup_type,
                confidence_score=similarity_score,
                reason=dup_reason,
                resolution="deduplicated" if dup_type in ("exact_source_id", "exact_content_hash") else "flagged_possible_duplicate"
            )
            db.add(dup_match)
            created_matches.append(dup_match)
        else:
            # Register as valid active message for subsequent rows
            batch_by_source_id[source_id] = msg_obj
            batch_by_hash[content_hash] = msg_obj

        created_messages.append(msg_obj)

    db.commit()
    return created_messages, created_matches
