import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Filter,
  ArrowUpDown,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Check,
  X,
  Layers,
  Zap,
  BarChart3,
  Tag,
  Flame,
  ArrowRight,
  Shield,
  FileText,
  HelpCircle,
  SlidersHorizontal,
  FolderPlus
} from 'lucide-react';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface SubTask {
  id?: string;
  title: string;
  completed: boolean;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  category: string;
  status: TaskStatus;
  subtasks: SubTask[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  source?: 'manual' | 'natural_language' | 'ai_decomposition';
  tags?: string[];
}

export interface TaskAnalytics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  dueSoonTasks: number;
  completionRate: number;
  priorityCounts: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryCounts: Record<string, number>;
}

interface SmartTaskManagerProps {
  apiBaseUrl?: string;
  onNavigateToTab?: (tab: string) => void;
}

export function SmartTaskManager({ apiBaseUrl = (import.meta.env.PROD ? '' : 'http://localhost:4000'), onNavigateToTab }: SmartTaskManagerProps) {
  // Master state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [activeView, setActiveView] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<'all' | TaskPriority>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | TaskStatus>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline_asc' | 'deadline_desc' | 'priority_desc' | 'priority_asc' | 'created_desc'>('priority_desc');

  // AI Command Bar State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<{
    message: string;
    intent: string;
    tasksToCreate?: any[];
    suggestedSubtasks?: any[];
    missingFields?: string[];
  } | null>(null);

  // Modals & Popups
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [dailyBriefing, setDailyBriefing] = useState<{
    summary: string;
    recommendations: string[];
    metrics: any;
  } | null>(null);
  const [showDailyBriefingModal, setShowDailyBriefingModal] = useState<boolean>(false);
  const [decomposeModal, setDecomposeModal] = useState<{
    task: Task;
    loading: boolean;
    subtasks: Array<{ title: string; estimatedMinutes?: number }>;
  } | null>(null);

  // Expanded subtasks accordions
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  // Form State for Manual Task Creation / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formCategory, setFormCategory] = useState('Work');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('pending');
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [formSubtaskInput, setFormSubtaskInput] = useState('');

  // Fetch tasks and analytics from backend
  const fetchTasks = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [resTasks, resAnalytics, resSummary] = await Promise.all([
        fetch(`${apiBaseUrl}/api/tasks`),
        fetch(`${apiBaseUrl}/api/tasks/analytics`),
        fetch(`${apiBaseUrl}/api/tasks/ai/daily-summary`)
      ]);

      if (!resTasks.ok) throw new Error(`Tasks API responded with HTTP ${resTasks.status}`);

      const dataTasks = await resTasks.json();
      if (dataTasks.ok && Array.isArray(dataTasks.tasks)) {
        setTasks(dataTasks.tasks);
      }

      if (resAnalytics.ok) {
        const dataAnalytics = await resAnalytics.json();
        if (dataAnalytics.ok) setAnalytics(dataAnalytics.analytics);
      }

      if (resSummary.ok) {
        const dataSummary = await resSummary.json();
        if (dataSummary.ok) {
          setDailyBriefing({
            summary: dataSummary.summary,
            recommendations: dataSummary.recommendations,
            metrics: dataSummary.metrics
          });
        }
      }
    } catch (err: any) {
      console.warn('Backend sync failed, falling back to local cache:', err);
      setError('Backend offline or unreachable. Operating in local resilient mode.');
      // Fallback to localStorage if available
      try {
        const local = localStorage.getItem('jarvis-tasks-cache');
        if (local) {
          setTasks(JSON.parse(local));
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [apiBaseUrl]);

  // Keep local backup cache
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem('jarvis-tasks-cache', JSON.stringify(tasks));
      } catch {}
    }
  }, [tasks]);

  // Derived categories from tasks list
  const availableCategories = useMemo(() => {
    const set = new Set<string>(['Work', 'Development', 'Documentation', 'Security', 'Design', 'Personal', 'General']);
    tasks.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tasks]);

  // Helpers for deadlines
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const checkIsOverdue = (task: Task): boolean => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (!task.dueDate) return false;
    const dueStr = task.dueTime ? `${task.dueDate}T${task.dueTime}:00` : `${task.dueDate}T23:59:59`;
    return new Date(dueStr).getTime() < now.getTime();
  };

  const checkIsDueToday = (task: Task): boolean => {
    return task.dueDate === todayYMD;
  };

  const checkIsApproaching = (task: Task): boolean => {
    if (task.status === 'completed' || task.status === 'cancelled' || !task.dueDate) return false;
    const dueStr = task.dueTime ? `${task.dueDate}T${task.dueTime}:00` : `${task.dueDate}T23:59:59`;
    const diff = new Date(dueStr).getTime() - now.getTime();
    return diff > 0 && diff <= 48 * 3600 * 1000;
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // 1. View Filter
    if (activeView === 'today') {
      result = result.filter(checkIsDueToday);
    } else if (activeView === 'upcoming') {
      result = result.filter(t => t.dueDate && t.dueDate > todayYMD && t.status !== 'completed' && t.status !== 'cancelled');
    } else if (activeView === 'overdue') {
      result = result.filter(checkIsOverdue);
    } else if (activeView === 'completed') {
      result = result.filter(t => t.status === 'completed');
    }

    // 2. Status Filter
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }

    // 3. Priority Filter
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }

    // 4. Category Filter
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category.toLowerCase() === filterCategory.toLowerCase());
    }

    // 5. Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.subtasks && t.subtasks.some(st => st.title.toLowerCase().includes(q))) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // 6. Sorting
    const priorityWeight: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'priority_desc') {
        const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'priority_asc') {
        const diff = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'deadline_asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeA = a.dueTime ? `${a.dueDate}T${a.dueTime}` : `${a.dueDate}T23:59:59`;
        const timeB = b.dueTime ? `${b.dueDate}T${b.dueTime}` : `${b.dueDate}T23:59:59`;
        return timeA.localeCompare(timeB);
      }
      if (sortBy === 'deadline_desc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeA = a.dueTime ? `${a.dueDate}T${a.dueTime}` : `${a.dueDate}T23:59:59`;
        const timeB = b.dueTime ? `${b.dueDate}T${b.dueTime}` : `${b.dueDate}T23:59:59`;
        return timeB.localeCompare(timeA);
      }
      // default: created_desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tasks, activeView, filterStatus, filterPriority, filterCategory, searchQuery, sortBy]);

  // Compute live local metrics if analytics API is loading
  const liveMetrics = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    tasks.forEach(t => {
      if (t.status === 'pending') pending++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'completed') completed++;
      if (checkIsOverdue(t)) overdue++;
    });

    const activeTotal = tasks.length - tasks.filter(t => t.status === 'cancelled').length;
    const rate = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      overdue,
      rate
    };
  }, [tasks]);

  // Handle Mark Complete toggle
  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic UI update
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : null } : t)));

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks(true);
    } catch (err) {
      console.warn('Failed to update task status on backend:', err);
    }
  };

  // Change Task Status directly
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTasks(true);
    } catch (err) {
      console.warn('Failed to update status:', err);
    }
  };

  // Change Task Priority directly
  const handlePriorityChange = async (task: Task, newPriority: TaskPriority) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, priority: newPriority } : t)));

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      fetchTasks(true);
    } catch (err) {
      console.warn('Failed to update priority:', err);
    }
  };

  // Handle Subtask toggle
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    // Optimistic
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const updatedSubs = (t.subtasks || []).map(st => (st.id === subtaskId ? { ...st, completed: !st.completed } : st));
        return { ...t, subtasks: updatedSubs };
      })
    );

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH'
      });
    } catch (err) {
      console.warn('Failed to toggle subtask:', err);
    }
  };

  // Handle Add Subtask inline on Card
  const handleAddSubtaskInline = async (taskId: string) => {
    const text = (newSubtaskInputs[taskId] || '').trim();
    if (!text) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text })
      });
      const data = await res.json();
      if (data.ok && data.task) {
        setTasks(prev => prev.map(t => (t.id === taskId ? data.task : t)));
      }
      setNewSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
    } catch (err) {
      console.warn('Failed to add subtask:', err);
    }
  };

  // Delete Subtask inline
  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) };
      })
    );

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to delete subtask:', err);
    }
  };

  // Toggle card subtasks accordion
  const toggleAccordion = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Delete Task with confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;
    const targetId = deleteConfirmTask.id;
    setTasks(prev => prev.filter(t => t.id !== targetId));
    setDeleteConfirmTask(null);

    try {
      await fetch(`${apiBaseUrl}/api/tasks/${targetId}`, { method: 'DELETE' });
      fetchTasks(true);
    } catch (err) {
      console.warn('Failed to delete task:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormPriority(task.priority);
    setFormCategory(task.category || 'General');
    setFormDueDate(task.dueDate || '');
    setFormDueTime(task.dueTime || '');
    setFormStatus(task.status);
    setFormSubtasks((task.subtasks || []).map(st => st.title));
    setShowCreateModal(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('medium');
    setFormCategory('Work');
    setFormDueDate('');
    setFormDueTime('');
    setFormStatus('pending');
    setFormSubtasks([]);
    setFormSubtaskInput('');
    setShowCreateModal(true);
  };

  // Save Task (Create or Update)
  const handleSaveFormTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const subtasksPayload = formSubtasks.map((stTitle, i) => ({
      id: `sub_${Date.now()}_${i}`,
      title: stTitle,
      completed: false
    }));

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      priority: formPriority,
      category: formCategory.trim() || 'General',
      dueDate: formDueDate,
      dueTime: formDueTime,
      status: formStatus,
      subtasks: subtasksPayload,
      source: 'manual' as const
    };

    try {
      if (editingTask) {
        // Keep existing subtask completion statuses if preserving
        const existingSubs = editingTask.subtasks || [];
        const mergedSubs = formSubtasks.map((stTitle, i) => {
          const match = existingSubs.find(s => s.title === stTitle);
          return match || { id: `sub_${Date.now()}_${i}`, title: stTitle, completed: false };
        });

        const res = await fetch(`${apiBaseUrl}/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, subtasks: mergedSubs })
        });
        const data = await res.json();
        if (data.ok && data.task) {
          setTasks(prev => prev.map(t => (t.id === editingTask.id ? data.task : t)));
        }
      } else {
        const res = await fetch(`${apiBaseUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok && data.task) {
          setTasks(prev => [data.task, ...prev]);
        }
      }

      setShowCreateModal(false);
      fetchTasks(true);
    } catch (err) {
      console.warn('Failed to save task:', err);
    }
  };

  // Add Subtask to Form list
  const handleAddFormSubtask = () => {
    const val = formSubtaskInput.trim();
    if (val) {
      setFormSubtasks(prev => [...prev, val]);
      setFormSubtaskInput('');
    }
  };

  const handleRemoveFormSubtask = (index: number) => {
    setFormSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  // AI Task Command Execution
  const handleExecuteAiCommand = async (commandText?: string) => {
    const textToRun = (commandText || aiPrompt).trim();
    if (!textToRun) return;

    setAiProcessing(true);
    setAiFeedback(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/ai/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToRun })
      });

      const data = await res.json();
      if (data.ok && data.result) {
        const resObj = data.result;
        setAiFeedback(resObj);

        // If intent is query, highlight or filter
        if (resObj.intent === 'query' && resObj.queryResults) {
          if (textToRun.toLowerCase().includes('urgent')) {
            setActiveView('all');
            setFilterPriority('urgent');
          } else if (textToRun.toLowerCase().includes('overdue')) {
            setActiveView('overdue');
          } else if (textToRun.toLowerCase().includes('today')) {
            setActiveView('today');
          }
        }
      }
    } catch (err) {
      console.warn('AI Task command failed:', err);
      setAiFeedback({
        message: 'Could not contact JARVIS AI Neural Core. Please verify network connectivity.',
        intent: 'clarify'
      });
    } finally {
      setAiProcessing(false);
    }
  };

  // Accept and Save candidate tasks prepared by AI
  const handleAcceptAiCandidates = async () => {
    if (!aiFeedback?.tasksToCreate || aiFeedback.tasksToCreate.length === 0) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: aiFeedback.tasksToCreate })
      });

      const data = await res.json();
      if (data.ok && data.created) {
        setTasks(prev => [...data.created, ...prev]);
        setAiFeedback(null);
        setAiPrompt('');
        fetchTasks(true);
      }
    } catch (err) {
      console.warn('Failed to save AI candidate tasks:', err);
    }
  };

  // Subtask Decomposition for a task
  const handleDecomposeTask = async (task: Task) => {
    setDecomposeModal({ task, loading: true, subtasks: [] });

    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/ai/decompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, title: task.title })
      });

      const data = await res.json();
      if (data.ok && data.suggestedSubtasks) {
        setDecomposeModal({
          task,
          loading: false,
          subtasks: data.suggestedSubtasks
        });
      }
    } catch (err) {
      console.warn('Decomposition failed:', err);
      setDecomposeModal(null);
    }
  };

  // Accept suggested decomposition subtasks
  const handleAcceptDecomposition = async () => {
    if (!decomposeModal || decomposeModal.subtasks.length === 0) return;
    const task = decomposeModal.task;

    const newSubs = decomposeModal.subtasks.map((st, i) => ({
      id: `sub_${Date.now()}_${i}`,
      title: st.title,
      completed: false
    }));

    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtasks: [...(task.subtasks || []), ...newSubs]
        })
      });

      const data = await res.json();
      if (data.ok && data.task) {
        setTasks(prev => prev.map(t => (t.id === task.id ? data.task : t)));
        // Expand accordion
        setExpandedTaskIds(prev => new Set(prev).add(task.id));
      }
    } catch (err) {
      console.warn('Failed to attach decomposed subtasks:', err);
    } finally {
      setDecomposeModal(null);
    }
  };

  return (
    <div className="task-manager-root">
      {/* ========================================================== */}
      {/* 1. TOP HEADER & HUD STATUS DASHBOARD                       */}
      {/* ========================================================== */}
      <div className="task-header-area">
        <div className="task-header-title-row">
          <div>
            <div className="hero-badge" style={{ marginBottom: 6 }}>
              <img src="/jarvis-logo.png" alt="JARVIS Logo" style={{ width: 16, height: 16, borderRadius: '50%' }} />
              <span>JARVIS OS • Intelligent Task Telemetry</span>
            </div>
            <h1 className="task-page-title">Smart Task Manager</h1>
            <p className="task-page-subtitle">
              Intelligent task scheduling, natural-language orchestration, and automated subtask decomposition.
            </p>
          </div>

          <div className="task-header-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowDailyBriefingModal(true)}
              title="View Daily Intelligence Briefing & Priority Recommendations"
            >
              <Sparkles size={16} color="var(--primary)" />
              <span>Daily Briefing</span>
            </button>

            <button
              className="btn-icon"
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              title="Refresh task telemetry"
              style={{ width: 38, height: 38 }}
            >
              <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} />
            </button>

            <button className="btn-primary" onClick={openCreateModal}>
              <Plus size={16} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* HUD TELEMETRY METRIC CARDS (Requirement C) */}
        <div className="task-hud-grid">
          {/* 1. Total Tasks */}
          <div
            className={`task-hud-card ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveView('all'); setFilterStatus('all'); setFilterPriority('all'); }}
          >
            <div className="hud-label-row">
              <span className="hud-label">Total Tasks</span>
              <div className="hud-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--primary)' }}>
                <Layers size={17} />
              </div>
            </div>
            <div className="hud-value">{analytics?.totalTasks ?? liveMetrics.total}</div>
            <div className="hud-subtext">Active vault entries</div>
          </div>

          {/* 2. Pending Tasks */}
          <div
            className={`task-hud-card ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('pending'); setActiveView('all'); }}
          >
            <div className="hud-label-row">
              <span className="hud-label">Pending</span>
              <div className="hud-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="hud-value" style={{ color: '#d97706' }}>
              {analytics?.pendingTasks ?? liveMetrics.pending}
            </div>
            <div className="hud-subtext">Awaiting execution</div>
          </div>

          {/* 3. In Progress */}
          <div
            className={`task-hud-card ${filterStatus === 'in_progress' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('in_progress'); setActiveView('all'); }}
          >
            <div className="hud-label-row">
              <span className="hud-label">In Progress</span>
              <div className="hud-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb' }}>
                <Zap size={17} />
              </div>
            </div>
            <div className="hud-value" style={{ color: '#2563eb' }}>
              {analytics?.inProgressTasks ?? liveMetrics.inProgress}
            </div>
            <div className="hud-subtext">Under active work</div>
          </div>

          {/* 4. Completed Tasks */}
          <div
            className={`task-hud-card ${activeView === 'completed' || filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => { setActiveView('completed'); setFilterStatus('all'); }}
          >
            <div className="hud-label-row">
              <span className="hud-label">Completed</span>
              <div className="hud-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                <CheckCircle size={17} />
              </div>
            </div>
            <div className="hud-value" style={{ color: '#059669' }}>
              {analytics?.completedTasks ?? liveMetrics.completed}
            </div>
            <div className="hud-subtext">
              {analytics?.completionRate ?? liveMetrics.rate}% completion velocity
            </div>
          </div>

          {/* 5. Overdue Tasks */}
          <div
            className={`task-hud-card overdue-pulse ${activeView === 'overdue' ? 'active' : ''}`}
            onClick={() => { setActiveView('overdue'); setFilterStatus('all'); setFilterPriority('all'); }}
          >
            <div className="hud-label-row">
              <span className="hud-label" style={{ color: '#e11d48' }}>Overdue Tasks</span>
              <div className="hud-icon-wrap" style={{ background: 'rgba(225, 29, 72, 0.15)', color: '#e11d48' }}>
                <AlertTriangle size={17} />
              </div>
            </div>
            <div className="hud-value" style={{ color: '#e11d48' }}>
              {analytics?.overdueTasks ?? liveMetrics.overdue}
            </div>
            <div className="hud-subtext" style={{ color: '#e11d48' }}>
              {(analytics?.overdueTasks ?? liveMetrics.overdue) > 0 ? 'Action required immediately' : 'Zero overdue items'}
            </div>
          </div>
        </div>

        {/* PRIORITY RECOMMENDATION BANNER (Requirement E) */}
        {dailyBriefing?.recommendations && dailyBriefing.recommendations.length > 0 && (
          <div className="task-recommendation-banner">
            <div className="banner-left">
              <Flame size={18} className="pulse-icon" style={{ color: '#f59e0b' }} />
              <div>
                <strong>JARVIS Focus Recommendation:</strong>{' '}
                <span>{dailyBriefing.recommendations[0]}</span>
              </div>
            </div>
            {dailyBriefing.recommendations.length > 1 && (
              <button
                className="banner-more-btn"
                onClick={() => setShowDailyBriefingModal(true)}
              >
                +{dailyBriefing.recommendations.length - 1} more insights
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 2. SMART TASK INTELLIGENCE CONSOLE (Requirement D)         */}
      {/* ========================================================== */}
      <div className="task-ai-command-container">
        <div className="task-ai-command-box">
          <div className="ai-input-wrapper">
            <Sparkles size={18} className="ai-input-sparkle" />
            <input
              type="text"
              className="ai-task-input"
              placeholder="Enter natural-language request (e.g. 'Complete my project documentation by Friday' or 'Create three tasks for hackathon presentation')"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleExecuteAiCommand();
                }
              }}
            />
            <button
              className="ai-execute-btn"
              onClick={() => handleExecuteAiCommand()}
              disabled={aiProcessing || !aiPrompt.trim()}
            >
              {aiProcessing ? (
                <>
                  <RefreshCw size={14} className="spin-anim" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Run Command</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="task-prompt-chips">
            <span className="chips-label">Quick Prompts:</span>
            <button
              className="prompt-chip"
              onClick={() => {
                setAiPrompt('Complete my project documentation by Friday.');
                handleExecuteAiCommand('Complete my project documentation by Friday.');
              }}
            >
              "Complete my project documentation by Friday"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                setAiPrompt('Create three tasks for preparing my hackathon presentation.');
                handleExecuteAiCommand('Create three tasks for preparing my hackathon presentation.');
              }}
            >
              "Create three tasks for preparing hackathon"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                setAiPrompt('Show me my most urgent pending tasks.');
                handleExecuteAiCommand('Show me my most urgent pending tasks.');
              }}
            >
              "Show me my most urgent pending tasks"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                setAiPrompt('Break my project into smaller tasks.');
                handleExecuteAiCommand('Break my project into smaller tasks.');
              }}
            >
              "Break my project into smaller tasks"
            </button>
          </div>
        </div>

        {/* AI FEEDBACK & CANDIDATE CONFIRMATION PREVIEW CARD (Requirement D) */}
        {aiFeedback && (
          <div className="task-ai-preview-card">
            <div className="preview-card-header">
              <div className="preview-header-left">
                <Sparkles size={16} color="var(--primary)" />
                <strong>JARVIS Neural Response</strong>
                <span className="intent-badge">{aiFeedback.intent}</span>
              </div>
              <button
                className="btn-icon"
                onClick={() => setAiFeedback(null)}
                style={{ width: 26, height: 26 }}
              >
                <X size={14} />
              </button>
            </div>

            <p className="preview-explanation">{aiFeedback.message}</p>

            {/* Candidate tasks prepared for user confirmation */}
            {aiFeedback.tasksToCreate && aiFeedback.tasksToCreate.length > 0 && (
              <div className="candidate-tasks-container">
                <div className="candidate-list-label">
                  Prepared Tasks ({aiFeedback.tasksToCreate.length}):
                </div>
                <div className="candidate-cards-grid">
                  {aiFeedback.tasksToCreate.map((taskCand, idx) => (
                    <div key={idx} className="candidate-task-pill">
                      <div className="cand-top-row">
                        <span className={`priority-tag priority-${taskCand.priority}`}>
                          {taskCand.priority.toUpperCase()}
                        </span>
                        <span className="cand-cat">{taskCand.category}</span>
                        {taskCand.dueDate ? (
                          <span className="cand-date">
                            <Calendar size={12} /> {taskCand.dueDate}
                          </span>
                        ) : (
                          <span className="cand-date open">No deadline set</span>
                        )}
                      </div>
                      <div className="cand-title">{taskCand.title}</div>
                      {taskCand.description && (
                        <div className="cand-desc">{taskCand.description}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Confirmation Actions */}
                <div className="candidate-actions-row">
                  <button className="btn-primary" onClick={handleAcceptAiCandidates}>
                    <Check size={16} />
                    <span>Confirm & Save Tasks to Vault</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      // Open first candidate in edit modal for manual tweaking
                      const first = aiFeedback.tasksToCreate![0];
                      setFormTitle(first.title);
                      setFormDescription(first.description || '');
                      setFormPriority(first.priority || 'medium');
                      setFormCategory(first.category || 'General');
                      setFormDueDate(first.dueDate || '');
                      setFormDueTime(first.dueTime || '');
                      setFormStatus('pending');
                      setFormSubtasks([]);
                      setShowCreateModal(true);
                      setAiFeedback(null);
                    }}
                  >
                    <Edit2 size={15} />
                    <span>Adjust Details Manually</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setAiFeedback(null)}
                    style={{ color: '#ef4444' }}
                  >
                    <span>Discard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Suggested subtasks decomposition */}
            {aiFeedback.suggestedSubtasks && aiFeedback.suggestedSubtasks.length > 0 && (
              <div className="decomposition-preview-box">
                <div className="candidate-list-label">Proposed Modular Subtasks:</div>
                <ul className="decomp-subtasks-list">
                  {aiFeedback.suggestedSubtasks.map((st, i) => (
                    <li key={i}>
                      <span className="st-num">{i + 1}.</span>
                      <span className="st-title">{st.title}</span>
                      {st.estimatedMinutes && (
                        <span className="st-time">~{st.estimatedMinutes}m</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 3. TOOLBAR: VIEWS, SEARCH, FILTERS & SORTING (Req B & C)   */}
      {/* ========================================================== */}
      <div className="task-toolbar">
        {/* Navigation Tabs (Views: All, Today, Upcoming, Overdue, Completed) */}
        <div className="task-view-tabs">
          <button
            className={`view-tab-btn ${activeView === 'all' && filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveView('all'); setFilterStatus('all'); }}
          >
            All Tasks
            <span className="tab-count">{tasks.length}</span>
          </button>

          <button
            className={`view-tab-btn ${activeView === 'today' ? 'active' : ''}`}
            onClick={() => { setActiveView('today'); setFilterStatus('all'); }}
          >
            Today's Tasks
            <span className="tab-count">
              {tasks.filter(checkIsDueToday).length}
            </span>
          </button>

          <button
            className={`view-tab-btn ${activeView === 'upcoming' ? 'active' : ''}`}
            onClick={() => { setActiveView('upcoming'); setFilterStatus('all'); }}
          >
            Upcoming
            <span className="tab-count">
              {tasks.filter(t => t.dueDate && t.dueDate > todayYMD && t.status !== 'completed').length}
            </span>
          </button>

          <button
            className={`view-tab-btn overdue-tab ${activeView === 'overdue' ? 'active' : ''}`}
            onClick={() => { setActiveView('overdue'); setFilterStatus('all'); }}
          >
            Overdue
            <span className="tab-count danger">
              {tasks.filter(checkIsOverdue).length}
            </span>
          </button>

          <button
            className={`view-tab-btn ${activeView === 'completed' || filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => { setActiveView('completed'); setFilterStatus('all'); }}
          >
            Completed
            <span className="tab-count">
              {tasks.filter(t => t.status === 'completed').length}
            </span>
          </button>
        </div>

        {/* Filter controls row */}
        <div className="task-filters-row">
          {/* Live Search */}
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title, description, category, tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="task-search-input"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="filter-select-wrap">
            <Filter size={14} className="select-icon" />
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as any)}
              className="task-select"
            >
              <option value="all">Priority: All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="task-select"
            >
              <option value="all">Status: All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-select-wrap">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="task-select"
            >
              <option value="all">Category: All</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-select-wrap">
            <ArrowUpDown size={14} className="select-icon" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="task-select"
            >
              <option value="priority_desc">Sort: Highest Priority</option>
              <option value="priority_asc">Sort: Lowest Priority</option>
              <option value="deadline_asc">Sort: Earliest Deadline</option>
              <option value="deadline_desc">Sort: Latest Deadline</option>
              <option value="created_desc">Sort: Recently Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 4. TASK CARDS LISTING & SUBTASK ACCORDIONS (Req B & C)     */}
      {/* ========================================================== */}
      <div className="task-content-area">
        {loading ? (
          <div className="task-empty-state">
            <RefreshCw size={28} className="spin-anim" style={{ color: 'var(--primary)', marginBottom: 12 }} />
            <p>Querying JARVIS Task Vault...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="task-empty-state">
            <div className="empty-icon-ring">
              <CheckSquare size={32} color="var(--primary)" />
            </div>
            <h3>No tasks match your criteria</h3>
            <p>
              {searchQuery || filterPriority !== 'all' || filterStatus !== 'all' || filterCategory !== 'all'
                ? 'Try resetting your search query or adjusting your filters.'
                : 'All tasks completed or none recorded in this view. Use the console above or click "+ New Task" to start.'}
            </p>
            {(searchQuery || filterPriority !== 'all' || filterStatus !== 'all' || filterCategory !== 'all') && (
              <button
                className="btn-secondary"
                style={{ marginTop: 14 }}
                onClick={() => {
                  setSearchQuery('');
                  setFilterPriority('all');
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setActiveView('all');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="task-cards-list">
            {filteredTasks.map(task => {
              const isOverdue = checkIsOverdue(task);
              const isDueToday = checkIsDueToday(task);
              const isApproaching = checkIsApproaching(task);
              const isExpanded = expandedTaskIds.has(task.id);
              const subtasks = task.subtasks || [];
              const completedSubtasks = subtasks.filter(st => st.completed).length;
              const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

              return (
                <div
                  key={task.id}
                  className={`task-card ${task.status === 'completed' ? 'task-completed' : ''} ${isOverdue ? 'card-overdue' : ''}`}
                >
                  {/* Task Card Header Row */}
                  <div className="task-card-main-row">
                    {/* Checkbox toggle completed */}
                    <button
                      className="task-checkbox-btn"
                      onClick={() => handleToggleComplete(task)}
                      title={task.status === 'completed' ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {task.status === 'completed' ? (
                        <CheckSquare size={20} className="check-icon-active" />
                      ) : (
                        <Square size={20} className="check-icon-idle" />
                      )}
                    </button>

                    {/* Title & Description */}
                    <div className="task-card-info">
                      <div className="task-card-title-row">
                        <span className={`task-title ${task.status === 'completed' ? 'title-struck' : ''}`}>
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        <div className="priority-pill-wrap">
                          <select
                            value={task.priority}
                            onChange={e => handlePriorityChange(task, e.target.value as TaskPriority)}
                            className={`priority-select priority-${task.priority}`}
                            title="Click to change priority"
                          >
                            <option value="urgent">🔴 URGENT</option>
                            <option value="high">🟠 HIGH</option>
                            <option value="medium">🟣 MEDIUM</option>
                            <option value="low">🟢 LOW</option>
                          </select>
                        </div>

                        {/* Status Select */}
                        <div className="status-pill-wrap">
                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task, e.target.value as TaskStatus)}
                            className={`status-select status-${task.status}`}
                            title="Click to change status"
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="in_progress">⚡ In Progress</option>
                            <option value="completed">✓ Completed</option>
                            <option value="cancelled">✕ Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {task.description && (
                        <p className="task-card-desc">{task.description}</p>
                      )}

                      {/* Meta Tags Row: Category, Due Date, Subtask Count */}
                      <div className="task-meta-row">
                        <span className="meta-tag category-tag">
                          <Tag size={12} /> {task.category}
                        </span>

                        {/* Deadline indicator */}
                        {task.dueDate ? (
                          <span
                            className={`meta-tag deadline-tag ${
                              isOverdue ? 'tag-overdue' : isDueToday ? 'tag-today' : isApproaching ? 'tag-approaching' : ''
                            }`}
                          >
                            <Calendar size={12} />
                            {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ''}
                            {isOverdue && ' (Overdue!)'}
                            {isDueToday && ' (Due Today)'}
                            {isApproaching && ' (Approaching)'}
                          </span>
                        ) : (
                          <span className="meta-tag no-deadline-tag">
                            <Clock size={12} /> No deadline
                          </span>
                        )}

                        {/* Subtasks summary badge */}
                        {subtasks.length > 0 && (
                          <button
                            className="meta-tag subtasks-toggle-tag"
                            onClick={() => toggleAccordion(task.id)}
                            title="Expand / collapse subtasks"
                          >
                            <CheckSquare size={12} />
                            <span>
                              Subtasks: {completedSubtasks}/{subtasks.length} ({subtaskProgress}%)
                            </span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>

                      {/* Subtask progress bar */}
                      {subtasks.length > 0 && (
                        <div className="subtask-progress-track">
                          <div
                            className="subtask-progress-fill"
                            style={{
                              width: `${subtaskProgress}%`,
                              background: subtaskProgress === 100 ? '#10b981' : 'var(--primary)'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Card Actions (Decompose, Edit, Delete) */}
                    <div className="task-card-actions">
                      <button
                        className="btn-icon task-action-btn ai-decompose-btn"
                        onClick={() => handleDecomposeTask(task)}
                        title="AI Subtask Decomposition: Break this task into smaller steps"
                      >
                        <Sparkles size={15} color="var(--primary)" />
                      </button>

                      <button
                        className="btn-icon task-action-btn"
                        onClick={() => openEditModal(task)}
                        title="Edit task details"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        className="btn-icon task-action-btn delete-btn"
                        onClick={() => setDeleteConfirmTask(task)}
                        title="Delete task with confirmation"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </button>
                    </div>
                  </div>

                  {/* ========================================================== */}
                  {/* SUBTASKS ACCORDION AREA                                    */}
                  {/* ========================================================== */}
                  {isExpanded && (
                    <div className="task-subtasks-accordion">
                      <div className="subtasks-list">
                        {subtasks.map(st => (
                          <div key={st.id} className="subtask-item-row">
                            <button
                              className="subtask-checkbox"
                              onClick={() => handleToggleSubtask(task.id, st.id!)}
                            >
                              {st.completed ? (
                                <CheckSquare size={16} className="check-icon-active" />
                              ) : (
                                <Square size={16} className="check-icon-idle" />
                              )}
                            </button>
                            <span className={`subtask-text ${st.completed ? 'title-struck' : ''}`}>
                              {st.title}
                            </span>
                            <button
                              className="btn-icon subtask-del-btn"
                              onClick={() => handleDeleteSubtask(task.id, st.id!)}
                              title="Delete subtask"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Inline Add Subtask input */}
                      <div className="add-subtask-inline-row">
                        <input
                          type="text"
                          placeholder="Add a new subtask..."
                          className="inline-subtask-input"
                          value={newSubtaskInputs[task.id] || ''}
                          onChange={e =>
                            setNewSubtaskInputs({ ...newSubtaskInputs, [task.id]: e.target.value })
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubtaskInline(task.id);
                            }
                          }}
                        />
                        <button
                          className="btn-secondary add-subtask-btn"
                          onClick={() => handleAddSubtaskInline(task.id)}
                          disabled={!newSubtaskInputs[task.id]?.trim()}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 5. MODAL: CREATE OR EDIT TASK (Requirement A & B)          */}
      {/* ========================================================== */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box task-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button
                className="btn-icon"
                onClick={() => setShowCreateModal(false)}
                style={{ width: 30, height: 30 }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFormTask} className="task-form">
              {/* Task Title */}
              <div className="form-group">
                <label className="form-label">
                  Task Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete quarterly security compliance report"
                  className="form-input"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Optional details, acceptance criteria, or reference notes"
                  className="form-textarea"
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                />
              </div>

              {/* Priority & Status Row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as TaskPriority)}
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟣 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as TaskStatus)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Category, Due Date, Due Time */}
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    list="categories-datalist"
                    placeholder="e.g. Work, Dev..."
                    className="form-input"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                  />
                  <datalist id="categories-datalist">
                    {availableCategories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formDueTime}
                    onChange={e => setFormDueTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Subtasks Builder */}
              <div className="form-group">
                <label className="form-label">Subtasks (Optional)</label>
                <div className="subtask-builder-input-row">
                  <input
                    type="text"
                    placeholder="Add a subtask step..."
                    className="form-input"
                    value={formSubtaskInput}
                    onChange={e => setFormSubtaskInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFormSubtask();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddFormSubtask}
                    disabled={!formSubtaskInput.trim()}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>

                {formSubtasks.length > 0 && (
                  <div className="builder-subtask-pills">
                    {formSubtasks.map((st, idx) => (
                      <div key={idx} className="builder-subtask-pill">
                        <span>{idx + 1}. {st}</span>
                        <button
                          type="button"
                          className="pill-del-btn"
                          onClick={() => handleRemoveFormSubtask(idx)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} />
                  <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. MODAL: DELETE CONFIRMATION (Requirement B)              */}
      {/* ========================================================== */}
      {deleteConfirmTask && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmTask(null)}>
          <div className="modal-box delete-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="delete-icon-wrap">
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3>Delete Task Confirmation</h3>
            <p>
              Are you sure you want to permanently delete task{' '}
              <strong>"{deleteConfirmTask.title}"</strong>? All associated subtasks and telemetry will be removed.
            </p>
            <div className="modal-actions-row" style={{ marginTop: 20 }}>
              <button
                className="btn-secondary"
                onClick={() => setDeleteConfirmTask(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: '#ef4444', borderColor: '#dc2626' }}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={16} />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 7. MODAL: DAILY INTELLIGENCE BRIEFING (Requirement E)      */}
      {/* ========================================================== */}
      {showDailyBriefingModal && (
        <div className="modal-overlay" onClick={() => setShowDailyBriefingModal(false)}>
          <div className="modal-box briefing-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color="var(--primary)" />
                <h3>JARVIS Daily Executive Briefing</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setShowDailyBriefingModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="briefing-content">
              <div className="briefing-summary-card">
                <h4>Executive Workload Synthesis</h4>
                <p>{dailyBriefing?.summary || 'Analyzing current workload velocity...'}</p>
              </div>

              <h4>Priority Focus & Risk Recommendations</h4>
              <div className="briefing-recommendations-list">
                {dailyBriefing?.recommendations && dailyBriefing.recommendations.map((rec, i) => (
                  <div key={i} className="rec-card">
                    <Flame size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>

              <h4>Vault Statistics Breakdown</h4>
              <div className="briefing-metrics-grid">
                <div className="briefing-metric-item">
                  <span className="bm-label">Urgent Items</span>
                  <span className="bm-val" style={{ color: '#ef4444' }}>
                    {dailyBriefing?.metrics?.urgentCount ?? 0}
                  </span>
                </div>
                <div className="briefing-metric-item">
                  <span className="bm-label">Overdue</span>
                  <span className="bm-val" style={{ color: '#f59e0b' }}>
                    {dailyBriefing?.metrics?.overdueCount ?? 0}
                  </span>
                </div>
                <div className="briefing-metric-item">
                  <span className="bm-label">Due Today</span>
                  <span className="bm-val" style={{ color: '#2563eb' }}>
                    {dailyBriefing?.metrics?.dueTodayCount ?? 0}
                  </span>
                </div>
                <div className="briefing-metric-item">
                  <span className="bm-label">Completion Velocity</span>
                  <span className="bm-val" style={{ color: '#10b981' }}>
                    {dailyBriefing?.metrics?.completionRate ?? 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions-row" style={{ marginTop: 20 }}>
              <button
                className="btn-primary"
                onClick={() => setShowDailyBriefingModal(false)}
              >
                Dismiss Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 8. MODAL: AI SUBTASK DECOMPOSITION (Requirement E)         */}
      {/* ========================================================== */}
      {decomposeModal && (
        <div className="modal-overlay" onClick={() => setDecomposeModal(null)}>
          <div className="modal-box decomp-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color="var(--primary)" />
                <h3>JARVIS Subtask Decomposition</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setDecomposeModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="decomp-target-info">
              <span className="decomp-label">Target Task:</span>
              <strong>{decomposeModal.task.title}</strong>
            </div>

            {decomposeModal.loading ? (
              <div className="decomp-loading">
                <RefreshCw size={24} className="spin-anim" style={{ color: 'var(--primary)' }} />
                <p>Generating structured subtasks using intelligent task decomposition...</p>
              </div>
            ) : (
              <div>
                <p className="decomp-instructions">
                  JARVIS has synthesized the following modular, actionable steps to maximize execution velocity:
                </p>
                <div className="decomp-suggestions-list">
                  {decomposeModal.subtasks.map((st, idx) => (
                    <div key={idx} className="decomp-step-pill">
                      <span className="step-idx">{idx + 1}</span>
                      <span className="step-title">{st.title}</span>
                      {st.estimatedMinutes && (
                        <span className="step-time">~{st.estimatedMinutes}m</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="modal-actions-row" style={{ marginTop: 22 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setDecomposeModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleAcceptDecomposition}
                  >
                    <Check size={16} />
                    <span>Accept & Attach {decomposeModal.subtasks.length} Subtasks</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
