-- Migration 003: Add conclusions, conditions_mentioned, extracted_text to document_upload_logs
-- Spec §19.4 — store inferences and raw extracted text, never raw file bytes

ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS conclusions         JSONB DEFAULT '[]';
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS conditions_mentioned JSONB DEFAULT '[]';
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS extracted_text      TEXT;
