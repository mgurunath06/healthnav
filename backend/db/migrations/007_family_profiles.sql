-- Migration 007: Family profile graph and document subject resolution

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS subject_match_status VARCHAR(30);
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS subject_match_confidence NUMERIC(4,3);
ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS originally_selected_profile_id UUID;

CREATE INDEX IF NOT EXISTS idx_profiles_user_relation
  ON profiles (user_id, relation);

CREATE INDEX IF NOT EXISTS idx_document_upload_logs_profile
  ON document_upload_logs (user_id, profile_id, uploaded_at DESC);
