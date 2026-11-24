import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Task, getAllTasks, isTaskOverdue } from './taskDatabase.js';
import { findRelevantGoalsForAssistance } from './memoryVaultDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UserLevel {
  levelNumber: number;
  title: string;
  minXp: number;
  maxXp: number;
  badgeIcon: string;
  perksDescription: string;
}

export interface XpTransaction {
  id: string;
  amount: number;
  reason: string;
  sourceType: 'task_completion' | 'urgent_bonus' | 'subtask_completion' | 'daily_goal' | 'streak_bonus' | 'challenge' | 'achievement' | 'focus_session';
  taskId?: string;
  challengeId?: string;
  achievementId?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: 'Milestones' | 'Consistency' | 'Focus' | 'Mastery';
  xpReward: number;
  requiredCount: number;
  currentCount: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

export interface ProductivityChallenge {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly';
  targetCount: number;
  currentCount: number;
  xpReward: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  completedAt?: string | null;
}

export interface ProductivityStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
  weeklyHistory: Record<string, number>; // date -> completed tasks count
  dailyGoalTargets: string[]; // task IDs selected for today's daily goal
  dailyGoalCompleted: boolean;
}

export interface GamificationState {
  totalXp: number;
  transactions: XpTransaction[];
  streak: ProductivityStreak;
  achievements: Achievement[];
  challenges: ProductivityChallenge[];
  focusSessionsCompleted: number;
  totalTasksCompletedCount: number;
  updatedAt: string;
}

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'gamification_vault.json');

export const USER_LEVELS: UserLevel[] = [
  { levelNumber: 1, title: 'Temporal Initiate', minXp: 0, maxXp: 200, badgeIcon: 'Zap', perksDescription: 'Base operational status. Unlocks core task tracking.' },
  { levelNumber: 2, title: 'Chronos Apprentice', minXp: 201, maxXp: 500, badgeIcon: 'Clock', perksDescription: 'Unlocks weekly challenge creation and micro-action suggestions.' },
  { levelNumber: 3, title: 'Focus Operator', minXp: 501, maxXp: 1000, badgeIcon: 'Target', perksDescription: 'Unlocks 25-minute Pomodoro focus stream and daily goals.' },
  { levelNumber: 4, title: 'Task Vanguard', minXp: 1001, maxXp: 1800, badgeIcon: 'Shield', perksDescription: 'Unlocks deep anti-procrastination behavioral diagnostics.' },
  { levelNumber: 5, title: 'Temporal Strategist', minXp: 1801, maxXp: 3000, badgeIcon: 'Flame', perksDescription: 'Unlocks Memory Vault goal linkage bonuses and streak multipliers.' },
  { levelNumber: 6, title: 'Flow Architect', minXp: 3001, maxXp: 4500, badgeIcon: 'Cpu', perksDescription: 'Unlocks master task decomposition engine and custom challenges.' },
  { levelNumber: 7, title: 'Master of Time', minXp: 4501, maxXp: 999999, badgeIcon: 'Crown', perksDescription: 'Peak productivity mastery. Unlocks executive telemetry reports.' }
];

function getInitialAchievements(): Achievement[] {
  return [
    { id: 'ach_01', code: 'FIRST_JUMP', title: 'First Jump', description: 'Complete your very first task in JARVIS', icon: 'Zap', category: 'Milestones', xpReward: 50, requiredCount: 1, currentCount: 1, isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'ach_02', code: 'TASK_CENTURION', title: 'Task Centurion', description: 'Successfully complete 10 operational tasks', icon: 'CheckCircle', category: 'Milestones', xpReward: 150, requiredCount: 10, currentCount: 2, isUnlocked: false },
    { id: 'ach_03', code: 'CONSISTENCY_ENGINE', title: 'Consistency Engine', description: 'Maintain an active daily completion streak for 3 consecutive days', icon: 'Flame', category: 'Consistency', xpReward: 100, requiredCount: 3, currentCount: 2, isUnlocked: false },
    { id: 'ach_04', code: 'TIME_GUARDIAN', title: 'Time Guardian', description: 'Maintain a stellar 7-day completion streak', icon: 'Shield', category: 'Consistency', xpReward: 250, requiredCount: 7, currentCount: 2, isUnlocked: false },
    { id: 'ach_05', code: 'URGENT_RESOLVER', title: 'Urgent Resolver', description: 'Complete a critical urgent priority task before deadline', icon: 'AlertTriangle', category: 'Focus', xpReward: 100, requiredCount: 1, currentCount: 0, isUnlocked: false },
    { id: 'ach_06', code: 'DECOMPOSITION_PRO', title: 'Decomposition Pro', description: 'Break down a project into subtasks and resolve all steps', icon: 'Layers', category: 'Mastery', xpReward: 120, requiredCount: 1, currentCount: 1, isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'ach_07', code: 'MEMORY_ARCHITECT', title: 'Memory Architect', description: 'Store 3 core project goals in the Memory Vault', icon: 'Brain', category: 'Mastery', xpReward: 100, requiredCount: 3, currentCount: 3, isUnlocked: true, unlockedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'ach_08', code: 'CHALLENGE_CHAMPION', title: 'Challenge Champion', description: 'Conquer and complete a weekly productivity challenge', icon: 'Trophy', category: 'Focus', xpReward: 150, requiredCount: 1, currentCount: 0, isUnlocked: false },
    { id: 'ach_09', code: 'FLOW_STATE', title: 'Flow State Novice', description: 'Complete a 25-minute Pomodoro focus session', icon: 'Target', category: 'Focus', xpReward: 80, requiredCount: 1, currentCount: 0, isUnlocked: false },
    { id: 'ach_10', code: 'DAILY_MASTER', title: 'Daily Goal Master', description: 'Complete all selected daily targets in a single day', icon: 'Award', category: 'Consistency', xpReward: 120, requiredCount: 1, currentCount: 0, isUnlocked: false }
  ];
}

function getInitialChallenges(): ProductivityChallenge[] {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = formatYMD(now);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  const endOfWeekStr = formatYMD(endOfWeek);

  return [
    {
      id: 'chal_01',
      title: 'Sprint: Complete 3 High or Urgent Tasks',
      description: 'Knock out three critical or high-priority items before the week concludes to maintain momentum.',
      category: 'weekly',
      targetCount: 3,
      currentCount: 1,
      xpReward: 150,
      startDate: todayStr,
      endDate: endOfWeekStr,
      status: 'active'
    },
    {
      id: 'chal_02',
      title: 'Flow Master: 2 Focus Sessions',
      description: 'Execute two 25-minute distraction-free focus blocks with the JARVIS Pomodoro timer.',
      category: 'weekly',
      targetCount: 2,
      currentCount: 0,
      xpReward: 120,
      startDate: todayStr,
      endDate: endOfWeekStr,
      status: 'active'
    },
    {
      id: 'chal_03',
      title: 'Daily Triple: Complete 3 Tasks Today',
      description: 'Focus on consistent daily throughput by finishing 3 tasks scheduled for today.',
      category: 'daily',
      targetCount: 3,
      currentCount: 1,
      xpReward: 100,
      startDate: todayStr,
      endDate: todayStr,
      status: 'active'
    }
  ];
}

function getInitialState(): GamificationState {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYMD = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  return {
    totalXp: 320, // starts at Level 2 (Chronos Apprentice)
    transactions: [
      { id: 'tx_seed_01', amount: 50, reason: 'Completed task: Setup cross-device QR code instant pairing gateway', sourceType: 'task_completion', idempotencyKey: 'task_comp_task_sample_05', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'tx_seed_02', amount: 50, reason: 'Unlocked achievement: First Jump', sourceType: 'achievement', idempotencyKey: 'ach_FIRST_JUMP', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'tx_seed_03', amount: 120, reason: 'Unlocked achievement: Decomposition Pro', sourceType: 'achievement', idempotencyKey: 'ach_DECOMPOSITION_PRO', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'tx_seed_04', amount: 100, reason: 'Unlocked achievement: Memory Architect', sourceType: 'achievement', idempotencyKey: 'ach_MEMORY_ARCHITECT', createdAt: new Date(Date.now() - 86400000).toISOString() }
    ],
    streak: {
      currentStreak: 2,
      longestStreak: 4,
      lastActivityDate: yesterdayYMD,
      weeklyHistory: {
        [yesterdayYMD]: 1,
        [todayYMD]: 1
      },
      dailyGoalTargets: ['task_sample_01', 'task_sample_02'],
      dailyGoalCompleted: false
    },
    achievements: getInitialAchievements(),
    challenges: getInitialChallenges(),
    focusSessionsCompleted: 0,
    totalTasksCompletedCount: 2,
    updatedAt: now.toISOString()
  };
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'gamification_vault.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initial = getInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', ...initial }, null, 2), 'utf-8');
  }
}

export function getGamificationState(): GamificationState {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      totalXp: data.totalXp ?? 0,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      streak: data.streak || { currentStreak: 0, longestStreak: 0, lastActivityDate: '', weeklyHistory: {}, dailyGoalTargets: [], dailyGoalCompleted: false },
      achievements: Array.isArray(data.achievements) ? data.achievements : getInitialAchievements(),
      challenges: Array.isArray(data.challenges) ? data.challenges : getInitialChallenges(),
      focusSessionsCompleted: data.focusSessionsCompleted ?? 0,
      totalTasksCompletedCount: data.totalTasksCompletedCount ?? 0,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  } catch (err) {
    console.error('Error reading gamification vault:', err);
    return getInitialState();
  }
}

export function saveGamificationState(state: GamificationState): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving gamification vault:', err);
  }
}

// Compute current level, next level, and progress
export function computeLevelProgress(totalXp: number): {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  progressPercent: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
} {
  let currentLevel = USER_LEVELS[0];
  for (const lvl of USER_LEVELS) {
    if (totalXp >= lvl.minXp) {
      currentLevel = lvl;
    } else {
      break;
    }
  }

  const nextLevel = USER_LEVELS.find(l => l.levelNumber === currentLevel.levelNumber + 1) || null;
  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      xpIntoCurrentLevel: totalXp - currentLevel.minXp,
      xpNeededForNextLevel: 0
    };
  }

  const range = nextLevel.minXp - currentLevel.minXp;
  const currentInRange = totalXp - currentLevel.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpIntoCurrentLevel: currentInRange,
    xpNeededForNextLevel: nextLevel.minXp - totalXp
  };
}

export function getGamificationProfile() {
  const state = getGamificationState();
  const progress = computeLevelProgress(state.totalXp);
  return {
    totalXp: state.totalXp,
    currentLevel: progress.currentLevel,
    nextLevel: progress.nextLevel,
    progressPercent: progress.progressPercent,
    xpIntoCurrentLevel: progress.xpIntoCurrentLevel,
    xpNeededForNextLevel: progress.xpNeededForNextLevel,
    streak: state.streak,
    achievements: state.achievements,
    challenges: state.challenges,
    transactions: state.transactions,
    focusSessionsCompleted: state.focusSessionsCompleted,
    totalTasksCompletedCount: state.totalTasksCompletedCount,
    levels: USER_LEVELS,
    updatedAt: state.updatedAt
  };
}

// Idempotent XP Awarding Core
export function awardXp(
  amount: number,
  reason: string,
  sourceType: XpTransaction['sourceType'],
  idempotencyKey: string,
  meta?: { taskId?: string; challengeId?: string; achievementId?: string }
): { awarded: boolean; transaction: XpTransaction | null; newTotalXp: number; levelUp: boolean } {
  const state = getGamificationState();

  // Check Idempotency Key: if already exists, return early with no duplicate reward!
  const existing = state.transactions.find(t => t.idempotencyKey === idempotencyKey);
  if (existing) {
    return {
      awarded: false,
      transaction: existing,
      newTotalXp: state.totalXp,
      levelUp: false
    };
  }

  const oldLevel = computeLevelProgress(state.totalXp).currentLevel.levelNumber;
  const newTotal = state.totalXp + amount;
  const newLevel = computeLevelProgress(newTotal).currentLevel.levelNumber;
  const levelUp = newLevel > oldLevel;

  const newTx: XpTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    amount,
    reason,
    sourceType,
    taskId: meta?.taskId,
    challengeId: meta?.challengeId,
    achievementId: meta?.achievementId,
    idempotencyKey,
    createdAt: new Date().toISOString()
  };

  state.totalXp = newTotal;
  state.transactions.unshift(newTx);

  saveGamificationState(state);

  return {
    awarded: true,
    transaction: newTx,
    newTotalXp: newTotal,
    levelUp
  };
}

// Update Daily Streak and Weekly History
export function updateStreakOnTaskCompletion(referenceDate: Date = new Date()): ProductivityStreak {
  const state = getGamificationState();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;

  const streak = state.streak;
  if (!streak.weeklyHistory) streak.weeklyHistory = {};
  streak.weeklyHistory[todayYMD] = (streak.weeklyHistory[todayYMD] || 0) + 1;

  if (streak.lastActivityDate === todayYMD) {
    // Already counted today for streak length, just updated count
    saveGamificationState(state);
    return streak;
  }

  // Check if yesterday had activity
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYMD = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  if (streak.lastActivityDate === yesterdayYMD) {
    streak.currentStreak += 1;
  } else if (!streak.lastActivityDate) {
    streak.currentStreak = 1;
  } else {
    // Missed a day
    streak.currentStreak = 1;
  }

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }
  streak.lastActivityDate = todayYMD;

  // Streak Milestones bonuses
  if (streak.currentStreak === 3) {
    awardXp(100, 'Streak Milestone: 3-day consecutive focus streak!', 'streak_bonus', `streak_3_${todayYMD}`);
    unlockAchievementByCode('CONSISTENCY_ENGINE');
  } else if (streak.currentStreak === 7) {
    awardXp(250, 'Streak Milestone: 7-day master consistency streak!', 'streak_bonus', `streak_7_${todayYMD}`);
    unlockAchievementByCode('TIME_GUARDIAN');
  }

  saveGamificationState(state);
  return streak;
}

// Record Task Completion with Transparent Point Calculation
export function recordTaskCompletionGamification(task: Task, referenceDate: Date = new Date()): {
  xpEarned: number;
  breakdown: string[];
  awarded: boolean;
  levelUp: boolean;
  newStreak: number;
} {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;
  const idempotencyKey = `task_comp_${task.id}`;

  const state = getGamificationState();
  const existing = state.transactions.find(t => t.idempotencyKey === idempotencyKey);
  if (existing) {
    return {
      xpEarned: 0,
      breakdown: ['Task already rewarded (prevented duplicate XP)'],
      awarded: false,
      levelUp: false,
      newStreak: state.streak.currentStreak
    };
  }

  // Points Calculation
  let basePoints = 50;
  const breakdown: string[] = [];

  if (task.priority === 'urgent') {
    basePoints = 120;
    breakdown.push('Urgent Priority Task: +120 XP');
    // Check if completed on or before deadline
    if (task.dueDate && task.dueDate >= todayYMD) {
      basePoints += 30;
      breakdown.push('On-Time Execution Bonus: +30 XP');
      unlockAchievementByCode('URGENT_RESOLVER');
    }
  } else if (task.priority === 'high') {
    basePoints = 80;
    breakdown.push('High Priority Task: +80 XP');
  } else if (task.priority === 'medium') {
    basePoints = 50;
    breakdown.push('Medium Priority Task: +50 XP');
  } else {
    basePoints = 25;
    breakdown.push('Low Priority Task: +25 XP');
  }

  // Subtask bonus
  const completedSubs = (task.subtasks || []).filter(s => s.completed).length;
  if (completedSubs > 0) {
    const subXp = completedSubs * 15;
    basePoints += subXp;
    breakdown.push(`${completedSubs} Subtasks Completed: +${subXp} XP`);
  }

  // Award the XP
  const { awarded, levelUp } = awardXp(
    basePoints,
    `Completed task: "${task.title.slice(0, 45)}"`,
    'task_completion',
    idempotencyKey,
    { taskId: task.id }
  );

  // Update streak
  const streak = updateStreakOnTaskCompletion(referenceDate);

  // Update total completed tasks counter on fresh state
  const freshState = getGamificationState();
  freshState.totalTasksCompletedCount = (freshState.totalTasksCompletedCount || 0) + 1;
  saveGamificationState(freshState);

  // Check Milestone Achievements
  unlockAchievementByCode('FIRST_JUMP');
  if (state.totalTasksCompletedCount >= 10) {
    unlockAchievementByCode('TASK_CENTURION');
  }

  // Update active challenges
  progressChallengesOnTaskCompletion(task);

  return {
    xpEarned: basePoints,
    breakdown,
    awarded,
    levelUp,
    newStreak: streak.currentStreak
  };
}

// Progress Challenges
function progressChallengesOnTaskCompletion(task: Task) {
  const state = getGamificationState();
  let stateChanged = false;

  for (const ch of state.challenges) {
    if (ch.status !== 'active') continue;

    // Check challenge match conditions
    if (ch.title.toLowerCase().includes('high or urgent') && (task.priority === 'high' || task.priority === 'urgent')) {
      ch.currentCount += 1;
      stateChanged = true;
    } else if (ch.title.toLowerCase().includes('daily triple')) {
      ch.currentCount += 1;
      stateChanged = true;
    }

    if (ch.currentCount >= ch.targetCount) {
      ch.status = 'completed';
      ch.completedAt = new Date().toISOString();
      awardXp(ch.xpReward, `Completed challenge: "${ch.title}"`, 'challenge', `chal_${ch.id}`, { challengeId: ch.id });
      unlockAchievementByCode('CHALLENGE_CHAMPION');
    }
  }

  if (stateChanged) {
    saveGamificationState(state);
  }
}

// Record Pomodoro Focus Session
export function recordFocusSession(minutes: number, taskId?: string): { xpEarned: number; levelUp: boolean } {
  const state = getGamificationState();
  const reward = Math.round((minutes / 25) * 80); // 80 XP for 25 min

  const txKey = `focus_${Date.now()}`;
  const res = awardXp(reward, `Completed ${minutes}-minute Pomodoro Focus Session`, 'focus_session', txKey, { taskId });

  state.focusSessionsCompleted = (state.focusSessionsCompleted || 0) + 1;
  saveGamificationState(state);

  unlockAchievementByCode('FLOW_STATE');

  // Check challenges matching focus sessions
  for (const ch of state.challenges) {
    if (ch.status === 'active' && ch.title.toLowerCase().includes('focus session')) {
      ch.currentCount += 1;
      if (ch.currentCount >= ch.targetCount) {
        ch.status = 'completed';
        ch.completedAt = new Date().toISOString();
        awardXp(ch.xpReward, `Completed challenge: "${ch.title}"`, 'challenge', `chal_${ch.id}`, { challengeId: ch.id });
      }
      saveGamificationState(state);
    }
  }

  return { xpEarned: reward, levelUp: res.levelUp };
}

// Set / Toggle Daily Goal Target Tasks
export function toggleDailyGoalTarget(taskId: string): { dailyGoalTargets: string[]; isTarget: boolean } {
  const state = getGamificationState();
  const targets = state.streak.dailyGoalTargets || [];
  let nextTargets: string[];
  let isTarget = false;

  if (targets.includes(taskId)) {
    nextTargets = targets.filter(id => id !== taskId);
    isTarget = false;
  } else {
    nextTargets = [...targets, taskId];
    isTarget = true;
  }

  state.streak.dailyGoalTargets = nextTargets;
  saveGamificationState(state);

  return { dailyGoalTargets: nextTargets, isTarget };
}

// Check if all Daily Goals are completed
export function checkDailyGoalsCompletion(): { allCompleted: boolean; rewardAwarded: boolean } {
  const state = getGamificationState();
  const targets = state.streak.dailyGoalTargets || [];
  if (targets.length === 0) return { allCompleted: false, rewardAwarded: false };

  const allTasks = getAllTasks();
  const targetTasks = allTasks.filter(t => targets.includes(t.id));
  const allCompleted = targetTasks.length > 0 && targetTasks.every(t => t.status === 'completed');

  if (allCompleted && !state.streak.dailyGoalCompleted) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    state.streak.dailyGoalCompleted = true;
    saveGamificationState(state);

    const tx = awardXp(120, 'Daily Goal Mastery: Completed all daily targets!', 'daily_goal', `daily_goal_${todayYMD}`);
    unlockAchievementByCode('DAILY_MASTER');
    return { allCompleted: true, rewardAwarded: tx.awarded };
  }

  return { allCompleted, rewardAwarded: false };
}

// Unlock Achievement by Code
export function unlockAchievementByCode(code: string): Achievement | null {
  const state = getGamificationState();
  const ach = state.achievements.find(a => a.code === code);
  if (!ach || ach.isUnlocked) return ach || null;

  ach.isUnlocked = true;
  ach.currentCount = ach.requiredCount;
  ach.unlockedAt = new Date().toISOString();

  saveGamificationState(state);
  awardXp(ach.xpReward, `Unlocked achievement: ${ach.title}`, 'achievement', `ach_${code}`);
  return ach;
}

// Create New Challenge
export function createCustomChallenge(data: Partial<ProductivityChallenge>): ProductivityChallenge {
  const state = getGamificationState();
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const defaultEnd = new Date(now);
  defaultEnd.setDate(defaultEnd.getDate() + 7);
  const endYMD = `${defaultEnd.getFullYear()}-${pad(defaultEnd.getMonth() + 1)}-${pad(defaultEnd.getDate())}`;

  const newChallenge: ProductivityChallenge = {
    id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: (data.title || 'New Productivity Challenge').trim(),
    description: (data.description || 'Focus sprint challenge').trim(),
    category: data.category || 'weekly',
    targetCount: data.targetCount || 3,
    currentCount: 0,
    xpReward: data.xpReward || 150,
    startDate: data.startDate || todayYMD,
    endDate: data.endDate || endYMD,
    status: 'active'
  };

  state.challenges.unshift(newChallenge);
  saveGamificationState(state);
  return newChallenge;
}

// Procrastination Assistance Engine
export interface ProcrastinationDiagnosis {
  stalledTasks: Task[];
  encouragingMessage: string;
  recommendedStartingAction: string;
  focusSessionSuggestion: {
    durationMinutes: number;
    targetTaskId: string;
    targetTaskTitle: string;
    suggestedMicroStep: string;
  };
  linkedMemoryGoals: Array<{ id: string; title: string; category: string }>;
  productivityTip: string;
}

export function generateProcrastinationAssistance(referenceDate: Date = new Date()): ProcrastinationDiagnosis {
  const allTasks = getAllTasks();
  const now = referenceDate;

  // Filter overdue tasks or pending tasks created more than 48h ago
  const overdue = allTasks.filter(t => isTaskOverdue(t, now));
  const aged = allTasks.filter(t => {
    if (t.status !== 'pending' && t.status !== 'in_progress') return false;
    const ageDays = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600 * 24);
    return ageDays >= 2;
  });

  const stalledTasks = Array.from(new Set([...overdue, ...aged]));

  // Primary task to assist with
  const focusTask = stalledTasks[0] || allTasks.find(t => t.status === 'pending' || t.status === 'in_progress') || {
    id: 'general',
    title: 'High-Impact Productivity Sprint',
    description: 'Focused session',
    priority: 'medium',
    subtasks: []
  } as any;

  // Retrieve linked goals from Memory Vault
  const linkedGoals = findRelevantGoalsForAssistance([focusTask.id]).map(m => ({
    id: m.id,
    title: m.title,
    category: m.category
  }));

  // Science-backed non-judgmental encouraging messages
  const encouragingMessages = [
    `It's completely natural to experience friction with complex tasks. Procrastination is simply an emotional barrier to activation energy, not a measure of capability. Let's make starting frictionless.`,
    `Friction always peaks right before starting. Once you cross the 2-minute mark, your brain shifts naturally into momentum. We don't have to finish right now—we just take one bite-sized step.`,
    `Overdue dates are just historical markers, not moral judgments. What matters most is the very next atomic action we choose right now.`
  ];
  const encouragingMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];

  // Formulate a realistic micro-action (2 to 5 minutes)
  let microStep = 'Spend just 3 minutes reading the task brief and listing the first 2 atomic steps.';
  if (focusTask.subtasks && focusTask.subtasks.length > 0) {
    const uncompletedSub = focusTask.subtasks.find((s: any) => !s.completed);
    if (uncompletedSub) {
      microStep = `Work only on subtask: "${uncompletedSub.title}" for 5 minutes. Stop immediately if you wish.`;
    }
  } else if (focusTask.title.toLowerCase().includes('doc') || focusTask.title.toLowerCase().includes('write')) {
    microStep = 'Open your editor and write just 3 bullet points outlining the core thesis. Nothing more.';
  } else if (focusTask.title.toLowerCase().includes('code') || focusTask.title.toLowerCase().includes('dev')) {
    microStep = 'Review the function signature or terminal logs for 3 minutes without writing code yet.';
  }

  const tips = [
    'The 5-Minute Rule: Commit to working on the task for exactly 5 minutes. If you still want to stop after 5 minutes, give yourself permission to step away. 80% of the time, momentum takes over.',
    'Implementation Intentions: Decide in advance: "When I sit down at my desk, I will open the task file before checking messages."',
    'Lower the Activation Energy: Shrink the scope until starting feels almost trivially easy.'
  ];
  const productivityTip = tips[Math.floor(Math.random() * tips.length)];

  return {
    stalledTasks: stalledTasks.slice(0, 5),
    encouragingMessage,
    recommendedStartingAction: microStep,
    focusSessionSuggestion: {
      durationMinutes: 25,
      targetTaskId: focusTask.id,
      targetTaskTitle: focusTask.title,
      suggestedMicroStep: microStep
    },
    linkedMemoryGoals: linkedGoals,
    productivityTip
  };
}
