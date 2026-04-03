-- ============================================================
-- Age of Abundance - Supabase Schema Setup
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Perfil do usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  circle_member BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Progresso diario (daily practices)
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  practice_key TEXT NOT NULL,
  completed_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, practice_key, completed_date)
);

-- 3. Progresso de modulos/licoes
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  current_lesson INT DEFAULT 0,
  completed_lessons JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 4. Notas e ratings de licoes
CREATE TABLE IF NOT EXISTS lesson_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  notes TEXT DEFAULT '',
  rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 5. Desafio 21 dias
CREATE TABLE IF NOT EXISTS challenge_21days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ,
  completed_days JSONB DEFAULT '[]',
  notes JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. Comunidade (reacoes + amens)
CREATE TABLE IF NOT EXISTS community_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interaction_date DATE NOT NULL,
  reaction_type TEXT,
  amen_text TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Gifts/Achievements
CREATE TABLE IF NOT EXISTS user_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gift_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, gift_id)
);

-- 8. Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daily_progress_user ON daily_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_interactions_user ON lesson_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_user ON challenge_21days(user_id);
CREATE INDEX IF NOT EXISTS idx_community_date ON community_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_community_user ON community_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_user ON user_gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(user_id, entry_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_21days ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policies para anon key: permitir todas operacoes (seguranca via user_id no codigo)
-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);

-- Daily Progress
CREATE POLICY "daily_progress_select" ON daily_progress FOR SELECT USING (true);
CREATE POLICY "daily_progress_insert" ON daily_progress FOR INSERT WITH CHECK (true);

-- Module Progress
CREATE POLICY "module_progress_select" ON module_progress FOR SELECT USING (true);
CREATE POLICY "module_progress_insert" ON module_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "module_progress_update" ON module_progress FOR UPDATE USING (true);

-- Lesson Interactions
CREATE POLICY "lesson_interactions_select" ON lesson_interactions FOR SELECT USING (true);
CREATE POLICY "lesson_interactions_insert" ON lesson_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_interactions_update" ON lesson_interactions FOR UPDATE USING (true);

-- Challenge 21 Days
CREATE POLICY "challenge_select" ON challenge_21days FOR SELECT USING (true);
CREATE POLICY "challenge_insert" ON challenge_21days FOR INSERT WITH CHECK (true);
CREATE POLICY "challenge_update" ON challenge_21days FOR UPDATE USING (true);

-- Community Interactions (amens visiveis para todos)
CREATE POLICY "community_select" ON community_interactions FOR SELECT USING (true);
CREATE POLICY "community_insert" ON community_interactions FOR INSERT WITH CHECK (true);

-- User Gifts
CREATE POLICY "gifts_select" ON user_gifts FOR SELECT USING (true);
CREATE POLICY "gifts_insert" ON user_gifts FOR INSERT WITH CHECK (true);

-- Journal Entries
CREATE POLICY "journal_select" ON journal_entries FOR SELECT USING (true);
CREATE POLICY "journal_insert" ON journal_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "journal_update" ON journal_entries FOR UPDATE USING (true);
CREATE POLICY "journal_delete" ON journal_entries FOR DELETE USING (true);
