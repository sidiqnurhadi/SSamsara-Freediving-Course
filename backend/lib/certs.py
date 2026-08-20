"""Shared certification presentation. The storage key never leaves the server."""

from typing import Any

from lib.levels import VERIFIED, rank_of
from models.schemas import Certification


def shape_cert(doc: dict[str, Any], user_name: str = "") -> Certification:
    return Certification(
        id=doc["id"],
        user_id=doc["user_id"],
        user_name=user_name or doc.get("user_name", ""),
        agency=doc["agency"],
        certification=doc["certification"],
        instructor=doc.get("instructor"),
        certification_date=doc.get("certification_date"),
        expiration_date=doc.get("expiration_date"),
        certificate_number=doc.get("certificate_number"),
        certificate_file_url=doc.get("certificate_file_url"),
        verification_url=doc.get("verification_url"),
        has_file=bool(doc.get("certificate_file_key")),
        certificate_file_name=doc.get("certificate_file_name"),
        certificate_file_size=doc.get("certificate_file_size"),
        certificate_uploaded_at=doc.get("certificate_uploaded_at"),
        certificate_uploaded_by=doc.get("certificate_uploaded_by"),
        status=doc.get("status") or VERIFIED,
        rank=rank_of(doc.get("agency"), doc.get("certification")) or 0,
        verified_at=doc.get("verified_at"),
        verified_by=doc.get("verified_by"),
    )
