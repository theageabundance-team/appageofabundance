-- ============================================================
-- Age of Abundance - Migration: Email as Primary Key
-- ATENÇÃO: Isso apaga todos os dados existentes.
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop all existing tables (order matters due to FK constraints)
DROP TABLE IF EXISTS lesson_comments CASCADE;
DROP TABLE IF EXISTS lesson_interactions CASCADE;
DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF EXISTS daily_progress CASCADE;
DROP TABLE IF EXISTS user_gifts CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS challenge_21days CASCADE;
DROP TABLE IF EXISTS community_interactions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── PROFILES (email is PK) ──────────────────────────────────
CREATE TABLE profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  circle_member BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── DAILY PROGRESS ──────────────────────────────────────────
CREATE TABLE daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  practice_key TEXT NOT NULL,
  completed_date DATE NOT NULL,
  UNIQUE(user_email, practice_key, completed_date)
);

-- ── MODULE PROGRESS ─────────────────────────────────────────
CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  current_lesson INT DEFAULT 0,
  completed_lessons JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, module_id)
);

-- ── LESSON INTERACTIONS (notes + rating) ────────────────────
CREATE TABLE lesson_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  notes TEXT DEFAULT '',
  rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, lesson_id)
);

-- ── USER GIFTS ───────────────────────────────────────────────
CREATE TABLE user_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  gift_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, gift_id)
);

-- ── 21-DAY CHALLENGE ────────────────────────────────────────
CREATE TABLE challenge_21days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ,
  completed_days JSONB DEFAULT '[]',
  notes JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email)
);

-- ── COMMUNITY INTERACTIONS ───────────────────────────────────
CREATE TABLE community_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  interaction_date DATE NOT NULL,
  reaction_type TEXT,
  amen_text TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── JOURNAL ENTRIES ──────────────────────────────────────────
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, entry_date)
);

-- ── LESSON COMMENTS ──────────────────────────────────────────
CREATE TABLE lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_daily_progress_email       ON daily_progress(user_email);
CREATE INDEX idx_module_progress_email      ON module_progress(user_email);
CREATE INDEX idx_lesson_interactions_email  ON lesson_interactions(user_email);
CREATE INDEX idx_user_gifts_email           ON user_gifts(user_email);
CREATE INDEX idx_challenge_21days_email     ON challenge_21days(user_email);
CREATE INDEX idx_community_interactions_email ON community_interactions(user_email);
CREATE INDEX idx_community_interactions_date  ON community_interactions(interaction_date);
CREATE INDEX idx_journal_entries_email      ON journal_entries(user_email);
CREATE INDEX idx_lesson_comments_lesson     ON lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_email      ON lesson_comments(user_email);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_interactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gifts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_21days      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_comments       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);

-- daily_progress
CREATE POLICY "daily_select" ON daily_progress FOR SELECT USING (true);
CREATE POLICY "daily_insert" ON daily_progress FOR INSERT WITH CHECK (true);

-- module_progress
CREATE POLICY "module_select" ON module_progress FOR SELECT USING (true);
CREATE POLICY "module_insert" ON module_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "module_update" ON module_progress FOR UPDATE USING (true);

-- lesson_interactions
CREATE POLICY "lesson_int_select" ON lesson_interactions FOR SELECT USING (true);
CREATE POLICY "lesson_int_insert" ON lesson_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_int_update" ON lesson_interactions FOR UPDATE USING (true);

-- user_gifts
CREATE POLICY "gifts_select" ON user_gifts FOR SELECT USING (true);
CREATE POLICY "gifts_insert" ON user_gifts FOR INSERT WITH CHECK (true);

-- challenge_21days
CREATE POLICY "challenge_select" ON challenge_21days FOR SELECT USING (true);
CREATE POLICY "challenge_insert" ON challenge_21days FOR INSERT WITH CHECK (true);
CREATE POLICY "challenge_update" ON challenge_21days FOR UPDATE USING (true);

-- community_interactions (amens visible to everyone)
CREATE POLICY "community_all" ON community_interactions FOR ALL USING (true);

-- journal_entries
CREATE POLICY "journal_select" ON journal_entries FOR SELECT USING (true);
CREATE POLICY "journal_insert" ON journal_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "journal_update" ON journal_entries FOR UPDATE USING (true);
CREATE POLICY "journal_delete" ON journal_entries FOR DELETE USING (true);

-- lesson_comments
CREATE POLICY "comments_all" ON lesson_comments FOR ALL USING (true);
