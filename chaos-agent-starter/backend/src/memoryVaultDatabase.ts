import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type MemoryCategory = 'Project Goal' | 'Key Principle' | 'Vision' | 'Reference';
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export interface Memory {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  goalDeadline: string; // YYYY-MM-DD or ''
  linkedTaskIds: string[];
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'memory_vault.json');

function getInitialMemories(): Memory[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'mem_goal_01',
      title: 'Deliver Flawless Hackathon Presentation & Live Demo',
      content: 'Demonstrate JARVIS autonomous cross-device handover, deterministic self-healing recovery, and smart task management to judges. Goal is to secure top prize in the Autonomous Agents track.',
      category: 'Project Goal',
      importance: 'critical',
      goalDeadline: '2026-11-27',
      linkedTaskIds: ['task_sample_01', 'task_sample_02'],
      tags: ['hackathon', 'pitch', 'priority'],
      isFavorite: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'mem_principle_02',
      title: 'Zero User Shaming & Radical Psychological Safety',
      content: 'Procrastination is an emotional regulation and activation-energy barrier, not a character flaw. Always offer micro-commitments (2-5 minutes) and focus sprints rather than pressure.',
      category: 'Key Principle',
      importance: 'high',
      goalDeadline: '',
      linkedTaskIds: [],
      tags: ['psychology', 'productivity', 'habits'],
      isFavorite: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'mem_vision_03',
      title: 'Autonomous Personal Operating System Vision',
      content: 'Evolve JARVIS into a truly agentic temporal operating system that unifies research, multi-step execution, gamified productivity, and long-term memory vault recall.',
      category: 'Vision',
      importance: 'high',
      goalDeadline: '2026-12-31',
      linkedTaskIds: ['task_sample_04', 'task_sample_05'],
      tags: ['architecture', 'roadmap'],
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'memory_vault.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initial = getInitialMemories();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', updatedAt: new Date().toISOString(), memories: initial }, null, 2), 'utf-8');
  }
}

export function getAllMemories(filter?: {
  search?: string;
  category?: string;
  tag?: string;
  favorite?: boolean;
}): Memory[] {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    let list: Memory[] = Array.isArray(data.memories) ? data.memories : [];

    if (filter) {
      if (filter.favorite) {
        list = list.filter(m => m.isFavorite);
      }
      if (filter.category && filter.category !== 'all') {
        list = list.filter(m => m.category.toLowerCase() === filter.category!.toLowerCase());
      }
      if (filter.tag && filter.tag !== 'all') {
        list = list.filter(m => (m.tags || []).some(t => t.toLowerCase() === filter.tag!.toLowerCase()));
      }
      if (filter.search && filter.search.trim().length > 0) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(m =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          (m.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
    }

    // Sort: favorites first, then newest
    return list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (err) {
    console.error('Error reading memory vault database:', err);
    return [];
  }
}

export function saveAllMemories(memories: Memory[]): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify({ version: '1.0', updatedAt: new Date().toISOString(), memories }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving memory vault database:', err);
  }
}

export function getMemoryById(id: string): Memory | null {
  const memories = getAllMemories();
  return memories.find(m => m.id === id) || null;
}

export function createMemory(data: Partial<Memory>): Memory {
  const memories = getAllMemories();
  const now = new Date().toISOString();

  const newMemory: Memory = {
    id: data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: (data.title || '').trim(),
    content: (data.content || '').trim(),
    category: data.category || 'Project Goal',
    importance: data.importance || 'medium',
    goalDeadline: data.goalDeadline || '',
    linkedTaskIds: Array.isArray(data.linkedTaskIds) ? data.linkedTaskIds : [],
    tags: Array.isArray(data.tags) ? data.tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
    isFavorite: Boolean(data.isFavorite),
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };

  memories.unshift(newMemory);
  saveAllMemories(memories);
  return newMemory;
}

export function updateMemory(id: string, updates: Partial<Memory>): Memory | null {
  const memories = getAllMemories();
  const index = memories.findIndex(m => m.id === id);
  if (index === -1) return null;

  const existing = memories[index];
  const now = new Date().toISOString();

  const updated: Memory = {
    ...existing,
    ...updates,
    updatedAt: now
  };

  memories[index] = updated;
  saveAllMemories(memories);
  return updated;
}

export function deleteMemory(id: string): boolean {
  const memories = getAllMemories();
  const filtered = memories.filter(m => m.id !== id);
  if (filtered.length === memories.length) return false;
  saveAllMemories(filtered);
  return true;
}

export function toggleFavoriteMemory(id: string): Memory | null {
  const mem = getMemoryById(id);
  if (!mem) return null;
  return updateMemory(id, { isFavorite: !mem.isFavorite });
}

export function linkTaskToMemory(memoryId: string, taskId: string): Memory | null {
  const mem = getMemoryById(memoryId);
  if (!mem) return null;
  if (mem.linkedTaskIds.includes(taskId)) return mem;
  return updateMemory(memoryId, { linkedTaskIds: [...mem.linkedTaskIds, taskId] });
}

export function unlinkTaskFromMemory(memoryId: string, taskId: string): Memory | null {
  const mem = getMemoryById(memoryId);
  if (!mem) return null;
  return updateMemory(memoryId, { linkedTaskIds: mem.linkedTaskIds.filter(id => id !== taskId) });
}

export function getMemoriesForTask(taskId: string): Memory[] {
  const memories = getAllMemories();
  return memories.filter(m => m.linkedTaskIds && m.linkedTaskIds.includes(taskId));
}

// Find relevant project goals for Anti-Procrastination assistance
export function findRelevantGoalsForAssistance(taskIds: string[]): Memory[] {
  const memories = getAllMemories();
  const goalMemories = memories.filter(m => m.category === 'Project Goal' || m.importance === 'critical' || m.importance === 'high');

  // Match tasks directly linked
  const matched = goalMemories.filter(m => m.linkedTaskIds.some(tid => taskIds.includes(tid)));
  if (matched.length > 0) return matched;

  // Fallback to highest importance active goal
  return goalMemories.slice(0, 2);
}
