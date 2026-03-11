-- Limit interest changes to once per week (same pattern as difficulty changes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_interest_change DATE;
