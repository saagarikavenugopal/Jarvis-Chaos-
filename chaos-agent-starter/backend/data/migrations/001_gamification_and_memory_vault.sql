-- ==========================================================
-- JARVIS OS: BEAT PROCRASTINATION & MEMORY VAULT MIGRATION
-- Migration: 001_gamification_and_memory_vault.sql
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER XP & PROFILE TABLE
CREATE TABLE IF NOT EXISTS user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_xp_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);

-- 3. USER LEVELS DEFINITION
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

-- 4. IDEMPOTENT XP TRANSACTIONS LOG
CREATE TABLE IF NOT EXISTS user_xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    task_id VARCHAR(100),
    challenge_id UUID,
    achievement_id UUID,
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'task_completion', 'urgent_bonus', 'subtask_completion', 'daily_goal', 'streak_bonus', 'challenge', 'achievement', 'focus_session'
    idempotency_key VARCHAR(255) NOT NULL UNIQUE, -- Prevents duplicate rewards for repeated completions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON user_xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_idempotency ON user_xp_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_xp_tx_task ON user_xp_transactions(task_id);

-- 5. PRODUCTIVITY STREAKS TABLE
CREATE TABLE IF NOT EXISTS productivity_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_activity_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_productivity_streaks_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON productivity_streaks(user_id);

-- 6. ACHIEVEMENTS CATALOG TABLE
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Trophy',
    category VARCHAR(50) NOT NULL DEFAULT 'General', -- 'Milestones', 'Consistency', 'Focus', 'Mastery'
    xp_reward INTEGER NOT NULL DEFAULT 50,
    required_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard achievements
INSERT INTO achievements (code, title, description, icon, category, xp_reward, required_count) VALUES
('FIRST_JUMP', 'First Jump', 'Complete your very first task in JARVIS', 'Zap', 'Milestones', 50, 1),
('TASK_CENTURION', 'Task Centurion', 'Successfully complete 10 operational tasks', 'CheckCircle', 'Milestones', 150, 10),
('CONSISTENCY_ENGINE', 'Consistency Engine', 'Maintain an active daily completion streak for 3 consecutive days', 'Flame', 'Consistency', 100, 3),
('TIME_GUARDIAN', 'Time Guardian', 'Maintain a stellar 7-day completion streak', 'Shield', 'Consistency', 250, 7),
('URGENT_RESOLVER', 'Urgent Resolver', 'Complete a critical urgent priority task before deadline', 'AlertTriangle', 'Focus', 100, 1),
('DECOMPOSITION_PRO', 'Decomposition Pro', 'Break down a project into subtasks and resolve all steps', 'Layers', 'Mastery', 120, 1),
('MEMORY_ARCHITECT', 'Memory Architect', 'Store 3 core project goals in the Memory Vault', 'Brain', 'Mastery', 100, 3),
('CHALLENGE_CHAMPION', 'Challenge Champion', 'Conquer and complete a weekly productivity challenge', 'Trophy', 'Focus', 150, 1),
('FLOW_STATE', 'Flow State Novice', 'Complete a 25-minute Pomodoro focus session', 'Target', 'Focus', 80, 1),
('DAILY_MASTER', 'Daily Goal Master', 'Complete all selected daily targets in a single day', 'Award', 'Consistency', 120, 1)
ON CONFLICT (code) DO NOTHING;

-- 7. USER UNLOCKED ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(is_unlocked);

-- 8. PRODUCTIVITY CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS productivity_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'Weekly', -- 'Daily', 'Weekly', 'Sprint'
    target_count INTEGER NOT NULL DEFAULT 3,
    current_count INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON productivity_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON productivity_challenges(status);

-- 9. MEMORIES TABLE (MEMORY VAULT)
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Project Goal', -- 'Project Goal', 'Key Principle', 'Vision', 'Reference'
    importance VARCHAR(30) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    goal_deadline DATE,
    linked_task_ids TEXT[] DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);

-- 10. MEMORY TAGS TABLE
CREATE TABLE IF NOT EXISTS memory_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_memory_tag UNIQUE (memory_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_memory_tags_memory ON memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag);

-- 11. MEMORY FAVORITES TABLE
CREATE TABLE IF NOT EXISTS memory_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_memory_favorite UNIQUE (user_id, memory_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_favorites_user ON memory_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_favorites_memory ON memory_favorites(memory_id);

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_favorites ENABLE ROW LEVEL SECURITY;

-- User XP policies
CREATE POLICY user_xp_policy ON user_xp
    FOR ALL USING (auth.uid() = user_id);

-- XP transactions policies
CREATE POLICY user_xp_transactions_policy ON user_xp_transactions
    FOR ALL USING (auth.uid() = user_id);

-- Productivity streaks policies
CREATE POLICY productivity_streaks_policy ON productivity_streaks
    FOR ALL USING (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY user_achievements_policy ON user_achievements
    FOR ALL USING (auth.uid() = user_id);

-- Productivity challenges policies
CREATE POLICY productivity_challenges_policy ON productivity_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Memories policies
CREATE POLICY memories_policy ON memories
    FOR ALL USING (auth.uid() = user_id);

-- Memory tags policies
CREATE POLICY memory_tags_policy ON memory_tags
    FOR ALL USING (EXISTS (
        SELECT 1 FROM memories WHERE memories.id = memory_tags.memory_id AND memories.user_id = auth.uid()
    ));

-- Memory favorites policies
CREATE POLICY memory_favorites_policy ON memory_favorites
    FOR ALL USING (auth.uid() = user_id);
