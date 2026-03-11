-- Lesson queue: pre-generated lessons waiting to be served
CREATE TABLE lesson_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    interest_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    quiz_data JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    queue_position INT NOT NULL DEFAULT 0
);

ALTER TABLE lesson_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own queue" ON lesson_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete own queue" ON lesson_queue
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_lesson_queue_user_pos ON lesson_queue(user_id, queue_position);
CREATE INDEX idx_lesson_queue_user_interest ON lesson_queue(user_id, interest_name);

-- Track interest_name on consumed lessons (optional, for analytics)
ALTER TABLE daily_lessons ADD COLUMN IF NOT EXISTS interest_name TEXT;

-- Limit difficulty changes to once per week
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_difficulty_change DATE;
