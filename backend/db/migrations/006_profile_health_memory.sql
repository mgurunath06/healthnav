-- Migration 006: Compact, profile-specific health memory

CREATE TABLE IF NOT EXISTS profile_health_memory (
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  summary            TEXT NOT NULL DEFAULT '',
  durable_facts      JSONB NOT NULL DEFAULT '[]'::JSONB,
  recurring_concerns JSONB NOT NULL DEFAULT '[]'::JSONB,
  notable_results    JSONB NOT NULL DEFAULT '[]'::JSONB,
  recent_episodes    JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_counts      JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_health_memory_owner
  ON profile_health_memory (user_id, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::UUID));
