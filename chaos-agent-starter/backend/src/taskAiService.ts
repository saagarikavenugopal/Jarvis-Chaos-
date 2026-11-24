import OpenAI from 'openai';
import {
  Task,
  TaskPriority,
  TaskStatus,
  getAllTasks,
  isTaskOverdue,
  isTaskDueToday,
  isTaskUpcoming,
  getTaskAnalytics
} from './taskDatabase.js';

export interface ExtractedTaskCandidate {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  category: string;
  subtasks: Array<{ title: string; completed: boolean }>;
  tags?: string[];
  inferredDeadline: boolean;
  inferredPriority: boolean;
}

export interface TaskAiResponse {
  intent: 'create' | 'create_multiple' | 'query' | 'decompose' | 'clarify' | 'summary';
  message: string;
  tasksToCreate?: ExtractedTaskCandidate[];
  queryResults?: Task[];
  suggestedSubtasks?: Array<{ title: string; estimatedMinutes?: number }>;
  missingFields?: string[];
  requiresConfirmation: boolean;
  recommendations?: string[];
}

// Helper to calculate target day of the week relative to a base date
function getNextDayOfWeek(dayName: string, baseDate: Date = new Date()): Date {
  const days: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6
  };
  const targetDay = days[dayName.toLowerCase()];
  if (targetDay === undefined) return baseDate;

  const result = new Date(baseDate);
  const currentDay = baseDate.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) {
    diff += 7; // next week's occurrence
  }
  result.setDate(baseDate.getDate() + diff);
  return result;
}

// Format Date to YYYY-MM-DD
export function formatDateYMD(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Deterministic natural language task extractor
export function parseTaskRequestDeterministic(userPrompt: string, baseDate: Date = new Date()): TaskAiResponse {
  const prompt = userPrompt.trim();
  const lower = prompt.toLowerCase();

  // 1. Check for Query Intent: "show me", "list", "what are", "find"
  if (
    /^(show\s+me|list|what\s+are|display|find|get)\s+/i.test(prompt) ||
    lower.includes('urgent pending') ||
    lower.includes('overdue tasks') ||
    lower.includes('tasks for today') ||
    lower.includes('today\'s tasks') ||
    lower.includes('upcoming tasks')
  ) {
    const all = getAllTasks();
    let filtered = all;
    let queryDesc = 'all active tasks';

    if (lower.includes('urgent')) {
      filtered = all.filter(t => (t.priority === 'urgent' || t.priority === 'high') && (t.status === 'pending' || t.status === 'in_progress'));
      queryDesc = 'most urgent pending tasks';
    } else if (lower.includes('overdue')) {
      filtered = all.filter(t => isTaskOverdue(t, baseDate));
      queryDesc = 'overdue tasks requiring attention';
    } else if (lower.includes('today')) {
      filtered = all.filter(t => isTaskDueToday(t, baseDate));
      queryDesc = 'tasks scheduled for today';
    } else if (lower.includes('upcoming')) {
      filtered = all.filter(t => isTaskUpcoming(t, baseDate));
      queryDesc = 'upcoming scheduled tasks';
    } else if (lower.includes('completed')) {
      filtered = all.filter(t => t.status === 'completed');
      queryDesc = 'completed tasks';
    } else {
      filtered = all.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    }

    const count = filtered.length;
    let msg = `Found ${count} ${queryDesc}:`;
    if (count === 0) {
      msg = `No ${queryDesc} currently recorded in your task vault. All systems clear.`;
    }

    return {
      intent: 'query',
      message: msg,
      queryResults: filtered,
      requiresConfirmation: false
    };
  }

  // 2. Check for Task Decomposition: "break my project into smaller tasks" or "break ... into subtasks"
  if (/break\s+.*into\s+(smaller\s+tasks|subtasks|steps)/i.test(prompt) || lower.startsWith('break down') || lower.startsWith('decompose')) {
    let targetTitle = 'Project Implementation';
    const match = prompt.match(/break\s+(?:my\s+|the\s+)?(.+?)\s+into/i);
    if (match && match[1]) {
      targetTitle = match[1].trim();
    }

    const subtasks = generateHeuristicSubtasks(targetTitle);
    return {
      intent: 'decompose',
      message: `JARVIS has analyzed "${targetTitle}" and generated ${subtasks.length} modular, actionable subtasks for systematic execution:`,
      suggestedSubtasks: subtasks,
      requiresConfirmation: true
    };
  }

  // 3. Check for Multiple Task Creation Request: "create three tasks for...", "create 3 tasks..."
  const multiMatch = prompt.match(/create\s+(three|3|four|4|five|5|two|2)\s+tasks\s+(?:for|to|about)\s+(.+)/i);
  if (multiMatch) {
    const countWord = multiMatch[1].toLowerCase();
    const countMap: Record<string, number> = { two: 2, '2': 2, three: 3, '3': 3, four: 4, '4': 4, five: 5, '5': 5 };
    const count = countMap[countWord] || 3;
    const topic = multiMatch[2].replace(/[.\?!]+$/, '').trim();

    const tasks: ExtractedTaskCandidate[] = [];
    const templateSubtasks = generateHeuristicSubtasks(topic);
    
    // Determine category based on topic
    let cat = 'Work';
    if (/hackathon|code|dev|app|api|software|backend|frontend/i.test(topic)) cat = 'Development';
    else if (/doc|write|guide|spec|manual/i.test(topic)) cat = 'Documentation';
    else if (/design|ui|ux|mockup|figma/i.test(topic)) cat = 'Design';
    else if (/security|audit|test|compliance/i.test(topic)) cat = 'Security';

    // Priority explicitly requested?
    let priority: TaskPriority = 'medium';
    let inferredPriority = true;
    if (/urgent|critical|asap/i.test(prompt)) {
      priority = 'urgent';
      inferredPriority = false;
    } else if (/high\s+priority|important/i.test(prompt)) {
      priority = 'high';
      inferredPriority = false;
    }

    for (let i = 0; i < Math.min(count, templateSubtasks.length); i++) {
      tasks.push({
        title: templateSubtasks[i].title,
        description: `Structured task step ${i + 1} of ${count} for: ${topic}`,
        priority,
        dueDate: '',
        dueTime: '',
        category: cat,
        subtasks: [],
        tags: [topic.split(' ')[0].toLowerCase()],
        inferredDeadline: false,
        inferredPriority
      });
    }

    return {
      intent: 'create_multiple',
      message: `JARVIS has structured ${tasks.length} tasks for "${topic}". Please review the candidate details below and confirm to save them:`,
      tasksToCreate: tasks,
      missingFields: ['dueDate'],
      requiresConfirmation: true
    };
  }

  // 4. Single Task Creation Extraction
  let cleanTitle = prompt;
  // Remove command prefixes
  cleanTitle = cleanTitle.replace(/^(can\s+you\s+|please\s+|jarvis\s+|i\s+need\s+to\s+|create\s+(a\s+)?task\s+(to\s+|for\s+)?|add\s+(a\s+)?task\s+(to\s+|for\s+)?|remind\s+me\s+to\s+)/i, '');
  
  // Extract Deadline Date
  let dueDate = '';
  let dueTime = '';
  let inferredDeadline = false;

  // Check for "by Friday", "by tomorrow", "by Monday", "on Tuesday", etc.
  const dayMatch = cleanTitle.match(/(?:by|on|before|due)\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i);
  if (dayMatch) {
    const dayName = dayMatch[2];
    const targetDate = getNextDayOfWeek(dayName, baseDate);
    dueDate = formatDateYMD(targetDate);
    inferredDeadline = false;
    cleanTitle = cleanTitle.replace(dayMatch[0], '');
  } else if (/\b(?:by|due)\s+tomorrow\b/i.test(cleanTitle)) {
    const tmr = new Date(baseDate);
    tmr.setDate(tmr.getDate() + 1);
    dueDate = formatDateYMD(tmr);
    inferredDeadline = false;
    cleanTitle = cleanTitle.replace(/\b(?:by|due)\s+tomorrow\b/i, '');
  } else if (/\b(?:by|due)\s+today\b/i.test(cleanTitle)) {
    dueDate = formatDateYMD(baseDate);
    inferredDeadline = false;
    cleanTitle = cleanTitle.replace(/\b(?:by|due)\s+today\b/i, '');
  } else if (/\b(?:by|due)\s+next\s+week\b/i.test(cleanTitle)) {
    const nw = new Date(baseDate);
    nw.setDate(nw.getDate() + 7);
    dueDate = formatDateYMD(nw);
    inferredDeadline = false;
    cleanTitle = cleanTitle.replace(/\b(?:by|due)\s+next\s+week\b/i, '');
  }

  // Extract Time if present: "at 5pm", "by 17:00", "at 3:30 pm"
  const timeMatch = cleanTitle.match(/(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3]?.toLowerCase();

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    const pad = (n: number) => n.toString().padStart(2, '0');
    dueTime = `${pad(hours)}:${pad(minutes)}`;
    cleanTitle = cleanTitle.replace(timeMatch[0], '');
  }

  // Extract Priority
  let priority: TaskPriority = 'medium';
  let inferredPriority = true;
  if (/\b(urgent|asap|critical|highest\s+priority)\b/i.test(cleanTitle)) {
    priority = 'urgent';
    inferredPriority = false;
    cleanTitle = cleanTitle.replace(/\b(urgent|asap|critical|highest\s+priority)\b/i, '');
  } else if (/\b(high\s+priority|important)\b/i.test(cleanTitle)) {
    priority = 'high';
    inferredPriority = false;
    cleanTitle = cleanTitle.replace(/\b(high\s+priority|important)\b/i, '');
  } else if (/\b(low\s+priority|whenever|minor)\b/i.test(cleanTitle)) {
    priority = 'low';
    inferredPriority = false;
    cleanTitle = cleanTitle.replace(/\b(low\s+priority|whenever|minor)\b/i, '');
  }

  // Extract Category
  let category = 'Work';
  if (/doc|document|documentation|spec|manual|readme/i.test(cleanTitle)) {
    category = 'Documentation';
  } else if (/hackathon|code|dev|bug|feature|api|deploy|frontend|backend/i.test(cleanTitle)) {
    category = 'Development';
  } else if (/design|ui|ux|mockup|figma|css|style/i.test(cleanTitle)) {
    category = 'Design';
  } else if (/personal|groceries|health|workout|home/i.test(cleanTitle)) {
    category = 'Personal';
  } else if (/security|audit|auth|token|encryption/i.test(cleanTitle)) {
    category = 'Security';
  }

  // Final cleanup of title
  cleanTitle = cleanTitle
    .replace(/[.\?!]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalize first letter
  if (cleanTitle.length > 0) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else {
    cleanTitle = 'New Operational Task';
  }

  const missingFields: string[] = [];
  if (!dueDate) missingFields.push('dueDate');

  let clarificationText = `I have formulated your task "${cleanTitle}".`;
  if (dueDate) {
    clarificationText += ` Deadline set to ${dueDate}${dueTime ? ' at ' + dueTime : ''}.`;
  } else {
    clarificationText += ` No deadline was specified, so deadline remains open.`;
  }
  if (!inferredPriority) {
    clarificationText += ` Priority registered as ${priority.toUpperCase()}.`;
  } else {
    clarificationText += ` Priority defaulted to Medium.`;
  }
  clarificationText += ` Please confirm to record this task in your vault.`;

  return {
    intent: 'create',
    message: clarificationText,
    tasksToCreate: [
      {
        title: cleanTitle,
        description: `Autonomous task generated via JARVIS natural language interface.`,
        priority,
        dueDate,
        dueTime,
        category,
        subtasks: [],
        tags: [category.toLowerCase()],
        inferredDeadline,
        inferredPriority
      }
    ],
    missingFields,
    requiresConfirmation: true
  };
}

// Subtask decomposition heuristic
function generateHeuristicSubtasks(topic: string): Array<{ title: string; estimatedMinutes?: number }> {
  const t = topic.toLowerCase();
  if (t.includes('hackathon') || t.includes('presentation') || t.includes('pitch')) {
    return [
      { title: 'Draft executive problem statement and solution narrative', estimatedMinutes: 45 },
      { title: 'Design visual architecture diagrams and highlight live metrics', estimatedMinutes: 60 },
      { title: 'Record backup 60-second offline demo walkthrough video', estimatedMinutes: 30 },
      { title: 'Rehearse live delivery and prepare answers for judge questions', estimatedMinutes: 30 }
    ];
  }
  if (t.includes('documentation') || t.includes('document') || t.includes('docs')) {
    return [
      { title: 'Outline core system components and integration touchpoints', estimatedMinutes: 30 },
      { title: 'Document API endpoints with request and response schemas', estimatedMinutes: 60 },
      { title: 'Add quickstart guides, environment variable references, and examples', estimatedMinutes: 45 },
      { title: 'Review readability, verify citations, and format markdown artifacts', estimatedMinutes: 30 }
    ];
  }
  if (t.includes('security') || t.includes('audit')) {
    return [
      { title: 'Perform static code analysis and dependency vulnerability audit', estimatedMinutes: 45 },
      { title: 'Verify token rotation and human-in-the-loop authorization gates', estimatedMinutes: 40 },
      { title: 'Compile security compliance audit log and export PDF certificate', estimatedMinutes: 30 }
    ];
  }
  // Generic fallback breakdown
  return [
    { title: `Define scope, deliverables, and acceptance criteria for ${topic}`, estimatedMinutes: 30 },
    { title: `Execute core technical implementation and integrate dependencies`, estimatedMinutes: 90 },
    { title: `Conduct end-to-end testing, error recovery, and verification`, estimatedMinutes: 45 },
    { title: `Finalize review, document changes, and deploy`, estimatedMinutes: 30 }
  ];
}

// Master Natural Language Processor with OpenAI & Fallback
export async function processTaskCommand(
  userPrompt: string,
  openaiClient: OpenAI | null,
  modelName: string = 'gpt-4.1-mini',
  baseDate: Date = new Date()
): Promise<TaskAiResponse> {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const nowStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][baseDate.getDay()]})`;

  // If OpenAI is available, attempt neural extraction with structured response
  if (openaiClient) {
    try {
      const systemPrompt = `You are JARVIS — Smart Task Manager AI Assistant.
Current reference date and time: ${nowStr}.
You process user natural language requests for task management.

STRICT INSTRUCTIONS:
1. "Do not invent deadlines or silently assign arbitrary priorities."
   - If the user says "by Friday", calculate Friday's exact date relative to ${nowStr} (YYYY-MM-DD).
   - If the user did NOT state or imply a deadline, leave dueDate as "" (empty string). Do NOT invent a deadline.
   - If the user explicitly asks for priority (e.g., "urgent", "asap", "high priority", "low"), extract it as: 'low' | 'medium' | 'high' | 'urgent'.
   - If the user did NOT state priority, set priority to 'medium' and mark inferredPriority: true.
2. Determine Intent:
   - 'create': Single task creation
   - 'create_multiple': Request for multiple tasks (e.g. "Create three tasks for...")
   - 'query': User wants to find/see existing tasks (e.g. "Show me my most urgent pending tasks")
   - 'decompose': User wants to break down a project/task into smaller subtasks
3. Return ONLY valid JSON matching this schema:
{
  "intent": "create" | "create_multiple" | "query" | "decompose",
  "message": "Polite JARVIS confirmation or explanation message",
  "tasksToCreate": [
    {
      "title": "Task title",
      "description": "Short description",
      "priority": "low" | "medium" | "high" | "urgent",
      "dueDate": "YYYY-MM-DD" or "",
      "dueTime": "HH:mm" or "",
      "category": "Work" | "Development" | "Documentation" | "Security" | "Design" | "Personal" | "General",
      "subtasks": [{"title": "Subtask title", "completed": false}],
      "tags": ["tag1"],
      "inferredDeadline": boolean,
      "inferredPriority": boolean
    }
  ],
  "suggestedSubtasks": [{"title": "Subtask title", "estimatedMinutes": 30}],
  "queryType": "urgent_pending" | "overdue" | "today" | "upcoming" | "all",
  "missingFields": ["dueDate"],
  "requiresConfirmation": true
}`;

      const completion = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (rawContent) {
        const parsed = JSON.parse(rawContent);

        // If it's a query intent, fulfill using stored tasks
        if (parsed.intent === 'query') {
          const all = getAllTasks();
          let filtered = all;
          const qType = parsed.queryType || 'urgent_pending';

          if (qType === 'urgent_pending' || userPrompt.toLowerCase().includes('urgent')) {
            filtered = all.filter(t => (t.priority === 'urgent' || t.priority === 'high') && (t.status === 'pending' || t.status === 'in_progress'));
          } else if (qType === 'overdue' || userPrompt.toLowerCase().includes('overdue')) {
            filtered = all.filter(t => isTaskOverdue(t, baseDate));
          } else if (qType === 'today' || userPrompt.toLowerCase().includes('today')) {
            filtered = all.filter(t => isTaskDueToday(t, baseDate));
          } else if (qType === 'upcoming') {
            filtered = all.filter(t => isTaskUpcoming(t, baseDate));
          }

          return {
            intent: 'query',
            message: parsed.message || `Retrieved ${filtered.length} relevant tasks from your vault:`,
            queryResults: filtered,
            requiresConfirmation: false
          };
        }

        return {
          intent: parsed.intent || 'create',
          message: parsed.message || 'Task prepared for review.',
          tasksToCreate: parsed.tasksToCreate || [],
          suggestedSubtasks: parsed.suggestedSubtasks,
          missingFields: parsed.missingFields || [],
          requiresConfirmation: true
        };
      }
    } catch (err) {
      console.warn('OpenAI task parser call failed, falling back to autonomous rule-engine:', err);
    }
  }

  // Robust deterministic fallback
  return parseTaskRequestDeterministic(userPrompt, baseDate);
}

// Generate Daily Task Summary and Intelligent Priority Recommendations
export function generateDailyTaskSummary(referenceDate: Date = new Date()): {
  summary: string;
  recommendations: string[];
  metrics: {
    urgentCount: number;
    overdueCount: number;
    dueTodayCount: number;
    completionRate: number;
  };
} {
  const tasks = getAllTasks();
  const analytics = getTaskAnalytics();

  const overdue = tasks.filter(t => isTaskOverdue(t, referenceDate));
  const dueToday = tasks.filter(t => isTaskDueToday(t, referenceDate));
  const urgentPending = tasks.filter(t => t.priority === 'urgent' && (t.status === 'pending' || t.status === 'in_progress'));

  const recommendations: string[] = [];

  if (overdue.length > 0) {
    recommendations.push(`CRITICAL: You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} ("${overdue[0].title}"). Prioritize resolution or update deadlines immediately.`);
  }

  if (urgentPending.length > 0) {
    recommendations.push(`HIGH IMPACT: ${urgentPending.length} urgent task${urgentPending.length > 1 ? 's' : ''} currently active. Focus your primary morning focus block on "${urgentPending[0].title}".`);
  }

  if (dueToday.length > 0) {
    recommendations.push(`SCHEDULED: ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due before midnight today.`);
  }

  // Subtask recommendation for tasks with no subtasks that look complex
  const complexTask = tasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && (!t.subtasks || t.subtasks.length === 0) && t.title.length > 30);
  if (complexTask) {
    recommendations.push(`DECOMPOSITION SUGGESTION: "${complexTask.title}" has no subtasks. Breaking it down will increase completion velocity by ~40%.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('OPTIMAL WORKLOAD: No urgent blockers or overdue items. Great momentum! Check upcoming scheduled milestones.');
  }

  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][referenceDate.getDay()];
  const summary = `Executive Daily Briefing for ${dayName}: Your vault contains ${analytics.totalTasks} total tasks with a ${analytics.completionRate}% completion rate. Currently ${analytics.pendingTasks} pending and ${analytics.inProgressTasks} in progress. ${overdue.length} overdue items require immediate attention.`;

  return {
    summary,
    recommendations,
    metrics: {
      urgentCount: urgentPending.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      completionRate: analytics.completionRate
    }
  };
}
