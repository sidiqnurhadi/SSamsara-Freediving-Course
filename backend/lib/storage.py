"""Certificate PDF storage.

PDFs hold personal data, so files are written under a private directory with an opaque
uuid name and are only ever served through an authenticated endpoint — there is no
public/predictable URL and the directory is not mounted as static files.
"""

import os
import uuid
from pathlib import Path
from typing import Optional

CERT_DIR = Path(os.environ.get("CERT_UPLOAD_DIR", Path(__file__).parent.parent / "uploads" / "certificates"))
MAX_BYTES = 10 * 1024 * 1024  # 10 MB
PDF_MAGIC = b"%PDF-"


def ensure_dir() -> Path:
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    return CERT_DIR


def validate_pdf(filename: str, content: bytes) -> Optional[str]:
    """-> error message, or None when the upload is an acceptable PDF."""
    if not filename.lower().endswith(".pdf"):
        return "Only PDF files are accepted."
    if not content:
        return "The uploaded file is empty."
    if len(content) > MAX_BYTES:
        return "The certificate PDF must be 10 MB or smaller."
    if not content.startswith(PDF_MAGIC):
        return "That file is not a valid PDF."
    return None


def save_pdf(content: bytes) -> str:
    """Writes the file under an opaque name and returns the stored key."""
    ensure_dir()
    key = f"{uuid.uuid4().hex}.pdf"
    (CERT_DIR / key).write_bytes(content)
    return key


def path_for(key: str) -> Optional[Path]:
    # guard against traversal: only a bare generated key is ever accepted
    if not key or "/" in key or "\\" in key or ".." in key:
        return None
    target = CERT_DIR / key
    return target if target.is_file() else None


def delete_pdf(key: Optional[str]) -> None:
    if not key:
        return
    target = path_for(key)
    if target:
        target.unlink(missing_ok=True)
