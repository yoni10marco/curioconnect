CREATE TABLE IF NOT EXISTS feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "users_insert_own_feedback" ON feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No SELECT policy for regular users — only the service role key (admin dashboard) can read
