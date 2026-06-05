-- Migration 002: Document upload pipeline (enriched schema)
-- Tables: document_upload_logs, extracted_health_values, document_findings
-- Spec §19.4
--
-- NOTE: profile_id columns are declared as plain UUID here (no FK constraint).
-- The FK to profiles(id) is added in migration 003 once that table exists.

CREATE TABLE document_upload_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id        UUID,                              -- FK added in 003
  uploaded_at       TIMESTAMPTZ DEFAULT NOW(),
  original_filename VARCHAR(255) NOT NULL,
  document_type     VARCHAR(50) NOT NULL,              -- user-supplied: blood_test | prescription | imaging_report | other
  document_subtype  VARCHAR(50),                       -- LLM-detected: echo | blood_test | imaging | prescription | pathology | other
  extraction_status VARCHAR(50) NOT NULL,              -- "success" | "partial" | "failed"
  values_extracted  SMALLINT    DEFAULT 0,
  patient_name      VARCHAR(255),
  reporting_doctor  VARCHAR(255),
  referring_doctor  VARCHAR(255),
  hospital_or_lab   VARCHAR(255),
  processing_note   TEXT
);

CREATE TABLE extracted_health_values (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_log_id   UUID        REFERENCES document_upload_logs(id),
  profile_id      UUID,                                -- FK added in 003
  value_name      VARCHAR(255) NOT NULL,
  value_raw       VARCHAR(100) NOT NULL,
  unit            VARCHAR(50),
  reference_range VARCHAR(100),
  is_abnormal     BOOLEAN,
  recorded_date   DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_findings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_log_id UUID        REFERENCES document_upload_logs(id),
  profile_id    UUID,                                  -- FK added in 003
  section       VARCHAR(255),
  finding       TEXT        NOT NULL,
  is_abnormal   BOOLEAN,
  recorded_date DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
