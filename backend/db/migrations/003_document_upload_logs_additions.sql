-- Migration 003: Add conclusions, conditions_mentioned, extracted_text to document_upload_logs
-- Spec §19.4 — store inferences and raw extracted text, never raw file bytes

ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS conclusions         JSONB DEFAULT '[]';
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS conditions_mentioned JSONB DEFAULT '[]';
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS extracted_text      TEXT;

-- §25.2 — document history management: soft-delete and duplicate detection
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS content_hash  VARCHAR(64);
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS is_deleted    BOOLEAN     DEFAULT FALSE;
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dul_content_hash ON document_upload_logs (user_id, content_hash)
  WHERE is_deleted = FALSE;
