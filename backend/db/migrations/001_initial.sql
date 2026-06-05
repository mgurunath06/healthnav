-- Migration 001: Initial schema — users and profiles

CREATE TABLE IF NOT EXISTS users (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id        VARCHAR(255) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  display_name         VARCHAR(255),
  onboarding_completed BOOLEAN      DEFAULT FALSE,
  location_city        VARCHAR(100),
  location_country     VARCHAR(100),
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW(),
  last_active_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id
  ON users (clerk_user_id);

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255),
  relationship VARCHAR(50),
  date_of_birth DATE,
  sex          VARCHAR(10),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
