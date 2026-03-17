-- Enable pg_cron extension (already available on Supabase, just needs enabling)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function that processes all users with stale streaks nightly.
-- For each user with a gap > 1 day since last_lesson_date:
--   1. Calculate missed days (days between last_lesson_date and today, minus 1)
--   2. Consume freezes to cover missed days
--   3. If not enough freezes, reset streak to 0 and consume all remaining freezes
CREATE OR REPLACE FUNCTION public.cron_reset_stale_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  missed_days integer;
  freezes_to_use integer;
BEGIN
  FOR r IN
    SELECT id, streak_count, streak_freeze_count, last_lesson_date
    FROM profiles
    WHERE last_lesson_date IS NOT NULL
      AND last_lesson_date < CURRENT_DATE - INTERVAL '1 day'
      AND (streak_count > 0 OR streak_freeze_count > 0)
  LOOP
    missed_days := (CURRENT_DATE - r.last_lesson_date)::integer - 1;

    IF missed_days <= 0 THEN
      CONTINUE;
    END IF;

    IF r.streak_freeze_count >= missed_days THEN
      -- Enough freezes to cover the gap
      UPDATE profiles
      SET streak_freeze_count = streak_freeze_count - missed_days,
          last_lesson_date = CURRENT_DATE - INTERVAL '1 day'
      WHERE id = r.id;
    ELSE
      -- Not enough freezes — reset streak, consume all remaining freezes
      UPDATE profiles
      SET streak_count = 0,
          streak_freeze_count = 0
      WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- Schedule to run every night at midnight UTC
SELECT cron.schedule(
  'reset-stale-streaks',
  '0 0 * * *',
  'SELECT public.cron_reset_stale_streaks()'
);
