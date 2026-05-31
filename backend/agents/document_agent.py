from __future__ import annotations

import base64
import io
import json
import logging
from typing import Literal

import pdfplumber
from pydantic import BaseModel, ValidationError

from .openrouter_client import AgentFailure, OpenRouterClient

_MODEL_ROLE = "doc_extraction"
_TEMPERATURE = 0.2

logger = logging.getLogger(__name__)

_EXTRACTION_PROMPT = """\
You are extracting structured medical data from a health document.
Return ONLY valid JSON, no preamble, no markdown fences.

Schema:
{
  "document_meta": {
    "document_type": "blood_test | echo | imaging | prescription | pathology | other",
    "document_date": "YYYY-MM-DD or null",
    "hospital_or_lab": "string or null",
    "reporting_doctor": "string or null",
    "referring_doctor": "string or null",
    "patient_name": "string or null",
    "patient_age": "string or null",
    "patient_sex": "string or null"
  },
  "numeric_values": [
    {
      "name": "e.g. LVEF, HbA1c, Haemoglobin",
      "value": "numeric string",
      "unit": "unit or null",
      "reference_range": "e.g. 55-70% or null",
      "is_abnormal": true/false/null
    }
  ],
  "findings": [
    {
      "section": "section heading e.g. Left Ventricle",
      "finding": "verbatim or paraphrased finding text",
      "is_abnormal": true/false/null
    }
  ],
  "conclusions": ["string — each conclusion bullet as a separate item"],
  "conditions_mentioned": ["string"],
  "processing_note": "any quality issues or null"
}"""


# ── Pydantic models ───────────────────────────────────────────────────────────

class DocumentMeta(BaseModel):
    document_type: str | None = None
    document_date: str | None = None
    hospital_or_lab: str | None = None
    reporting_doctor: str | None = None
    referring_doctor: str | None = None
    patient_name: str | None = None
    patient_age: str | None = None
    patient_sex: str | None = None


class NumericValue(BaseModel):
    name: str
    value: str
    unit: str | None = None
    reference_range: str | None = None
    is_abnormal: bool | None = None


class DocumentFinding(BaseModel):
    section: str | None = None
    finding: str
    is_abnormal: bool | None = None


class _LLMResponse(BaseModel):
    document_meta: DocumentMeta = DocumentMeta()
    numeric_values: list[NumericValue] = []
    findings: list[DocumentFinding] = []
    conclusions: list[str] = []
    conditions_mentioned: list[str] = []
    processing_note: str | None = None


class ExtractionResult(BaseModel):
    document_meta: DocumentMeta = DocumentMeta()
    numeric_values: list[NumericValue] = []
    findings: list[DocumentFinding] = []
    conclusions: list[str] = []
    conditions_mentioned: list[str] = []
    processing_note: str | None = None
    extraction_status: Literal["success", "partial", "failed"] = "success"
    extracted_text: str | None = None


# ── Agent ─────────────────────────────────────────────────────────────────────

class DocumentAgent:
    def __init__(self) -> None:
        self._client = OpenRouterClient()

    async def extract(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: str,
        file_mimetype: str,
    ) -> ExtractionResult:
        extracted_text: str | None = None
        if file_mimetype == "application/pdf":
            messages, extracted_text = self._pdf_messages(file_bytes)
        elif file_mimetype in ("image/jpeg", "image/png"):
            messages = self._image_messages(file_bytes, file_mimetype)
        else:
            return ExtractionResult(
                extraction_status="failed",
                processing_note=f"Unsupported mimetype: {file_mimetype}",
            )

        try:
            data = await self._client.chat(
                role=_MODEL_ROLE,
                messages=messages,
                temperature=_TEMPERATURE,
            )
        except AgentFailure as exc:
            if exc.code == "MALFORMED_JSON":
                logger.error(json.dumps({
                    "event": "doc_extraction_failed",
                    "reason": "MALFORMED_JSON",
                    "filename": filename,
                }))
                return ExtractionResult(
                    extraction_status="failed",
                    processing_note="Model returned invalid JSON",
                )
            raise

        try:
            parsed = _LLMResponse.model_validate(data)
        except ValidationError as exc:
            logger.error(json.dumps({
                "event": "doc_extraction_failed",
                "reason": "VALIDATION_ERROR",
                "filename": filename,
                "detail": str(exc),
            }))
            return ExtractionResult(
                extraction_status="failed",
                processing_note="Model returned invalid JSON",
            )

        return ExtractionResult(
            document_meta=parsed.document_meta,
            numeric_values=parsed.numeric_values,
            findings=parsed.findings,
            conclusions=parsed.conclusions,
            conditions_mentioned=parsed.conditions_mentioned,
            processing_note=parsed.processing_note,
            extraction_status="success",
            extracted_text=extracted_text,
        )

    def _pdf_messages(self, file_bytes: bytes) -> tuple[list[dict], str]:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages).strip()
        messages = [{"role": "user", "content": f"{_EXTRACTION_PROMPT}\n\nDocument text:\n{text}"}]
        return messages, text

    def _image_messages(self, file_bytes: bytes, mimetype: str) -> list[dict]:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        return [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:{mimetype};base64,{b64}"}},
                ],
            }
        ]
