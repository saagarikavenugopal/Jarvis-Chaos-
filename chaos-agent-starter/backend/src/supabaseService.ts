import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllTasks, Task } from './taskDatabase.js';
import { getAllMemories, Memory } from './memoryVaultDatabase.js';
import { getGamificationProfile, GamificationState } from './gamificationDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedClient: SupabaseClient | null = null;
let customUrl: string | null = null;
let customKey: string | null = null;

export function setCustomSupabaseCredentials(url: string, key: string) {
  customUrl = url.trim();
  customKey = key.trim();
  cachedClient = null; // reset cached client
}

export function getSupabaseConfig(): {
  configured: boolean;
  url: string | null;
  hasKey: boolean;
  source: 'env' | 'runtime' | 'none';
} {
  const url = customUrl || process.env.SUPABASE_URL || null;
  const key = customKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;

  return {
    configured: Boolean(url && key),
    url: url ? url.replace(/^(https?:\/\/[^/]+).*$/, '$1') : null,
    hasKey: Boolean(key),
    source: customUrl ? 'runtime' : (process.env.SUPABASE_URL ? 'env' : 'none')
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = customUrl || process.env.SUPABASE_URL;
  const key = customKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return cachedClient;
  } catch (err) {
    console.error('[Supabase Client Error]:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  tablesFound?: string[];
  message: string;
  url?: string | null;
}> {
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  if (!client) {
    return {
      connected: false,
      message: 'Supabase credentials not configured. Please supply SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      url: null
    };
  }

  const start = Date.now();
  const tablesFound: string[] = [];

  try {
    // 1. Probe tasks table
    const tasksRes = await client.from('tasks').select('id').limit(1);
    if (!tasksRes.error) tablesFound.push('tasks');

    // 2. Probe memories table
    const memRes = await client.from('memories').select('id').limit(1);
    if (!memRes.error) tablesFound.push('memories');

    // 3. Probe user_xp table
    const xpRes = await client.from('user_xp').select('id').limit(1);
    if (!xpRes.error) tablesFound.push('user_xp');

    const latency = Date.now() - start;

    return {
      connected: true,
      latencyMs: latency,
      tablesFound,
      message: tablesFound.length > 0
        ? `Connected to Supabase successfully (${latency}ms). Verified tables: ${tablesFound.join(', ')}.`
        : `Connected to Supabase (${latency}ms), but schema tables are not yet created. Run the 000_full_supabase_schema.sql script in Supabase SQL Editor.`,
      url: config.url
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection failed: ${err.message || 'Network error reaching Supabase'}`,
      url: config.url
    };
  }
}

export async function syncAllToSupabase(): Promise<{
  success: boolean;
  syncedTasks: number;
  syncedMemories: number;
  syncedGamification: boolean;
  message: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      syncedTasks: 0,
      syncedMemories: 0,
      syncedGamification: false,
      message: 'Supabase is not configured yet.'
    };
  }

  let tasksCount = 0;
  let memoriesCount = 0;
  let gamificationDone = false;

  try {
    // 1. Sync Tasks
    const tasks = getAllTasks();
    if (tasks.length > 0) {
      const taskRows = tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        due_date: t.dueDate || null,
        due_time: t.dueTime || null,
        category: t.category,
        status: t.status,
        completed_at: t.completedAt || null
      }));

      const { error: taskErr } = await client.from('tasks').upsert(taskRows);
      if (!taskErr) tasksCount = tasks.length;
    }

    // 2. Sync Memories
    const memories = getAllMemories();
    if (memories.length > 0) {
      const memRows = memories.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        category: m.category,
        importance: m.importance,
        goal_deadline: m.goalDeadline || null,
        linked_task_ids: m.linkedTaskIds || [],
        is_favorite: Boolean(m.isFavorite),
        is_archived: Boolean(m.isArchived),
        tags: m.tags || []
      }));

      const { error: memErr } = await client.from('memories').upsert(memRows);
      if (!memErr) memoriesCount = memories.length;
    }

    // 3. Sync Gamification State
    const profile = getGamificationProfile();
    const { error: xpErr } = await client.from('user_xp').upsert({
      total_xp: profile.totalXp,
      current_level: profile.currentLevel.levelNumber
    });

    const { error: streakErr } = await client.from('productivity_streaks').upsert({
      current_streak: profile.streak.currentStreak,
      longest_streak: profile.streak.longestStreak,
      last_activity_date: profile.streak.lastActivityDate || null,
      weekly_history: profile.streak.weeklyHistory || {},
      daily_goal_targets: profile.streak.dailyGoalTargets || [],
      daily_goal_completed: profile.streak.dailyGoalCompleted
    });

    if (!xpErr && !streakErr) {
      gamificationDone = true;
    }

    return {
      success: true,
      syncedTasks: tasksCount,
      syncedMemories: memoriesCount,
      syncedGamification: gamificationDone,
      message: `Data successfully synchronized with Supabase cloud database: ${tasksCount} tasks, ${memoriesCount} memories, and gamification state.`
    };
  } catch (err: any) {
    console.error('[Supabase Sync Error]:', err);
    return {
      success: false,
      syncedTasks: tasksCount,
      syncedMemories: memoriesCount,
      syncedGamification: gamificationDone,
      message: `Sync partially failed: ${err.message}`
    };
  }
}

export function getFullSqlSchema(): string {
  const schemaPath = path.join(__dirname, '..', 'data', 'migrations', '000_full_supabase_schema.sql');
  if (fs.existsSync(schemaPath)) {
    return fs.readFileSync(schemaPath, 'utf-8');
  }
  return '-- Schema file not found on disk.';
}
