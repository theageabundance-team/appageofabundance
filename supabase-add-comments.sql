-- ============================================================
-- Age of Abundance - Migration: Add lesson_comments table
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson ON lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_user ON lesson_comments(user_id);

ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_comments_select" ON lesson_comments FOR SELECT USING (true);
CREATE POLICY "lesson_comments_insert" ON lesson_comments FOR INSERT WITH CHECK (true);
