import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Flame,
  Target,
  Shield,
  Award,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Plus,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Brain,
  Lock,
  Unlock,
  Info,
  X,
  Check,
  Layers,
  ListTodo,
  Activity,
  HeartHandshake,
  Star,
  Compass,
  ArrowRight
} from 'lucide-react';

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
  sourceType: string;
  taskId?: string;
  challengeId?: string;
  achievementId?: string;
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
  lastActivityDate: string;
  weeklyHistory: Record<string, number>;
  dailyGoalTargets: string[];
  dailyGoalCompleted: boolean;
}

export interface GamificationProfile {
  totalXp: number;
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  progressPercent: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  streak: ProductivityStreak;
  achievements: Achievement[];
  challenges: ProductivityChallenge[];
  transactions: XpTransaction[];
  focusSessionsCompleted: number;
  totalTasksCompletedCount: number;
  levels: UserLevel[];
}

export interface ProcrastinationDiagnosis {
  stalledTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
    subtasks?: Array<{ title: string; completed: boolean }>;
  }>;
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

interface BeatProcrastinationProps {
  apiBaseUrl?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const BeatProcrastination: React.FC<BeatProcrastinationProps> = ({
  apiBaseUrl = '',
  onNavigateToTab
}) => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [assistance, setAssistance] = useState<ProcrastinationDiagnosis | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Sub-tabs: 'dashboard' | 'assistance' | 'challenges' | 'achievements' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'assistance' | 'challenges' | 'achievements' | 'history'>('dashboard');
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<string>('All');

  // Pomodoro Focus Timer State (25 min = 1500 sec)
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [timerTotalMinutes, setTimerTotalMinutes] = useState<number>(25);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTaskId, setTimerTaskId] = useState<string>('');
  const [timerTaskTitle, setTimerTaskTitle] = useState<string>('');
  const timerIntervalRef = useRef<any>(null);

  // New Challenge Modal State
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState<boolean>(false);
  const [chalTitle, setChalTitle] = useState('');
  const [chalDesc, setChalDesc] = useState('');
  const [chalCategory, setChalCategory] = useState<'daily' | 'weekly'>('weekly');
  const [chalTarget, setChalTarget] = useState<number>(3);
  const [chalXp, setChalXp] = useState<number>(150);

  // Transparent Points Breakdown modal toggle
  const [showPointsGuide, setShowPointsGuide] = useState<boolean>(false);

  const fetchProfileAndData = async () => {
    try {
      setLoading(true);
      const [profRes, assistRes, taskRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/gamification/profile`),
        fetch(`${apiBaseUrl}/api/gamification/procrastination-help`),
        fetch(`${apiBaseUrl}/api/tasks`)
      ]);

      if (profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData);
      }
      if (assistRes.ok) {
        const aData = await assistRes.json();
        setAssistance(aData.assistance);
        if (aData.assistance?.focusSessionSuggestion?.targetTaskId) {
          setTimerTaskId(aData.assistance.focusSessionSuggestion.targetTaskId);
          setTimerTaskTitle(aData.assistance.focusSessionSuggestion.targetTaskTitle);
        }
      }
      if (taskRes.ok) {
        const tData = await taskRes.json();
        setTasks(tData.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  // Timer Tick Handler
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            handleFocusSessionCompleted();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerTotalMinutes, timerTaskId]);

  const handleFocusSessionCompleted = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/gamification/focus-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: timerTotalMinutes, taskId: timerTaskId || undefined })
      });
      const data = await res.json();
      if (data.ok) {
        setActionNotice(`🎉 Focus Session Finished! +${data.xpEarned} XP awarded! ${data.levelUp ? '🏆 LEVEL UP!' : ''}`);
        fetchProfileAndData();
      }
    } catch (err) {
      console.error('Failed to submit focus session:', err);
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = (mins: number = 25) => {
    setIsTimerRunning(false);
    setTimerTotalMinutes(mins);
    setTimerSeconds(mins * 60);
  };

  // Toggle Daily Goal Target
  const handleToggleDailyGoal = async (taskId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/gamification/daily-goal/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      const data = await res.json();
      if (data.ok) {
        setActionNotice(data.isTarget ? '🎯 Added to Daily Goals targets!' : 'Removed from Daily Goals.');
        fetchProfileAndData();
      }
    } catch (err) {
      console.error('Failed to toggle daily goal:', err);
    }
  };

  // Create Custom Challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chalTitle.trim()) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/gamification/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: chalTitle.trim(),
          description: chalDesc.trim(),
          category: chalCategory,
          targetCount: Number(chalTarget),
          xpReward: Number(chalXp)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setIsChallengeModalOpen(false);
        setChalTitle('');
        setChalDesc('');
        setActionNotice(`🚀 Challenge "${data.challenge.title}" initiated!`);
        fetchProfileAndData();
      }
    } catch (err) {
      console.error('Failed to create challenge:', err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Weekly Activity Days
  const getWeeklyDayLabels = () => {
    const days: { label: string; dateYMD: string; count: number }[] = [];
    const pad = (n: number) => n.toString().padStart(2, '0');
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateYMD = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = profile?.streak?.weeklyHistory?.[dateYMD] || 0;
      days.push({ label: dayName, dateYMD, count });
    }
    return days;
  };

  const filteredAchievements = (profile?.achievements || []).filter(a => {
    if (selectedBadgeCategory === 'All') return true;
    return a.category.toLowerCase() === selectedBadgeCategory.toLowerCase();
  });

  return (
    <div className="procrastination-container">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="procrastination-toast">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="toast-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Sub-Navigation */}
      <div className="procrastination-header">
        <div className="header-meta">
          <div className="flex items-center gap-3">
            <div className="icon-halo-amber">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="procrastination-title">Beat Procrastination & Rewards</h1>
              <p className="procrastination-subtitle">
                Neuro-gamified activation engine, Pomodoro focus sprints, and transparent XP progression
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={() => setShowPointsGuide(true)}
            className="btn-secondary"
            title="View XP Calculation Rules"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>XP Rules</span>
          </button>
          <button
            onClick={() => setIsChallengeModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>New Challenge</span>
          </button>
        </div>
      </div>

      {/* Primary HUD: Level, Total XP, Streak, Badges Count */}
      {profile && (
        <div className="gamification-hud-grid">
          {/* Level & Rank */}
          <div className="hud-card level-hud-card">
            <div className="hud-card-header">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="hud-label">Current Rank</span>
              </div>
              <span className="level-badge-pill">Level {profile.currentLevel.levelNumber}</span>
            </div>
            <div className="level-title-row">
              <span className="level-title">{profile.currentLevel.title}</span>
            </div>
            <p className="level-perks">{profile.currentLevel.perksDescription}</p>

            {/* XP Progress Bar */}
            <div className="xp-bar-container">
              <div className="xp-bar-labels">
                <span>{profile.totalXp} XP</span>
                <span>{profile.nextLevel ? `${profile.nextLevel.minXp} XP (Lvl ${profile.nextLevel.levelNumber})` : 'Max Rank'}</span>
              </div>
              <div className="xp-track">
                <div
                  className="xp-fill"
                  style={{ width: `${profile.progressPercent}%` }}
                />
              </div>
              <div className="xp-footer-note">
                {profile.nextLevel ? (
                  <span>{profile.xpNeededForNextLevel} XP needed to reach {profile.nextLevel.title}</span>
                ) : (
                  <span>Maximum Master Rank Achieved!</span>
                )}
              </div>
            </div>
          </div>

          {/* Daily Streak Flame */}
          <div className="hud-card streak-hud-card">
            <div className="hud-card-header">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                <span className="hud-label">Consecutive Streak</span>
              </div>
              <span className="streak-tag">Record: {profile.streak.longestStreak}d</span>
            </div>
            <div className="streak-number-row">
              <span className="streak-number">{profile.streak.currentStreak}</span>
              <span className="streak-unit">Days Active</span>
            </div>
            <p className="streak-desc">
              {profile.streak.currentStreak >= 3
                ? '🔥 Momentum Engine online! Next milestone reward at 7 days.'
                : 'Complete at least 1 task daily to maintain and compound streak bonuses.'}
            </p>
            <div className="streak-milestones-row">
              <div className={`streak-badge-step ${profile.streak.currentStreak >= 3 ? 'active' : ''}`}>
                <span>3 Days</span>
                <span className="step-xp">+100 XP</span>
              </div>
              <div className={`streak-badge-step ${profile.streak.currentStreak >= 7 ? 'active' : ''}`}>
                <span>7 Days</span>
                <span className="step-xp">+250 XP</span>
              </div>
            </div>
          </div>

          {/* Productivity Stats (Completed Tasks & Focus Sessions) */}
          <div className="hud-card stats-hud-card">
            <div className="hud-card-header">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="hud-label">Execution Telemetry</span>
              </div>
              <span className="telemetry-pill">Active</span>
            </div>
            <div className="stats-metric-grid">
              <div className="metric-box">
                <span className="metric-val">{profile.totalTasksCompletedCount}</span>
                <span className="metric-lbl">Tasks Done</span>
              </div>
              <div className="metric-box">
                <span className="metric-val">{profile.focusSessionsCompleted || 0}</span>
                <span className="metric-lbl">Focus Sprints</span>
              </div>
              <div className="metric-box">
                <span className="metric-val">{profile.achievements.filter(a => a.isUnlocked).length}</span>
                <span className="metric-lbl">Badges Won</span>
              </div>
            </div>
            {/* Quick button to Pomodoro sprint */}
            <button
              onClick={() => setActiveSubTab('assistance')}
              className="quick-sprint-btn"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Launch 25-Min Focus Sprint</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="procrastination-subtabs">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`subtab-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Overview & Streaks</span>
        </button>
        <button
          onClick={() => setActiveSubTab('assistance')}
          className={`subtab-btn ${activeSubTab === 'assistance' ? 'active' : ''}`}
        >
          <HeartHandshake className="w-4 h-4 text-emerald-400" />
          <span>Anti-Procrastination Assistant</span>
          {assistance && assistance.stalledTasks.length > 0 && (
            <span className="tab-counter-badge">{assistance.stalledTasks.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('challenges')}
          className={`subtab-btn ${activeSubTab === 'challenges' ? 'active' : ''}`}
        >
          <Target className="w-4 h-4 text-cyan-400" />
          <span>Productivity Challenges</span>
          {profile && (
            <span className="tab-counter-badge">
              {profile.challenges.filter(c => c.status === 'active').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('achievements')}
          className={`subtab-btn ${activeSubTab === 'achievements' ? 'active' : ''}`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Badges & Milestones</span>
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`subtab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
        >
          <Clock className="w-4 h-4 text-purple-400" />
          <span>XP Ledger History</span>
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW & STREAKS ================= */}
      {activeSubTab === 'dashboard' && profile && (
        <div className="tab-content-stack">
          {/* 7-Day Completion Flow */}
          <div className="panel-box">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3 className="panel-title">7-Day Completion Flow</h3>
              </div>
              <span className="panel-hint">Tasks completed across the past week</span>
            </div>
            <div className="weekly-chart-row">
              {getWeeklyDayLabels().map((day, idx) => (
                <div key={idx} className="day-column">
                  <div className="day-bar-wrapper">
                    <div
                      className={`day-bar ${day.count > 0 ? 'filled' : 'empty'}`}
                      style={{ height: `${Math.min(100, Math.max(14, day.count * 25))}%` }}
                    >
                      {day.count > 0 && <span className="day-bar-count">{day.count}</span>}
                    </div>
                  </div>
                  <span className="day-label">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Daily Goal Target Selection */}
          <div className="panel-box">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h3 className="panel-title">Today's Daily Target Commitment</h3>
              </div>
              <span className="reward-tag">+120 XP Daily Goal Bonus</span>
            </div>
            <p className="panel-desc">
              Select up to 3 priority tasks to commit to today. Complete all selected targets to claim the Daily Goal Mastery reward.
            </p>
            <div className="daily-goal-list">
              {tasks.filter(t => t.status !== 'completed').slice(0, 6).map(task => {
                const isSelected = profile.streak.dailyGoalTargets?.includes(task.id);
                return (
                  <div key={task.id} className={`daily-goal-item ${isSelected ? 'selected' : ''}`}>
                    <div className="goal-info">
                      <span className={`priority-indicator priority-${task.priority}`} />
                      <span className="goal-task-title">{task.title}</span>
                      {task.dueDate && <span className="goal-task-date">Due: {task.dueDate}</span>}
                    </div>
                    <button
                      onClick={() => handleToggleDailyGoal(task.id)}
                      className={`goal-toggle-btn ${isSelected ? 'btn-remove' : 'btn-add'}`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Selected
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Commit
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
              {tasks.filter(t => t.status !== 'completed').length === 0 && (
                <div className="empty-state-card">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <p>All active tasks are complete! Great job maintaining peak clarity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ANTI-PROCRASTINATION ASSISTANT ================= */}
      {activeSubTab === 'assistance' && (
        <div className="tab-content-stack">
          {/* Psychological Safety & Encouragement Banner */}
          <div className="encouragement-card">
            <div className="flex items-start gap-3">
              <div className="icon-halo-emerald">
                <HeartHandshake className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="encouragement-title">Zero Shaming & Compassionate Momentum</h3>
                <p className="encouragement-text">
                  {assistance?.encouragingMessage ||
                    "Procrastination is merely an emotional barrier to activation energy, not a character flaw. Let's make starting frictionless."}
                </p>
                {assistance?.productivityTip && (
                  <div className="science-tip-box">
                    <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Science Tip:</strong> {assistance.productivityTip}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Pomodoro Focus Timer & Suggested Micro-Action */}
          <div className="pomodoro-grid">
            {/* Pomodoro Timer */}
            <div className="pomodoro-card">
              <div className="timer-header">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">Pomodoro Focus Sprint</span>
                </div>
                <span className="sprint-xp-tag">+80 XP on Finish</span>
              </div>

              {/* Digital Countdown Display */}
              <div className="timer-display-wrap">
                <div className="timer-digits">{formatTimer(timerSeconds)}</div>
                <div className="timer-progress-track">
                  <div
                    className="timer-progress-fill"
                    style={{ width: `${((timerTotalMinutes * 60 - timerSeconds) / (timerTotalMinutes * 60)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Target Task Indicator */}
              <div className="target-task-indicator">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Sprint Focus:</span>
                <span className="target-task-name">
                  {timerTaskTitle || 'General Deep Work Session'}
                </span>
              </div>

              {/* Controls */}
              <div className="timer-controls">
                <button onClick={toggleTimer} className={`timer-btn-main ${isTimerRunning ? 'btn-pause' : 'btn-play'}`}>
                  {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{isTimerRunning ? 'Pause Sprint' : 'Start Focus Sprint'}</span>
                </button>
                <button onClick={() => resetTimer(25)} className="timer-btn-reset" title="Reset to 25 min">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => resetTimer(5)} className="timer-btn-quick" title="5 Min Micro Sprint">
                  5m Micro
                </button>
              </div>
            </div>

            {/* Recommended 2-Minute Micro-Action */}
            <div className="micro-action-card">
              <div className="micro-header">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-white">Recommended Starting Micro-Action</span>
                </div>
                <span className="activation-pill">Frictionless</span>
              </div>
              <p className="micro-instruction">
                {assistance?.recommendedStartingAction ||
                  'Spend just 3 minutes reviewing the task brief and listing the first 2 atomic steps.'}
              </p>
              <div className="micro-steps-guide">
                <div className="guide-step">
                  <span className="step-num">1</span>
                  <span>Commit to only 2 to 5 minutes of low-effort exploration.</span>
                </div>
                <div className="guide-step">
                  <span className="step-num">2</span>
                  <span>No obligation to finish right now; activation energy will follow.</span>
                </div>
                <div className="guide-step">
                  <span className="step-num">3</span>
                  <span>Stop at 5 minutes if you wish—or let natural flow state take over.</span>
                </div>
              </div>

              {/* Linked Memory Vault Goals */}
              {assistance && assistance.linkedMemoryGoals && assistance.linkedMemoryGoals.length > 0 && (
                <div className="linked-goals-preview">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Anchored Memory Vault Goal
                    </span>
                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('memories')}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        Vault <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {assistance.linkedMemoryGoals.map(g => (
                    <div key={g.id} className="linked-goal-pill">
                      <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{g.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stalled or Overdue Tasks Section */}
          <div className="panel-box">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="panel-title">Tasks Requiring Activation Energy</h3>
              </div>
              <span className="panel-hint">Tasks postponed or overdue without judgment</span>
            </div>

            <div className="stalled-tasks-list">
              {assistance?.stalledTasks && assistance.stalledTasks.length > 0 ? (
                assistance.stalledTasks.map(t => (
                  <div key={t.id} className="stalled-task-row">
                    <div className="stalled-task-info">
                      <span className={`priority-indicator priority-${t.priority}`} />
                      <div>
                        <span className="stalled-title">{t.title}</span>
                        {t.dueDate && <span className="stalled-date">Target: {t.dueDate}</span>}
                      </div>
                    </div>
                    <div className="stalled-task-actions">
                      <button
                        onClick={() => {
                          setTimerTaskId(t.id);
                          setTimerTaskTitle(t.title);
                          resetTimer(25);
                          setActionNotice(`Selected "${t.title}" for Pomodoro Focus Sprint!`);
                        }}
                        className="action-sprint-btn"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Sprint on This</span>
                      </button>
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('tasks')}
                          className="action-view-btn"
                        >
                          Decompose
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-card">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <p>No stalled or overdue tasks detected. Your task execution rhythm is pristine!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PRODUCTIVITY CHALLENGES ================= */}
      {activeSubTab === 'challenges' && profile && (
        <div className="tab-content-stack">
          <div className="challenges-grid">
            {profile.challenges.map(ch => {
              const progressPct = Math.min(100, Math.round((ch.currentCount / ch.targetCount) * 100));
              const isDone = ch.status === 'completed';
              return (
                <div key={ch.id} className={`challenge-card ${isDone ? 'completed-card' : ''}`}>
                  <div className="challenge-card-header">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span className="challenge-category-tag">{ch.category.toUpperCase()}</span>
                    </div>
                    <span className="challenge-reward">+{ch.xpReward} XP</span>
                  </div>
                  <h4 className="challenge-title">{ch.title}</h4>
                  <p className="challenge-desc">{ch.description}</p>

                  {/* Progress Bar */}
                  <div className="challenge-progress-wrap">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{ch.currentCount} / {ch.targetCount} ({progressPct}%)</span>
                    </div>
                    <div className="challenge-track">
                      <div className="challenge-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  <div className="challenge-footer">
                    <span className="challenge-date">Window: {ch.startDate} – {ch.endDate}</span>
                    {isDone ? (
                      <span className="status-badge-done">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="status-badge-active">In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: BADGES & MILESTONES ================= */}
      {activeSubTab === 'achievements' && profile && (
        <div className="tab-content-stack">
          {/* Category Filter Pills */}
          <div className="badge-category-pills">
            {['All', 'Milestones', 'Consistency', 'Focus', 'Mastery'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedBadgeCategory(cat)}
                className={`category-pill ${selectedBadgeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="badges-grid">
            {filteredAchievements.map(ach => (
              <div key={ach.id} className={`badge-card ${ach.isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon-wrap">
                  {ach.isUnlocked ? (
                    <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
                  ) : (
                    <Lock className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="badge-info">
                  <div className="flex items-center justify-between">
                    <span className="badge-category-text">{ach.category}</span>
                    <span className="badge-reward-text">+{ach.xpReward} XP</span>
                  </div>
                  <h4 className="badge-title">{ach.title}</h4>
                  <p className="badge-desc">{ach.description}</p>
                </div>
                <div className="badge-status-footer">
                  {ach.isUnlocked ? (
                    <span className="badge-unlocked-tag">
                      <Check className="w-3.5 h-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="badge-locked-tag">
                      Progress: {ach.currentCount} / {ach.requiredCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: XP LEDGER HISTORY ================= */}
      {activeSubTab === 'history' && profile && (
        <div className="panel-box">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h3 className="panel-title">Idempotent XP Transaction Ledger</h3>
            </div>
            <span className="panel-hint">Total: {profile.transactions.length} entries</span>
          </div>

          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action / Source</th>
                  <th>Type</th>
                  <th>XP Award</th>
                </tr>
              </thead>
              <tbody>
                {profile.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-gray-400 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="font-medium text-white">{tx.reason}</td>
                    <td>
                      <span className="source-tag">{tx.sourceType.replace('_', ' ')}</span>
                    </td>
                    <td className="text-emerald-400 font-bold">+{tx.amount} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {isChallengeModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="modal-title">Create Custom Productivity Challenge</h3>
              </div>
              <button onClick={() => setIsChallengeModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChallenge} className="modal-form">
              <div className="form-group">
                <label>Challenge Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 High-Priority Sprints This Week"
                  value={chalTitle}
                  onChange={e => setChalTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain the purpose and motivation behind this challenge..."
                  value={chalDesc}
                  onChange={e => setChalDesc(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={chalCategory}
                    onChange={e => setChalCategory(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="weekly">Weekly Challenge</option>
                    <option value="daily">Daily Sprint</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Count</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={chalTarget}
                    onChange={e => setChalTarget(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>XP Reward</label>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  step={25}
                  value={chalXp}
                  onChange={e => setChalXp(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsChallengeModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Launch Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transparent Points Rules Modal */}
      {showPointsGuide && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="modal-title">Transparent XP Points System</h3>
              </div>
              <button onClick={() => setShowPointsGuide(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="points-rules-content">
              <p className="text-sm text-gray-300 mb-4">
                Every XP point in JARVIS is deterministically and idempotently awarded. Completed tasks cannot be repeatedly untoggled and toggled to exploit points.
              </p>
              <div className="rule-item-box">
                <span className="font-semibold text-white">Task Completion XP:</span>
                <ul className="rule-list">
                  <li><strong>Urgent Priority:</strong> 120 XP (+30 XP bonus if resolved on or before deadline)</li>
                  <li><strong>High Priority:</strong> 80 XP</li>
                  <li><strong>Medium Priority:</strong> 50 XP</li>
                  <li><strong>Low Priority:</strong> 25 XP</li>
                  <li><strong>Subtasks:</strong> +15 XP per resolved subtask</li>
                </ul>
              </div>
              <div className="rule-item-box">
                <span className="font-semibold text-white">Focus & Streaks:</span>
                <ul className="rule-list">
                  <li><strong>25-Min Pomodoro Session:</strong> 80 XP</li>
                  <li><strong>Daily Goal Target Mastery:</strong> 120 XP upon finishing all committed targets</li>
                  <li><strong>3-Day Consecutive Streak:</strong> +100 XP Milestone</li>
                  <li><strong>7-Day Consecutive Streak:</strong> +250 XP Milestone</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPointsGuide(false)} className="btn-primary">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
