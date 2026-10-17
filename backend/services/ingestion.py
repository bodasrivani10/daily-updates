import csv
import io
import json
import hashlib
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
import uuid


def normalize_timestamp(raw_ts: str) -> str:
    """
    Normalizes arbitrary timestamp formats into standard ISO 8601 with timezone.
    e.g. '2026-10-17T09:30:00+05:30', '2026-10-17 09:30:00', '10/17/2026 09:30'
    """
    if not raw_ts:
        return datetime.now(timezone.utc).isoformat()
    
    clean_ts = raw_ts.strip()
    
    # Check if already ISO format with timezone
    iso_tz_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$'
    if re.match(iso_tz_pattern, clean_ts):
        return clean_ts

    # Common formats to try
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(clean_ts, fmt)
            # Default to UTC if not specified
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue

    # Fallback: if it starts with YYYY-MM-DD
    match = re.match(r'^(\d{4}-\d{2}-\d{2})', clean_ts)
    if match:
        return f"{match.group(1)}T00:00:00+00:00"

    return clean_ts


def compute_content_hash(text: str) -> str:
    """
    Generates a deterministic hash after normalizing whitespace and lowercase.
    """
    normalized = " ".join(text.lower().strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def parse_csv_content(content_str: str) -> List[Dict[str, Any]]:
    """
    Parses CSV text into a list of row dicts.
    """
    f = io.StringIO(content_str.strip())
    reader = csv.DictReader(f)
    records = []
    for row in reader:
        # Strip all whitespace from keys and values
        clean_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        records.append(clean_row)
    return records


def parse_json_content(content_str: str) -> List[Dict[str, Any]]:
    """
    Parses JSON text into a list of row dicts.
    """
    data = json.loads(content_str)
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        if "updates" in data and isinstance(data["updates"], list):
            return data["updates"]
        return [data]
    else:
        raise ValueError("Invalid JSON format: expected list or object with 'updates'")
