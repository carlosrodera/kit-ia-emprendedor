-- Create migrations tracking table
-- This table keeps track of which migrations have been executed

CREATE TABLE IF NOT EXISTS public.migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT,
  execution_time_ms INTEGER,
  executed_by TEXT DEFAULT CURRENT_USER
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at DESC);

-- Add comment
COMMENT ON TABLE migrations IS 'Tracks executed database migrations for Kit IA Emprendedor';