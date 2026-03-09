ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS streak_freeze_count integer NOT NULL DEFAULT 1;
