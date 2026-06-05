-- Migration 004: Premium profiles, saved cards, and companion chat

-- Clerk IDs are strings, but all application tables reference the internal UUID.
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id
  ON users (clerk_user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relation VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE profiles
SET display_name = COALESCE(display_name, name),
    relation = COALESCE(relation, relationship, 'self')
WHERE display_name IS NULL OR relation IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_document_upload_logs_profile'
      AND conrelid = 'document_upload_logs'::regclass
  ) THEN
    ALTER TABLE document_upload_logs
      ADD CONSTRAINT fk_document_upload_logs_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_extracted_health_values_profile'
      AND conrelid = 'extracted_health_values'::regclass
  ) THEN
    ALTER TABLE extracted_health_values
      ADD CONSTRAINT fk_extracted_health_values_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_document_findings_profile'
      AND conrelid = 'document_findings'::regclass
  ) THEN
    ALTER TABLE document_findings
      ADD CONSTRAINT fk_document_findings_profile
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS saved_prep_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_id          VARCHAR(100) NOT NULL,
  symptom_description TEXT,
  prep_card           JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_prep_cards_user_created
  ON saved_prep_cards (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title      VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role             VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT NOT NULL,
  disclaimer_shown BOOLEAN DEFAULT FALSE,
  sources_used     JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated
  ON chat_conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (conversation_id, created_at);
