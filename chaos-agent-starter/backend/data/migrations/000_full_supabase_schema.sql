-- ==========================================================
-- JARVIS 2.0 FULL SUPABASE POSTGRESQL DATABASE SCHEMA
-- Migration: 000_full_supabase_schema.sql
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. TASKS & SUBTASKS
-- ==========================================================
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    due_time TIME,
    category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);

-- ==========================================================
-- 2. CONVERSATIONS & MESSAGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(100) PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);

-- ==========================================================
-- 3. MEMORY VAULT (GOALS, PRINCIPLES, VISION)
-- ==========================================================
CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Project Goal' CHECK (category IN ('Project Goal', 'Key Principle', 'Vision', 'Reference')),
    importance VARCHAR(30) NOT NULL DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    goal_deadline DATE,
    linked_task_ids TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);

-- ==========================================================
-- 4. GAMIFICATION: USER XP & LEVELS
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid(),
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_xp_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);

CREATE TABLE IF NOT EXISTS user_levels (
    level_number INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    min_xp INTEGER NOT NULL,
    max_xp INTEGER NOT NULL,
    badge_icon VARCHAR(50) NOT NULL DEFAULT 'Award',
    perks_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed predefined levels
INSERT INTO user_levels (level_number, title, min_xp, max_xp, badge_icon, perks_description) VALUES
(1, 'Temporal Initiate', 0, 200, 'Zap', 'Base operational status. Unlocks core task tracking.'),
(2, 'Chronos Apprentice', 201, 500, 'Clock', 'Unlocks weekly challenge creation and micro-action suggestions.'),
(3, 'Focus Operator', 501, 1000, 'Target', 'Unlocks 25-minute Pomodoro focus stream and daily goals.'),
(4, 'Task Vanguard', 1001, 1800, 'Shield', 'Unlocks deep anti-procrastination behavioral diagnostics.'),
(5, 'Temporal Strategist', 1801, 3000, 'Flame', 'Unlocks Memory Vault goal linkage bonuses and streak multipliers.'),
(6, 'Flow Architect', 3001, 4500, 'Cpu', 'Unlocks master task decomposition engine and custom challenges.'),
(7, 'Master of Time', 4501, 999999, 'Crown', 'Peak productivity mastery. Unlocks executive telemetry reports.')
ON CONFLICT (level_number) DO NOTHING;

-- ==========================================================
-- 5. IDEMPOTENT XP TRANSACTIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid(),
    task_id VARCHAR(100),
    challenge_id VARCHAR(100),
    achievement_id VARCHAR(100),
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON user_xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_idempotency ON user_xp_transactions(idempotency_key);

-- ==========================================================
-- 6. PRODUCTIVITY STREAKS
-- ==========================================================
CREATE TABLE IF NOT EXISTS productivity_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid(),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date DATE,
    weekly_history JSONB DEFAULT '{}'::jsonb,
    daily_goal_targets TEXT[] DEFAULT '{}',
    daily_goal_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_productivity_streaks_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON productivity_streaks(user_id);

-- ==========================================================
-- 7. ACHIEVEMENTS CATALOG & UNLOCKS
-- ==========================================================
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Trophy',
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    xp_reward INTEGER NOT NULL DEFAULT 50,
    required_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed predefined achievements
INSERT INTO achievements (id, code, title, description, icon, category, xp_reward, required_count) VALUES
('ach_01', 'FIRST_JUMP', 'First Jump', 'Complete your very first task in JARVIS', 'Zap', 'Milestones', 50, 1),
('ach_02', 'TASK_CENTURION', 'Task Centurion', 'Successfully complete 10 operational tasks', 'CheckCircle', 'Milestones', 150, 10),
('ach_03', 'CONSISTENCY_ENGINE', 'Consistency Engine', 'Maintain an active daily completion streak for 3 consecutive days', 'Flame', 'Consistency', 100, 3),
('ach_04', 'TIME_GUARDIAN', 'Time Guardian', 'Maintain a stellar 7-day completion streak', 'Shield', 'Consistency', 250, 7),
('ach_05', 'URGENT_RESOLVER', 'Urgent Resolver', 'Complete a critical urgent priority task before deadline', 'AlertTriangle', 'Focus', 100, 1),
('ach_06', 'DECOMPOSITION_PRO', 'Decomposition Pro', 'Break down a project into subtasks and resolve all steps', 'Layers', 'Mastery', 120, 1),
('ach_07', 'MEMORY_ARCHITECT', 'Memory Architect', 'Store 3 core project goals in the Memory Vault', 'Brain', 'Mastery', 100, 3),
('ach_08', 'CHALLENGE_CHAMPION', 'Challenge Champion', 'Conquer and complete a weekly productivity challenge', 'Trophy', 'Focus', 150, 1),
('ach_09', 'FLOW_STATE', 'Flow State Novice', 'Complete a 25-minute Pomodoro focus session', 'Target', 'Focus', 80, 1),
('ach_10', 'DAILY_MASTER', 'Daily Goal Master', 'Complete all selected daily targets in a single day', 'Award', 'Consistency', 120, 1)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid(),
    achievement_id VARCHAR(100) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ==========================================================
-- 8. PRODUCTIVITY CHALLENGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS productivity_challenges (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'weekly',
    target_count INTEGER NOT NULL DEFAULT 3,
    current_count INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON productivity_challenges(user_id);

-- ==========================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_challenges ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own records; allow service role full access
CREATE POLICY tasks_user_policy ON tasks FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY subtasks_user_policy ON subtasks FOR ALL USING (true);
CREATE POLICY conversations_user_policy ON conversations FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY messages_user_policy ON messages FOR ALL USING (true);
CREATE POLICY memories_user_policy ON memories FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY user_xp_policy ON user_xp FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY user_xp_tx_policy ON user_xp_transactions FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY streaks_user_policy ON productivity_streaks FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY achievements_user_policy ON user_achievements FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY challenges_user_policy ON productivity_challenges FOR ALL USING (auth.uid() IS NULL OR auth.uid() = user_id);
