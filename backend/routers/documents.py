from __future__ import annotations

import json
import logging
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.document_agent import DocumentAgent, ExtractionResult
from auth import verify_clerk_token
from db.client import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(tags=["documents"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_MIMETYPES = frozenset({"application/pdf", "image/jpeg", "image/png"})

DocumentType = Literal["blood_test", "prescription", "imaging_report", "other"]

_agent = DocumentAgent()


class UploadResponse(BaseModel):
    upload_id: str
    status: str
    document_meta: dict
    numeric_values: list[dict]
    findings: list[dict]
    conclusions: list[str]
    conditions_mentioned: list[str]
    processing_note: str | None


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    user_id: str = Depends(verify_clerk_token),
) -> UploadResponse:
    if not file.content_type or file.content_type not in _ALLOWED_MIMETYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type. Accepted: PDF, JPEG, PNG")

    file_bytes = await file.read()

    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    result: ExtractionResult = await _agent.extract(
        file_bytes=file_bytes,
        filename=file.filename or "",
        document_type=document_type,
        file_mimetype=file.content_type,
    )

    del file_bytes  # discard buffer — never written to disk

    log_id = str(uuid.uuid4())
    meta = result.document_meta
    pool = await get_pool()

    if pool is None:
        logger.warning("DATABASE_URL not configured — skipping persistence for upload %s", log_id)
    else:
        recorded_date: date | None = (
            date.fromisoformat(meta.document_date) if meta.document_date else None
        )
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO users (id, email)
                    VALUES ($1, $2)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                    f"{user_id}@clerk.placeholder",
                )
                await conn.execute(
                    """
                    INSERT INTO document_upload_logs
                      (id, user_id, original_filename, document_type, document_subtype,
                       extraction_status, values_extracted, patient_name,
                       reporting_doctor, referring_doctor, hospital_or_lab, processing_note,
                       conclusions, conditions_mentioned, extracted_text)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                    """,
                    log_id,
                    user_id,
                    file.filename or "",
                    document_type,
                    meta.document_type,
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
                )

                if result.extraction_status in ("success", "partial"):
                    if result.numeric_values:
                        await conn.executemany(
                            """
                            INSERT INTO extracted_health_values
                              (id, user_id, upload_log_id, value_name, value_raw,
                               unit, reference_range, is_abnormal, recorded_date)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                            """,
                            [
                                (str(uuid.uuid4()), user_id, log_id,
                                 v.name, v.value, v.unit,
                                 v.reference_range, v.is_abnormal, recorded_date)
                                for v in result.numeric_values
                            ],
                        )

                    if result.findings:
                        await conn.executemany(
                            """
                            INSERT INTO document_findings
                              (id, user_id, upload_log_id, section,
                               finding, is_abnormal, recorded_date)
                            VALUES ($1,$2,$3,$4,$5,$6,$7)
                            """,
                            [
                                (str(uuid.uuid4()), user_id, log_id,
                                 f.section, f.finding, f.is_abnormal, recorded_date)
                                for f in result.findings
                            ],
                        )

    return UploadResponse(
        upload_id=log_id,
        status=result.extraction_status,
        document_meta=meta.model_dump(),
        numeric_values=[v.model_dump() for v in result.numeric_values],
        findings=[f.model_dump() for f in result.findings],
        conclusions=result.conclusions,
        conditions_mentioned=result.conditions_mentioned,
        processing_note=result.processing_note,
    )
