ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS admin_role text CHECK (admin_role IN ('full_admin', 'read_only_admin')) DEFAULT NULL;
