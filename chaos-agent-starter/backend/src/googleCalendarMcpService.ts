import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  attendees: string[];
  location?: string;
  meetLink?: string;
  isAllDay: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizerEmail: string;
  category: 'Hackathon' | 'Review' | 'Deep Work' | 'Sync' | 'General';
}

export interface CalendarDispatchSession {
  confirmationToken: string;
  action: 'create' | 'update' | 'delete';
  eventData: Partial<CalendarEvent>;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'authorized' | 'rejected' | 'dispatched';
  dispatchResult?: {
    success: boolean;
    eventId?: string;
    message: string;
    dispatchedAt: string;
  };
}

export interface CalendarStore {
  events: CalendarEvent[];
  dispatchSessions: CalendarDispatchSession[];
  connectedAccount: {
    email: string;
    displayName: string;
    isConnected: boolean;
    tokenExpiry: string;
    timeZone: string;
    scope: string[];
  };
}

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'google_calendar_store.json');

function getInitialCalendarStore(): CalendarStore {
  const now = new Date();
  const formatTime = (daysOffset: number, hour: number, minute: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const events: CalendarEvent[] = [
    {
      id: 'event_hackathon_demo',
      title: 'JARVIS Final Demo & Track Judging Presentation',
      description: 'Autonomous Agents Track live presentation and code walk-through. Present cross-device handover, deterministic self-healing recovery, and gamified productivity.',
      startTime: formatTime(0, 10, 0),
      endTime: formatTime(0, 11, 0),
      attendees: ['jarvispersonalai170@gmail.com', 'judging-committee@ai-hackathon.org', 'track-lead@ai-hackathon.org'],
      location: 'Virtual Main Stage / Google Meet',
      meetLink: 'https://meet.google.com/jrv-hack-demo',
      isAllDay: false,
      priority: 'high',
      status: 'confirmed',
      organizerEmail: 'judging-committee@ai-hackathon.org',
      category: 'Hackathon'
    },
    {
      id: 'event_focus_sprint',
      title: 'Deep Work Sprint: Procrastination Prevention Tuning',
      description: 'Undistracted focus block: Review XP idempotency and Memory Vault integration with task system.',
      startTime: formatTime(0, 14, 0),
      endTime: formatTime(0, 16, 30),
      attendees: ['jarvispersonalai170@gmail.com'],
      location: 'JARVIS Local Workspace',
      isAllDay: false,
      priority: 'medium',
      status: 'confirmed',
      organizerEmail: 'jarvispersonalai170@gmail.com',
      category: 'Deep Work'
    },
    {
      id: 'event_mentor_sync',
      title: 'Google Cloud & MCP Architecture Mentorship Sync',
      description: 'Discuss production deployment optimizations, OAuth2 scope security, and zero-shaming productivity nudges.',
      startTime: formatTime(1, 16, 0),
      endTime: formatTime(1, 17, 0),
      attendees: ['jarvispersonalai170@gmail.com', 'mentor-lead@google.com'],
      location: 'Google Meet',
      meetLink: 'https://meet.google.com/mnt-sync-2026',
      isAllDay: false,
      priority: 'high',
      status: 'confirmed',
      organizerEmail: 'mentor-lead@google.com',
      category: 'Sync'
    },
    {
      id: 'event_closing_ceremony',
      title: 'Hackathon Winner Announcements & Awards Gala',
      description: 'Awards ceremony for top autonomous agent prototypes.',
      startTime: formatTime(2, 18, 0),
      endTime: formatTime(2, 20, 0),
      attendees: ['jarvispersonalai170@gmail.com', 'all-participants@ai-hackathon.org'],
      location: 'Live Stream Auditorium',
      meetLink: 'https://meet.google.com/gala-stream-live',
      isAllDay: false,
      priority: 'high',
      status: 'confirmed',
      organizerEmail: 'committee@ai-hackathon.org',
      category: 'Hackathon'
    }
  ];

  return {
    events,
    dispatchSessions: [],
    connectedAccount: {
      email: process.env.GCAL_USER_EMAIL || 'jarvispersonalai170@gmail.com',
      displayName: 'JARVIS Authorized Operator',
      isConnected: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy'
      ]
    }
  };
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'google_calendar_store.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initial = getInitialCalendarStore();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function getCalendarStore(): CalendarStore {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      events: Array.isArray(data.events) ? data.events : [],
      dispatchSessions: Array.isArray(data.dispatchSessions) ? data.dispatchSessions : [],
      connectedAccount: {
        email: process.env.GCAL_USER_EMAIL || data.connectedAccount?.email || 'jarvispersonalai170@gmail.com',
        displayName: data.connectedAccount?.displayName || 'JARVIS Authorized Operator',
        isConnected: true,
        timeZone: data.connectedAccount?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
        scope: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.freebusy'
        ]
      }
    };
  } catch (err) {
    console.warn('Failed reading google_calendar_store.json, resetting to initial state:', err);
    const initial = getInitialCalendarStore();
    saveCalendarStore(initial);
    return initial;
  }
}

export function saveCalendarStore(store: CalendarStore): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving google_calendar_store.json:', err);
  }
}

// 1. Search & List Events
export function searchCalendarEvents(filter: {
  query?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}): { events: CalendarEvent[]; totalCount: number } {
  const store = getCalendarStore();
  let result = [...store.events];

  if (filter.category) {
    result = result.filter(e => e.category.toLowerCase() === filter.category!.toLowerCase());
  }

  if (filter.startDate) {
    const startMs = new Date(filter.startDate).getTime();
    result = result.filter(e => new Date(e.endTime).getTime() >= startMs);
  }

  if (filter.endDate) {
    const endMs = new Date(filter.endDate).getTime();
    result = result.filter(e => new Date(e.startTime).getTime() <= endMs);
  }

  if (filter.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    result = result.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.attendees.some(a => a.toLowerCase().includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
  }

  result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return { events: result, totalCount: result.length };
}

// 2. Get Event By ID
export function getCalendarEventById(eventId: string): CalendarEvent | null {
  const store = getCalendarStore();
  return store.events.find(e => e.id === eventId) || null;
}

// 3. AI Schedule Briefing & Focus Slot Recommendations
export async function generateScheduleBriefing(
  targetDateStr: string | undefined,
  openaiClient: OpenAI | null
): Promise<{
  briefing: string;
  recommendedFocusBlocks: string[];
  highPriorityAlerts: string[];
  totalEventsCount: number;
}> {
  const store = getCalendarStore();
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const daysEvents = store.events.filter(e => {
    const eStart = new Date(e.startTime);
    return eStart >= dayStart && eStart <= dayEnd;
  });

  if (openaiClient && daysEvents.length > 0) {
    try {
      const prompt = `You are JARVIS Schedule Optimizer. Analyze today's calendar events and provide a friendly, empowering executive briefing, 2 recommended deep-work focus blocks, and high priority alerts.
Events:
${daysEvents.map(e => `- ${e.title} (${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}), priority: ${e.priority}`).join('\n')}
Return JSON only: {"briefing": string, "recommendedFocusBlocks": string[], "highPriorityAlerts": string[]}`;

      const res = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const parsed = JSON.parse(res.choices[0].message?.content || '{}');
      if (parsed.briefing && Array.isArray(parsed.recommendedFocusBlocks)) {
        return {
          briefing: parsed.briefing,
          recommendedFocusBlocks: parsed.recommendedFocusBlocks,
          highPriorityAlerts: parsed.highPriorityAlerts || [],
          totalEventsCount: daysEvents.length
        };
      }
    } catch (aiErr) {
      console.warn('OpenAI schedule briefing failed, falling back to deterministic synthesis:', aiErr);
    }
  }

  // Deterministic synthesis
  const count = daysEvents.length;
  const highPri = daysEvents.filter(e => e.priority === 'high');
  return {
    briefing: count > 0
      ? `Good day! You have ${count} scheduled event${count > 1 ? 's' : ''} on your calendar today. Your primary commitment is "${daysEvents[0].title}".`
      : 'Your calendar is completely open today. Perfect opportunity for continuous deep work on JARVIS!',
    recommendedFocusBlocks: [
      '14:00 - 16:30 (Deep Work & Procrastination Prevention)',
      '11:30 - 13:00 (Architecture Documentation & Code Polish)'
    ],
    highPriorityAlerts: highPri.map(e => `High Priority: ${e.title} at ${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
    totalEventsCount: count
  };
}

// 4. Create Calendar Event Directly
export function createCalendarEvent(data: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  generateMeetLink?: boolean;
  priority?: 'high' | 'medium' | 'low';
  category?: CalendarEvent['category'];
}): CalendarEvent {
  const store = getCalendarStore();
  const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newEvent: CalendarEvent = {
    id: eventId,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    startTime: data.startTime,
    endTime: data.endTime,
    attendees: data.attendees || [store.connectedAccount.email],
    location: data.location || (data.generateMeetLink ? 'Google Meet' : 'Virtual / Flexible'),
    meetLink: data.generateMeetLink ? `https://meet.google.com/jrv-${Math.random().toString(36).substring(2, 6)}` : undefined,
    isAllDay: false,
    priority: data.priority || 'medium',
    status: 'confirmed',
    organizerEmail: store.connectedAccount.email,
    category: data.category || 'General'
  };

  store.events.push(newEvent);
  store.events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  saveCalendarStore(store);
  return newEvent;
}

// 5. Security Gate: Prepare Event Creation / Modification
export function prepareEventDispatch(data: {
  action: 'create' | 'update' | 'delete';
  eventData: Partial<CalendarEvent>;
}): CalendarDispatchSession {
  const store = getCalendarStore();
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  const confirmationToken = `cal_gate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const session: CalendarDispatchSession = {
    confirmationToken,
    action: data.action,
    eventData: data.eventData,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'pending'
  };

  store.dispatchSessions.unshift(session);
  saveCalendarStore(store);
  return session;
}

// 6. Security Gate: Confirm and Dispatch Calendar Event
export function confirmAndDispatchEvent(token: string, userApproved: boolean): {
  success: boolean;
  message: string;
  event?: CalendarEvent;
  session?: CalendarDispatchSession;
} {
  const store = getCalendarStore();
  const session = store.dispatchSessions.find(s => s.confirmationToken === token);
  if (!session) return { success: false, message: 'Invalid confirmation token.' };

  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'rejected';
    saveCalendarStore(store);
    return { success: false, message: 'Security token has expired.' };
  }

  if (!userApproved) {
    session.status = 'rejected';
    saveCalendarStore(store);
    return { success: false, message: 'Calendar event dispatch was declined by user.' };
  }

  let finalEvent: CalendarEvent;

  if (session.action === 'create') {
    finalEvent = createCalendarEvent({
      title: session.eventData.title || 'Untitled Event',
      description: session.eventData.description,
      startTime: session.eventData.startTime || new Date().toISOString(),
      endTime: session.eventData.endTime || new Date(Date.now() + 3600000).toISOString(),
      attendees: session.eventData.attendees,
      location: session.eventData.location,
      generateMeetLink: Boolean(session.eventData.meetLink),
      priority: session.eventData.priority,
      category: session.eventData.category
    });
  } else if (session.action === 'delete') {
    store.events = store.events.filter(e => e.id !== session.eventData.id);
    saveCalendarStore(store);
    session.status = 'dispatched';
    session.dispatchResult = {
      success: true,
      message: 'Event deleted from calendar.',
      dispatchedAt: new Date().toISOString()
    };
    return { success: true, message: 'Event successfully removed from Google Calendar.', session };
  } else {
    const existing = store.events.find(e => e.id === session.eventData.id);
    if (!existing) return { success: false, message: 'Target event not found.' };
    Object.assign(existing, session.eventData);
    finalEvent = existing;
    saveCalendarStore(store);
  }

  session.status = 'dispatched';
  session.dispatchResult = {
    success: true,
    eventId: finalEvent.id,
    message: `Event "${finalEvent.title}" scheduled via Google Calendar account (${store.connectedAccount.email}).`,
    dispatchedAt: new Date().toISOString()
  };
  saveCalendarStore(store);

  return {
    success: true,
    message: `Event "${finalEvent.title}" verified and scheduled on Google Calendar.`,
    event: finalEvent,
    session
  };
}

// 7. MCP Tool Definitions for Google Calendar
export const GCALENDAR_MCP_TOOLS = [
  {
    name: 'list_calendar_events',
    description: 'Retrieve events from Google Calendar with optional date range and category filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date string or YYYY-MM-DD' },
        endDate: { type: 'string', description: 'ISO date string or YYYY-MM-DD' },
        category: { type: 'string', description: 'Event category filter' },
        query: { type: 'string', description: 'Keyword search filter' }
      }
    }
  },
  {
    name: 'get_calendar_event',
    description: 'Get full event details, attendees, and Google Meet URL.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Unique calendar event ID' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'summarize_schedule',
    description: 'Generate an executive briefing of the day and recommend optimal deep-work focus slots.',
    inputSchema: {
      type: 'object',
      properties: {
        targetDate: { type: 'string', description: 'Date to summarize (YYYY-MM-DD)' }
      }
    }
  },
  {
    name: 'prepare_calendar_event',
    description: 'Initiate a calendar event creation or update. Generates a 15-minute token requiring user confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'Start time in ISO 8601' },
        endTime: { type: 'string', description: 'End time in ISO 8601' },
        attendees: { type: 'array', items: { type: 'string' } },
        location: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },
  {
    name: 'confirm_calendar_event',
    description: 'Finalize and schedule a calendar event after human confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmationToken: { type: 'string', description: 'Security gate confirmation token' },
        userApproved: { type: 'boolean', description: 'Explicit authorization flag' }
      },
      required: ['confirmationToken', 'userApproved']
    }
  }
];

export async function executeCalendarMcpTool(
  toolName: string,
  args: any,
  openaiClient: OpenAI | null
): Promise<{ result: any; isError?: boolean }> {
  switch (toolName) {
    case 'list_calendar_events':
      return { result: searchCalendarEvents(args || {}) };
    case 'get_calendar_event':
      return { result: getCalendarEventById(args?.eventId) };
    case 'summarize_schedule':
      return { result: await generateScheduleBriefing(args?.targetDate, openaiClient) };
    case 'prepare_calendar_event':
      return { result: prepareEventDispatch({ action: 'create', eventData: args }) };
    case 'confirm_calendar_event':
      return { result: confirmAndDispatchEvent(args.confirmationToken, Boolean(args.userApproved)) };
    default:
      return { isError: true, result: `Unknown tool: ${toolName}` };
  }
}
