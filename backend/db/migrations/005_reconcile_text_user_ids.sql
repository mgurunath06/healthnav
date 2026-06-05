-- Migration 005: Reconcile the deployed Clerk TEXT identity schema

-- Remove the temporary column created during the aborted UUID conversion.
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS internal_user_id;

-- CREATE TABLE IF NOT EXISTS does not add columns to an existing table.
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Existing production rows use the Clerk user ID as users.id.
UPDATE users
SET clerk_user_id = id
WHERE clerk_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id
  ON users (clerk_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated
  ON chat_conversations (user_id, updated_at DESC);

-- Reconcile the earlier expanded saved-card schema with the current JSONB API.
ALTER TABLE saved_prep_cards
  ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::TEXT;

ALTER TABLE saved_prep_cards
  ADD COLUMN IF NOT EXISTS prep_card JSONB,
  ADD COLUMN IF NOT EXISTS quadrant_id VARCHAR(5),
  ADD COLUMN IF NOT EXISTS urgency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS importance_score SMALLINT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS key_findings JSONB,
  ADD COLUMN IF NOT EXISTS questions_for_doctor JSONB,
  ADD COLUMN IF NOT EXISTS recommended_next_step TEXT,
  ADD COLUMN IF NOT EXISTS specialties JSONB,
  ADD COLUMN IF NOT EXISTS full_card_json JSONB,
  ADD COLUMN IF NOT EXISTS disclaimer TEXT;

UPDATE saved_prep_cards
SET prep_card = COALESCE(full_card_json, '{}'::JSONB)
WHERE prep_card IS NULL;

ALTER TABLE saved_prep_cards
  ALTER COLUMN prep_card SET NOT NULL,
  ALTER COLUMN symptom_description DROP NOT NULL,
  ALTER COLUMN quadrant_id DROP NOT NULL,
  ALTER COLUMN urgency_score DROP NOT NULL,
  ALTER COLUMN importance_score DROP NOT NULL,
  ALTER COLUMN summary DROP NOT NULL,
  ALTER COLUMN key_findings DROP NOT NULL,
  ALTER COLUMN questions_for_doctor DROP NOT NULL,
  ALTER COLUMN recommended_next_step DROP NOT NULL,
  ALTER COLUMN specialties DROP NOT NULL,
  ALTER COLUMN full_card_json DROP NOT NULL,
  ALTER COLUMN disclaimer DROP NOT NULL;
