from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import date
from typing import Literal, Union

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.document_agent import DocumentAgent, ExtractionResult
from auth import verify_clerk_token
from db.client import get_pool
from db.health_memory import merge_health_memory
from db.users import ensure_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["documents"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_MIMETYPES = frozenset({"application/pdf", "image/jpeg", "image/png"})

DocumentType = Literal["blood_test", "prescription", "imaging_report", "other"]

_agent = DocumentAgent()


# ── Response models ───────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    upload_id: str
    status: str
    document_meta: dict
    numeric_values: list[dict]
    findings: list[dict]
    conclusions: list[str]
    conditions_mentioned: list[str]
    processing_note: str | None


class DuplicateDetectedResponse(BaseModel):
    duplicate_detected: bool
    existing_upload: dict


class DocumentSummary(BaseModel):
    upload_id: str
    profile_id: str | None
    profile_display_name: str | None
    original_filename: str
    document_type: str
    document_subtype: str | None
    uploaded_at: str
    recorded_date: str | None
    extraction_status: str
    values_extracted: int
    findings_extracted: int
    hospital_or_lab: str | None
    reporting_doctor: str | None
    patient_name: str | None


class DocumentListResponse(BaseModel):
    uploads: list[DocumentSummary]
    total: int


class NumericValue(BaseModel):
    name: str
    value: str
    unit: str | None
    reference_range: str | None
    is_abnormal: bool | None


class DocumentFinding(BaseModel):
    section: str | None
    finding: str
    is_abnormal: bool | None


class DocumentDetailResponse(BaseModel):
    upload_id: str
    profile_id: str | None
    profile_display_name: str | None
    original_filename: str
    document_type: str
    document_subtype: str | None
    uploaded_at: str
    recorded_date: str | None
    extraction_status: str
    hospital_or_lab: str | None
    reporting_doctor: str | None
    referring_doctor: str | None
    patient_name: str | None
    processing_note: str | None
    numeric_values: list[NumericValue]
    findings: list[DocumentFinding]
    conclusions: list[str]


class DeleteResponse(BaseModel):
    deleted: bool
    upload_id: str
    note: str


# ── POST /documents/upload ────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    force_reupload: bool = Form(False),
    profile_id: str | None = Form(None),
    clerk_user_id: str = Depends(verify_clerk_token),
) -> Union[DuplicateDetectedResponse, UploadResponse]:
    if not file.content_type or file.content_type not in _ALLOWED_MIMETYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type. Accepted: PDF, JPEG, PNG")

    file_bytes = await file.read()

    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    content_hash = hashlib.sha256(file_bytes).hexdigest()

    pool = await get_pool()
    db_profile_id = _parse_optional_uuid(profile_id)
    db_user_id = None

    if pool is not None:
        async with pool.acquire() as conn:
            db_user_id = await ensure_user(conn, clerk_user_id)
            if db_profile_id is not None:
                await _assert_profile_owner(conn, db_profile_id, db_user_id)
            if force_reupload:
                existing = None
            else:
                existing = await conn.fetchrow(
                    """
                    SELECT id, original_filename, uploaded_at, extraction_status
                    FROM document_upload_logs
                    WHERE user_id = $1 AND content_hash = $2 AND is_deleted = FALSE
                    LIMIT 1
                    """,
                    db_user_id,
                    content_hash,
                )
        if existing:
            return DuplicateDetectedResponse(
                duplicate_detected=True,
                existing_upload={
                    "upload_id": str(existing["id"]),
                    "original_filename": existing["original_filename"],
                    "uploaded_at": existing["uploaded_at"].isoformat(),
                    "extraction_status": existing["extraction_status"],
                },
            )

    result: ExtractionResult = await _agent.extract(
        file_bytes=file_bytes,
        filename=file.filename or "",
        document_type=document_type,
        file_mimetype=file.content_type,
    )

    del file_bytes  # discard buffer — never written to disk

    log_id = uuid.uuid4()
    meta = result.document_meta

    if pool is None:
        logger.warning("DATABASE_URL not configured — skipping persistence for upload %s", log_id)
    else:
        recorded_date: date | None = (
            date.fromisoformat(meta.document_date) if meta.document_date else None
        )
        async with pool.acquire() as conn:
            if db_user_id is None:
                db_user_id = await ensure_user(conn, clerk_user_id)
            if db_profile_id is not None:
                await _assert_profile_owner(conn, db_profile_id, db_user_id)
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO document_upload_logs
                      (id, user_id, original_filename, document_type, document_subtype,
                       profile_id,
                       extraction_status, values_extracted, patient_name,
                       reporting_doctor, referring_doctor, hospital_or_lab, processing_note,
                       conclusions, conditions_mentioned, extracted_text, content_hash)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                    """,
                    log_id,
                    db_user_id,
                    file.filename or "",
                    document_type,
                    meta.document_type,
                    db_profile_id,
                    result.extraction_status,
                    len(result.numeric_values),
                    meta.patient_name,
                    meta.reporting_doctor,
                    meta.referring_doctor,
                    meta.hospital_or_lab,
                    result.processing_note,
                    json.dumps(result.conclusions),
                    json.dumps(result.conditions_mentioned),
                    result.extracted_text,
                    content_hash,
                )

                if result.extraction_status in ("success", "partial"):
                    if result.numeric_values:
                        await conn.executemany(
                            """
                            INSERT INTO extracted_health_values
                              (id, user_id, upload_log_id, value_name, value_raw,
                               unit, reference_range, is_abnormal, recorded_date, profile_id)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                            """,
                            [
                                (uuid.uuid4(), db_user_id, log_id,
                                 v.name, v.value, v.unit,
                                 v.reference_range, v.is_abnormal, recorded_date, db_profile_id)
                                for v in result.numeric_values
                            ],
                        )

                    if result.findings:
                        await conn.executemany(
                            """
                            INSERT INTO document_findings
                              (id, user_id, upload_log_id, section,
                               finding, is_abnormal, recorded_date, profile_id)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                            """,
                            [
                                (uuid.uuid4(), db_user_id, log_id,
                                 f.section, f.finding, f.is_abnormal, recorded_date, db_profile_id)
                                for f in result.findings
                            ],
                        )
                notable_results = [
                    " ".join(
                        part for part in (
                            v.name,
                            str(v.value),
                            v.unit,
                            "(outside reference range)" if v.is_abnormal else None,
                        ) if part
                    )
                    for v in result.numeric_values
                    if v.is_abnormal
                ]
                notable_results.extend(
                    finding.finding
                    for finding in result.findings
                    if finding.is_abnormal
                )
                await merge_health_memory(
                    conn,
                    db_user_id,
                    db_profile_id,
                    durable_facts=result.conditions_mentioned,
                    notable_results=notable_results,
                    source="document",
                )

    return UploadResponse(
        upload_id=str(log_id),
        status=result.extraction_status,
        document_meta=meta.model_dump(),
        numeric_values=[v.model_dump() for v in result.numeric_values],
        findings=[f.model_dump() for f in result.findings],
        conclusions=result.conclusions,
        conditions_mentioned=result.conditions_mentioned,
        processing_note=result.processing_note,
    )


# ── GET /documents ────────────────────────────────────────────────────────────

@router.get("")
async def list_documents(
    profile_id: str | None = None,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> DocumentListResponse:
    pool = await get_pool()
    if pool is None:
        return DocumentListResponse(uploads=[], total=0)

    try:
        profile_uuid = uuid.UUID(profile_id) if profile_id else None
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid profile_id format")

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        rows = await conn.fetch(
            """
            SELECT
              dul.id,
              dul.profile_id,
              dul.original_filename,
              dul.document_type,
              dul.document_subtype,
              dul.uploaded_at,
              dul.extraction_status,
              dul.values_extracted,
              dul.patient_name,
              dul.reporting_doctor,
              dul.hospital_or_lab,
              COALESCE(p.display_name, p.name) AS profile_display_name,
              (SELECT MIN(ehv.recorded_date)
               FROM extracted_health_values ehv
               WHERE ehv.upload_log_id = dul.id) AS recorded_date,
              (SELECT COUNT(*) FROM document_findings df
               WHERE df.upload_log_id = dul.id) AS findings_extracted
            FROM document_upload_logs dul
            LEFT JOIN profiles p ON p.id = dul.profile_id
            WHERE dul.user_id = $1
              AND dul.is_deleted = FALSE
              AND ($2::UUID IS NULL OR dul.profile_id = $2)
            ORDER BY dul.uploaded_at DESC
            """,
            user_id,
            profile_uuid,
        )

    uploads = [
        DocumentSummary(
            upload_id=str(row["id"]),
            profile_id=str(row["profile_id"]) if row["profile_id"] else None,
            profile_display_name=row["profile_display_name"],
            original_filename=row["original_filename"],
            document_type=row["document_type"],
            document_subtype=row["document_subtype"],
            uploaded_at=row["uploaded_at"].isoformat(),
            recorded_date=row["recorded_date"].isoformat() if row["recorded_date"] else None,
            extraction_status=row["extraction_status"],
            values_extracted=row["values_extracted"] or 0,
            findings_extracted=int(row["findings_extracted"]),
            hospital_or_lab=row["hospital_or_lab"],
            reporting_doctor=row["reporting_doctor"],
            patient_name=row["patient_name"],
        )
        for row in rows
    ]

    return DocumentListResponse(uploads=uploads, total=len(uploads))


# ── GET /documents/{upload_id} ────────────────────────────────────────────────

@router.get("/{upload_id}")
async def get_document(
    upload_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> DocumentDetailResponse:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        upload_uuid = uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        row = await conn.fetchrow(
            """
            SELECT id, user_id, profile_id, original_filename, document_type, document_subtype,
                   uploaded_at, extraction_status, hospital_or_lab, reporting_doctor,
                   referring_doctor, patient_name, processing_note, conclusions, is_deleted,
                   (SELECT COALESCE(display_name, name) FROM profiles WHERE id = document_upload_logs.profile_id) AS profile_display_name
            FROM document_upload_logs
            WHERE id = $1
            """,
            upload_uuid,
        )

        if row is None or row["is_deleted"]:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="FORBIDDEN")

        values = await conn.fetch(
            """
            SELECT value_name, value_raw, unit, reference_range, is_abnormal, recorded_date
            FROM extracted_health_values
            WHERE upload_log_id = $1
            ORDER BY created_at
            """,
            upload_uuid,
        )
        findings = await conn.fetch(
            """
            SELECT section, finding, is_abnormal
            FROM document_findings
            WHERE upload_log_id = $1
            ORDER BY created_at
            """,
            upload_uuid,
        )

    recorded_date = (
        values[0]["recorded_date"] if values and values[0]["recorded_date"] else None
    )
    conclusions = json.loads(row["conclusions"]) if row["conclusions"] else []

    return DocumentDetailResponse(
        upload_id=str(row["id"]),
        profile_id=str(row["profile_id"]) if row["profile_id"] else None,
        profile_display_name=row["profile_display_name"],
        original_filename=row["original_filename"],
        document_type=row["document_type"],
        document_subtype=row["document_subtype"],
        uploaded_at=row["uploaded_at"].isoformat(),
        recorded_date=recorded_date.isoformat() if recorded_date else None,
        extraction_status=row["extraction_status"],
        hospital_or_lab=row["hospital_or_lab"],
        reporting_doctor=row["reporting_doctor"],
        referring_doctor=row["referring_doctor"],
        patient_name=row["patient_name"],
        processing_note=row["processing_note"],
        numeric_values=[
            NumericValue(
                name=v["value_name"],
                value=v["value_raw"],
                unit=v["unit"],
                reference_range=v["reference_range"],
                is_abnormal=v["is_abnormal"],
            )
            for v in values
        ],
        findings=[
            DocumentFinding(
                section=f["section"],
                finding=f["finding"],
                is_abnormal=f["is_abnormal"],
            )
            for f in findings
        ],
        conclusions=conclusions,
    )


# ── DELETE /documents/{upload_id} ─────────────────────────────────────────────

@router.delete("/{upload_id}")
async def delete_document(
    upload_id: str,
    clerk_user_id: str = Depends(verify_clerk_token),
) -> DeleteResponse:
    pool = await get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        upload_uuid = uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    async with pool.acquire() as conn:
        user_id = await ensure_user(conn, clerk_user_id)
        row = await conn.fetchrow(
            "SELECT user_id, is_deleted FROM document_upload_logs WHERE id = $1",
            upload_uuid,
        )

        if row is None or row["is_deleted"]:
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="FORBIDDEN")

        await conn.execute(
            "UPDATE document_upload_logs SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
            upload_uuid,
        )

    return DeleteResponse(
        deleted=True,
        upload_id=upload_id,
        note="Your extracted health values have been hidden from your profile. This action can be reversed by contacting support.",
    )


async def _assert_profile_owner(conn, profile_id: uuid.UUID, user_id: str) -> None:
    row = await conn.fetchrow("SELECT id FROM profiles WHERE id = $1 AND user_id = $2", profile_id, user_id)
    if row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")


def _parse_optional_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid profile_id format")
