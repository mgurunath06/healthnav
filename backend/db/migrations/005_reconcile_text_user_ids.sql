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
