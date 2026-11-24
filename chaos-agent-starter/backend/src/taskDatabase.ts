import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  dueDate: string; // YYYY-MM-DD or ''
  dueTime: string; // HH:mm or ''
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
  completionRate: number; // 0 - 100
  priorityCounts: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryCounts: Record<string, number>;
}

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'tasks_vault.json');

// Default initial tasks matching real JARVIS scenarios if vault is brand new
function getInitialTasks(): Task[] {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  // Format dates relative to now
  const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const todayStr = formatYMD(now);
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);
  
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = formatYMD(in3Days);
  
  const in5Days = new Date(now);
  in5Days.setDate(in5Days.getDate() + 5);
  const in5DaysStr = formatYMD(in5Days);

  return [
    {
      id: 'task_sample_01',
      title: 'Complete autonomous agent architecture documentation',
      description: 'Finalize multi-step pipeline specifications, failure-recovery diagrams, and API endpoints.',
      priority: 'urgent',
      dueDate: todayStr,
      dueTime: '17:00',
      category: 'Documentation',
      status: 'in_progress',
      subtasks: [
        { id: 'sub_01_1', title: 'Document cross-device PWA synchronization protocol', completed: true },
        { id: 'sub_01_2', title: 'Detail self-healing anomaly detection algorithms', completed: true },
        { id: 'sub_01_3', title: 'Add OpenAPI specifications for smart task routes', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
      tags: ['architecture', 'specs']
    },
    {
      id: 'task_sample_02',
      title: 'Prepare hackathon slide deck and live demo script',
      description: 'Structure 3-minute executive pitch covering JARVIS autonomous time-traveller agent capabilities.',
      priority: 'high',
      dueDate: in3DaysStr,
      dueTime: '11:00',
      category: 'Work',
      status: 'pending',
      subtasks: [
        { id: 'sub_02_1', title: 'Draft hook and mission statement', completed: false },
        { id: 'sub_02_2', title: 'Record 45-second offline recovery demo video', completed: false },
        { id: 'sub_02_3', title: 'Prepare interactive Q&A response cards', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'natural_language',
      tags: ['pitch', 'hackathon']
    },
    {
      id: 'task_sample_03',
      title: 'Submit quarterly security audit report',
      description: 'Audit citation integrity checks, human-in-the-loop email gates, and API key protection.',
      priority: 'urgent',
      dueDate: yesterdayStr,
      dueTime: '18:00',
      category: 'Security',
      status: 'pending',
      subtasks: [
        { id: 'sub_03_1', title: 'Run penetration tests on backend endpoints', completed: true },
        { id: 'sub_03_2', title: 'Export PDF security compliance audit certificate', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
      tags: ['security', 'compliance']
    },
    {
      id: 'task_sample_04',
      title: 'Test WebGL neural voice sphere shader on mobile devices',
      description: 'Verify 60fps frame rate and audio frequency telemetry across iOS and Android browsers.',
      priority: 'medium',
      dueDate: in5DaysStr,
      dueTime: '15:30',
      category: 'Development',
      status: 'in_progress',
      subtasks: [
        { id: 'sub_04_1', title: 'Profile GPU memory allocation in Chrome DevTools', completed: true },
        { id: 'sub_04_2', title: 'Verify Web Audio API microphone permissions flow', completed: false }
      ],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
      tags: ['mobile', 'webgl']
    },
    {
      id: 'task_sample_05',
      title: 'Setup cross-device QR code instant pairing gateway',
      description: 'Implement geometric SVG QR code generator with embedded cybernetic logo for mobile handover.',
      priority: 'low',
      dueDate: '',
      dueTime: '',
      category: 'Development',
      status: 'completed',
      subtasks: [
        { id: 'sub_05_1', title: 'Generate high-contrast SVG matrix', completed: true },
        { id: 'sub_05_2', title: 'Test LAN IP resolution', completed: true }
      ],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'manual',
      tags: ['pwa', 'sync']
    }
  ];
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'tasks_vault.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initialTasks = getInitialTasks();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', updatedAt: new Date().toISOString(), tasks: initialTasks }, null, 2), 'utf-8');
  }
}

export function getAllTasks(): Task[] {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.tasks) ? data.tasks : [];
  } catch (err) {
    console.error('Error reading tasks vault database:', err);
    return [];
  }
}

export function saveAllTasks(tasks: Task[]): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', updatedAt: new Date().toISOString(), tasks }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving tasks vault database:', err);
  }
}

export function getTaskById(id: string): Task | null {
  const tasks = getAllTasks();
  return tasks.find(t => t.id === id) || null;
}

export function createTask(taskData: Partial<Task>): Task {
  const tasks = getAllTasks();
  const now = new Date().toISOString();
  
  const newTask: Task = {
    id: taskData.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: (taskData.title || '').trim(),
    description: (taskData.description || '').trim(),
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || '',
    dueTime: taskData.dueTime || '',
    category: (taskData.category || 'General').trim(),
    status: taskData.status || 'pending',
    subtasks: Array.isArray(taskData.subtasks)
      ? taskData.subtasks.map((st, i) => ({
          id: st.id || `sub_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          title: st.title,
          completed: Boolean(st.completed),
          createdAt: st.createdAt || now
        }))
      : [],
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    completedAt: taskData.status === 'completed' ? now : null,
    source: taskData.source || 'manual',
    tags: taskData.tags || []
  };

  tasks.unshift(newTask);
  saveAllTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getAllTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;

  const existing = tasks[index];
  const now = new Date().toISOString();

  let completedAt = existing.completedAt;
  if (updates.status === 'completed' && existing.status !== 'completed') {
    completedAt = now;
  } else if (updates.status && updates.status !== 'completed') {
    completedAt = null;
  }

  const updatedTask: Task = {
    ...existing,
    ...updates,
    updatedAt: now,
    completedAt
  };

  tasks[index] = updatedTask;
  saveAllTasks(tasks);
  return updatedTask;
}

export function deleteTask(id: string): boolean {
  const tasks = getAllTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveAllTasks(filtered);
  return true;
}

export function addSubtask(taskId: string, title: string): Task | null {
  const task = getTaskById(taskId);
  if (!task) return null;

  const newSubtask: SubTask = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };

  const updatedSubtasks = [...(task.subtasks || []), newSubtask];
  return updateTask(taskId, { subtasks: updatedSubtasks });
}

export function toggleSubtask(taskId: string, subtaskId: string): Task | null {
  const task = getTaskById(taskId);
  if (!task) return null;

  const updatedSubtasks = (task.subtasks || []).map(st => {
    if (st.id === subtaskId) {
      return { ...st, completed: !st.completed };
    }
    return st;
  });

  return updateTask(taskId, { subtasks: updatedSubtasks });
}

export function deleteSubtask(taskId: string, subtaskId: string): Task | null {
  const task = getTaskById(taskId);
  if (!task) return null;

  const updatedSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
  return updateTask(taskId, { subtasks: updatedSubtasks });
}

// Utility to check if a task is overdue
export function isTaskOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  if (!task.dueDate) return false;

  const dueString = task.dueTime ? `${task.dueDate}T${task.dueTime}:00` : `${task.dueDate}T23:59:59`;
  const dueDateTime = new Date(dueString);
  return dueDateTime.getTime() < referenceDate.getTime();
}

// Utility to check if a task is due today
export function isTaskDueToday(task: Task, referenceDate: Date = new Date()): boolean {
  if (!task.dueDate) return false;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;
  return task.dueDate === todayYMD;
}

// Utility to check if a task is upcoming (due in the future, not today)
export function isTaskUpcoming(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  if (!task.dueDate) return false;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;
  return task.dueDate > todayYMD;
}

// Compute comprehensive task analytics for dashboard
export function getTaskAnalytics(): TaskAnalytics {
  const tasks = getAllTasks();
  const now = new Date();

  let pendingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueSoonCount = 0;

  const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
  const categoryCounts: Record<string, number> = {};

  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  for (const t of tasks) {
    if (t.status === 'pending') pendingCount++;
    else if (t.status === 'in_progress') inProgressCount++;
    else if (t.status === 'completed') completedCount++;
    else if (t.status === 'cancelled') cancelledCount++;

    if (t.priority && priorityCounts[t.priority] !== undefined) {
      priorityCounts[t.priority]++;
    }

    const cat = t.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    if (isTaskOverdue(t, now)) {
      overdueCount++;
    }

    if (t.dueDate === todayYMD) {
      dueTodayCount++;
    }

    // Due in next 48 hours and not overdue
    if (t.dueDate && t.status !== 'completed' && t.status !== 'cancelled') {
      const dueStr = t.dueTime ? `${t.dueDate}T${t.dueTime}:00` : `${t.dueDate}T23:59:59`;
      const dueTime = new Date(dueStr).getTime();
      const diffMs = dueTime - now.getTime();
      if (diffMs > 0 && diffMs <= 48 * 3600 * 1000) {
        dueSoonCount++;
      }
    }
  }

  const activeTotal = tasks.length - cancelledCount;
  const completionRate = activeTotal > 0 ? Math.round((completedCount / activeTotal) * 100) : 0;

  return {
    totalTasks: tasks.length,
    pendingTasks: pendingCount,
    inProgressTasks: inProgressCount,
    completedTasks: completedCount,
    cancelledTasks: cancelledCount,
    overdueTasks: overdueCount,
    dueTodayTasks: dueTodayCount,
    dueSoonTasks: dueSoonCount,
    completionRate,
    priorityCounts,
    categoryCounts
  };
}
