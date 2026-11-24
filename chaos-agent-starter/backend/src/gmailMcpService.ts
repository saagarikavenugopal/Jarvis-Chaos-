import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
  snippet: string;
  date: string; // ISO 8601
  isUnread: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  attachments?: GmailAttachment[];
  labels: string[]; // e.g. ['INBOX', 'IMPORTANT', 'WORK']
}

export interface GmailThread {
  id: string;
  subject: string;
  snippet: string;
  messages: GmailMessage[];
  lastMessageDate: string;
  participantEmails: string[];
  isImportant: boolean;
  isUnread: boolean;
  labels: string[];
}

export interface GmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchAuthorizationSession {
  confirmationToken: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'authorized' | 'rejected' | 'dispatched';
  dispatchResult?: {
    success: boolean;
    providerId?: string;
    dispatchedAt: string;
    message: string;
  };
}

export interface GmailStore {
  threads: GmailThread[];
  drafts: GmailDraft[];
  dispatches: DispatchAuthorizationSession[];
  connectedAccount: {
    email: string;
    displayName: string;
    isConnected: boolean;
    tokenExpiry: string;
    scope: string[];
  };
}

const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : BUNDLED_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'gmail_inbox.json');

function getInitialInbox(): GmailStore {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (daysAgo: number, hours: number, mins: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };

  const threads: GmailThread[] = [
    {
      id: 'thread_hackathon_01',
      subject: 'Final Pitch Deck Submission & Demo Day Logistics',
      snippet: 'Judges will begin scoring at 09:00 AM UTC. Please verify your autonomous demo endpoint...',
      lastMessageDate: formatDate(0, 10, 15),
      participantEmails: ['judging-committee@ai-hackathon.org', 'user@jarvis-os.ai'],
      isImportant: true,
      isUnread: true,
      labels: ['INBOX', 'IMPORTANT', 'HACKATHON'],
      messages: [
        {
          id: 'msg_01_a',
          threadId: 'thread_hackathon_01',
          sender: 'Autonomous Agents Track Committee',
          senderEmail: 'judging-committee@ai-hackathon.org',
          recipient: 'JARVIS Operations Lead',
          recipientEmail: 'user@jarvis-os.ai',
          subject: 'Final Pitch Deck Submission & Demo Day Logistics',
          body: `Hello JARVIS Team,\n\nWe are excited to confirm that your project "JARVIS — The Time Traveller" has been shortlisted for the final evaluation round in the Autonomous Agents track.\n\nKey Requirements:\n1. Please ensure your demo endpoint is publicly accessible and running live.\n2. Submit your final architecture diagram and slide deck by 11:59 PM tonight.\n3. You will have a 5-minute uninterrupted live demonstration slot followed by 3 minutes of technical Q&A with judges.\n\nPlease reply with your confirmation and public live URL.\n\nBest regards,\nTrack Committee`,
          snippet: 'We are excited to confirm that your project "JARVIS — The Time Traveller" has been shortlisted...',
          date: formatDate(0, 10, 15),
          isUnread: true,
          isImportant: true,
          hasAttachments: true,
          attachments: [
            { id: 'att_01', filename: 'Judge_Rubric_Autonomous_Agents_2026.pdf', mimeType: 'application/pdf', sizeBytes: 245760 }
          ],
          labels: ['INBOX', 'IMPORTANT', 'HACKATHON']
        }
      ]
    },
    {
      id: 'thread_security_02',
      subject: 'Urgent: Review NIST Agentic Safety and Model Citation Audit',
      snippet: 'Regarding compliance for autonomous model dispatch and tool execution gates...',
      lastMessageDate: formatDate(1, 14, 30),
      participantEmails: ['compliance-sec@cloud-governance.io', 'user@jarvis-os.ai'],
      isImportant: true,
      isUnread: false,
      labels: ['INBOX', 'IMPORTANT', 'SECURITY'],
      messages: [
        {
          id: 'msg_02_a',
          threadId: 'thread_security_02',
          sender: 'Dr. Elena Rostova',
          senderEmail: 'compliance-sec@cloud-governance.io',
          recipient: 'JARVIS Architecture',
          recipientEmail: 'user@jarvis-os.ai',
          subject: 'Urgent: Review NIST Agentic Safety and Model Citation Audit',
          body: `Hi Team,\n\nI reviewed your latest multi-step orchestration pipeline. I am particularly impressed by the explicit human-in-the-loop security gates implemented before external side effects like email dispatch and database writes.\n\nCould you confirm whether all external communications retain an immutable audit log with cryptographic or timestamped tokens? This is required for our NIST AI RMF audit compliance.\n\nThanks,\nDr. Elena Rostova\nPrincipal Safety Auditor`,
          snippet: 'Could you confirm whether all external communications retain an immutable audit log...',
          date: formatDate(1, 14, 30),
          isUnread: false,
          isImportant: true,
          hasAttachments: false,
          labels: ['INBOX', 'IMPORTANT', 'SECURITY']
        }
      ]
    },
    {
      id: 'thread_research_03',
      subject: 'Clean Energy & Perovskite Solar Cells Synthesis Summary',
      snippet: 'The tandem perovskite-silicon cell test report demonstrates 33.9% power conversion efficiency...',
      lastMessageDate: formatDate(2, 9, 45),
      participantEmails: ['dr.aravind@cleanenergy-lab.org', 'user@jarvis-os.ai'],
      isImportant: false,
      isUnread: false,
      labels: ['INBOX', 'RESEARCH'],
      messages: [
        {
          id: 'msg_03_a',
          threadId: 'thread_research_03',
          sender: 'Dr. Aravind Sundaram',
          senderEmail: 'dr.aravind@cleanenergy-lab.org',
          recipient: 'JARVIS Research Hub',
          recipientEmail: 'user@jarvis-os.ai',
          subject: 'Clean Energy & Perovskite Solar Cells Synthesis Summary',
          body: `Hi,\n\nFollowing up on our renewable energy query, the test reports for the dual-junction tandem cells have concluded. The certified lab results show stable operation exceeding 1,000 hours with negligible degradation under accelerated thermal cycling.\n\nI have attached the dataset summary table for ingestion into JARVIS knowledge database.\n\nWarm regards,\nAravind`,
          snippet: 'The test reports for the dual-junction tandem cells have concluded...',
          date: formatDate(2, 9, 45),
          isUnread: false,
          isImportant: false,
          hasAttachments: true,
          attachments: [
            { id: 'att_02', filename: 'Perovskite_Tandem_Data_Summary.csv', mimeType: 'text/csv', sizeBytes: 81920 }
          ],
          labels: ['INBOX', 'RESEARCH']
        }
      ]
    }
  ];

  const drafts: GmailDraft[] = [
    {
      id: 'draft_01',
      to: 'judging-committee@ai-hackathon.org',
      subject: 'Re: Final Pitch Deck Submission & Demo Day Logistics',
      body: `Dear Track Committee,\n\nThank you for the notification. We are pleased to confirm that JARVIS — The Time Traveller is ready for live evaluation.\n\nOur public live demo endpoint: https://jarvis-chaos.vercel.app\n\nAttached is our latest executive briefing.\n\nBest regards,\nJARVIS Core Team`,
      createdAt: formatDate(0, 11, 0),
      updatedAt: formatDate(0, 11, 30)
    }
  ];

  return {
    threads,
    drafts,
    dispatches: [],
    connectedAccount: {
      email: 'user@jarvis-os.ai',
      displayName: 'JARVIS Authorized Operator',
      isConnected: true,
      tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
      scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.send']
    }
  };
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'gmail_inbox.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initial = getInitialInbox();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function getGmailStore(): GmailStore {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      threads: Array.isArray(data.threads) ? data.threads : [],
      drafts: Array.isArray(data.drafts) ? data.drafts : [],
      dispatches: Array.isArray(data.dispatches) ? data.dispatches : [],
      connectedAccount: data.connectedAccount || {
        email: 'user@jarvis-os.ai',
        displayName: 'JARVIS Authorized Operator',
        isConnected: true,
        tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
        scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.send']
      }
    };
  } catch (err) {
    console.error('Error reading gmail store:', err);
    return getInitialInbox();
  }
}

export function saveGmailStore(store: GmailStore): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving gmail store:', err);
  }
}

// 1. Search Emails (by query, sender, date, subject, importance)
export function searchEmails(params: {
  query?: string;
  sender?: string;
  subject?: string;
  after?: string; // YYYY-MM-DD
  before?: string; // YYYY-MM-DD
  isImportant?: boolean;
  hasAttachment?: boolean;
}): { threads: GmailThread[]; totalCount: number } {
  const store = getGmailStore();
  let threads = [...store.threads];

  if (params.isImportant !== undefined) {
    threads = threads.filter(t => t.isImportant === params.isImportant);
  }

  if (params.sender && params.sender.trim().length > 0) {
    const s = params.sender.toLowerCase().trim();
    threads = threads.filter(t =>
      t.messages.some(m => m.sender.toLowerCase().includes(s) || m.senderEmail.toLowerCase().includes(s))
    );
  }

  if (params.subject && params.subject.trim().length > 0) {
    const subj = params.subject.toLowerCase().trim();
    threads = threads.filter(t => t.subject.toLowerCase().includes(subj));
  }

  if (params.after) {
    threads = threads.filter(t => t.lastMessageDate >= params.after!);
  }

  if (params.before) {
    threads = threads.filter(t => t.lastMessageDate <= params.before!);
  }

  if (params.hasAttachment) {
    threads = threads.filter(t => t.messages.some(m => m.hasAttachments));
  }

  if (params.query && params.query.trim().length > 0) {
    const q = params.query.toLowerCase().trim();
    threads = threads.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.snippet.toLowerCase().includes(q) ||
      t.messages.some(m =>
        m.body.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        m.senderEmail.toLowerCase().includes(q) ||
        (m.attachments || []).some(a => a.filename.toLowerCase().includes(q))
      )
    );
  }

  // Sort by newest message
  threads.sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

  return { threads, totalCount: threads.length };
}

// 2. Retrieve Email Details / Thread
export function getThreadById(threadId: string): GmailThread | null {
  const store = getGmailStore();
  return store.threads.find(t => t.id === threadId) || null;
}

export function getMessageById(messageId: string): GmailMessage | null {
  const store = getGmailStore();
  for (const t of store.threads) {
    const msg = t.messages.find(m => m.id === messageId);
    if (msg) return msg;
  }
  return null;
}

// 3. Summarize Email & Identify Important Messages (AI Reasoning)
export async function summarizeEmailThread(
  threadId: string,
  openaiClient: OpenAI | null,
  modelName: string = 'gpt-4.1-mini'
): Promise<{
  threadId: string;
  summary: string;
  actionItems: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  keyParticipants: string[];
}> {
  const thread = getThreadById(threadId);
  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const threadContent = thread.messages.map(m => `From: ${m.sender} <${m.senderEmail}>\nDate: ${m.date}\nBody:\n${m.body}`).join('\n---\n');

  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: `You are JARVIS Email Intelligence. Analyze the email conversation thread and output a concise JSON object with:
- "summary": a crisp 2-3 sentence executive briefing.
- "actionItems": array of specific actionable next steps required from the recipient.
- "urgencyLevel": "low" | "medium" | "high" | "critical" based on explicit deadlines or requests.
- "keyParticipants": array of key senders/stakeholders.`
          },
          {
            role: 'user',
            content: `Subject: ${thread.subject}\n\n${threadContent}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        threadId,
        summary: parsed.summary || 'Summary generated.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        urgencyLevel: parsed.urgencyLevel || (thread.isImportant ? 'high' : 'medium'),
        keyParticipants: Array.isArray(parsed.keyParticipants) ? parsed.keyParticipants : thread.participantEmails
      };
    } catch (err) {
      console.warn('OpenAI email summarization fallback triggered:', err);
    }
  }

  // Deterministic local extraction fallback
  const actionItems: string[] = [];
  let urgency: 'low' | 'medium' | 'high' | 'critical' = thread.isImportant ? 'high' : 'medium';

  for (const m of thread.messages) {
    const text = m.body.toLowerCase();
    if (text.includes('pitch') || text.includes('deadline') || text.includes('tonight') || text.includes('submit')) {
      urgency = 'critical';
      actionItems.push('Submit architecture diagram and slide deck before deadline tonight');
      actionItems.push('Verify live demo endpoint is healthy and accessible');
    }
    if (text.includes('compliance') || text.includes('audit')) {
      actionItems.push('Review model dispatch audit logs against NIST safety requirements');
    }
    if (text.includes('attached') || text.includes('attachment')) {
      actionItems.push('Ingest attached dataset/report into JARVIS knowledge base');
    }
  }

  if (actionItems.length === 0) {
    actionItems.push('Review thread and archive or respond as appropriate');
  }

  return {
    threadId,
    summary: `Executive briefing on "${thread.subject}": ${thread.snippet}`,
    actionItems,
    urgencyLevel: urgency,
    keyParticipants: thread.participantEmails
  };
}

// 4. Draft Preparation & Management
export function createDraft(data: { to: string; subject: string; body: string }): GmailDraft {
  const store = getGmailStore();
  const now = new Date().toISOString();
  const draft: GmailDraft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    to: data.to.trim(),
    subject: data.subject.trim(),
    body: data.body.trim(),
    createdAt: now,
    updatedAt: now
  };

  store.drafts.unshift(draft);
  saveGmailStore(store);
  return draft;
}

export function listDrafts(): GmailDraft[] {
  const store = getGmailStore();
  return store.drafts;
}

export function deleteDraft(draftId: string): boolean {
  const store = getGmailStore();
  const filtered = store.drafts.filter(d => d.id !== draftId);
  if (filtered.length === store.drafts.length) return false;
  store.drafts = filtered;
  saveGmailStore(store);
  return true;
}

// 5. SECURITY: Human-In-The-Loop Send Authorization Gate
// Step A: Request approval & create dispatch verification session
export function prepareEmailDispatch(data: {
  to: string;
  subject: string;
  body: string;
}): DispatchAuthorizationSession {
  const store = getGmailStore();
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute token validity

  const confirmationToken = `auth_gate_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const session: DispatchAuthorizationSession = {
    confirmationToken,
    to: data.to.trim(),
    subject: data.subject.trim(),
    body: data.body.trim(),
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'pending'
  };

  store.dispatches.unshift(session);
  saveGmailStore(store);
  return session;
}

// Step B: Explicitly verify confirmation token, record audit log, and dispatch email
export function confirmAndDispatchEmail(token: string, userApproved: boolean): {
  success: boolean;
  message: string;
  dispatchedEmail?: GmailMessage;
  auditSession?: DispatchAuthorizationSession;
} {
  const store = getGmailStore();
  const session = store.dispatches.find(d => d.confirmationToken === token);

  if (!session) {
    return { success: false, message: 'Invalid or missing dispatch confirmation token.' };
  }

  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'rejected';
    saveGmailStore(store);
    return { success: false, message: 'Authorization token has expired. Please prepare a new send request.' };
  }

  if (!userApproved) {
    session.status = 'rejected';
    saveGmailStore(store);
    return { success: false, message: 'Dispatch authorization explicitly declined by user.' };
  }

  // User confirmed! Mark session authorized and dispatched
  const now = new Date().toISOString();
  const providerMessageId = `gmail_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  session.status = 'dispatched';
  session.dispatchResult = {
    success: true,
    providerId: providerMessageId,
    dispatchedAt: now,
    message: `Message dispatched successfully from ${store.connectedAccount.email} to ${session.to}`
  };

  // Record sent message into inbox sent threads
  const sentMessage: GmailMessage = {
    id: providerMessageId,
    threadId: `thread_sent_${Date.now()}`,
    sender: store.connectedAccount.displayName,
    senderEmail: store.connectedAccount.email,
    recipient: session.to,
    recipientEmail: session.to,
    subject: session.subject,
    body: session.body,
    snippet: session.body.slice(0, 80) + '...',
    date: now,
    isUnread: false,
    isImportant: false,
    hasAttachments: false,
    labels: ['SENT']
  };

  const sentThread: GmailThread = {
    id: sentMessage.threadId,
    subject: sentMessage.subject,
    snippet: sentMessage.snippet,
    messages: [sentMessage],
    lastMessageDate: now,
    participantEmails: [store.connectedAccount.email, session.to],
    isImportant: false,
    isUnread: false,
    labels: ['SENT']
  };

  store.threads.unshift(sentThread);
  saveGmailStore(store);

  return {
    success: true,
    message: `Email verified and dispatched through authorized Gmail account (${store.connectedAccount.email}).`,
    dispatchedEmail: sentMessage,
    auditSession: session
  };
}

// 6. MCP Protocol Interface (JSON-RPC 2.0 compatible)
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const GMAIL_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'search_emails',
    description: 'Search Gmail messages by keywords, sender, subject, date range, or importance flags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'General keyword search string' },
        sender: { type: 'string', description: 'Filter by sender name or email address' },
        subject: { type: 'string', description: 'Filter by subject line substring' },
        after: { type: 'string', description: 'Filter emails after date (YYYY-MM-DD)' },
        before: { type: 'string', description: 'Filter emails before date (YYYY-MM-DD)' },
        isImportant: { type: 'boolean', description: 'Filter by importance indicator' },
        hasAttachment: { type: 'boolean', description: 'Filter emails with attachments' }
      }
    }
  },
  {
    name: 'get_thread',
    description: 'Retrieve full email conversation thread with all replies and attachment metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'The unique thread identifier' }
      },
      required: ['threadId']
    }
  },
  {
    name: 'summarize_email',
    description: 'Generate an executive summary and extract key action items from an email thread using AI.',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Thread identifier to summarize' }
      },
      required: ['threadId']
    }
  },
  {
    name: 'create_draft',
    description: 'Prepare an email draft without sending it.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Body text of the email draft' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'prepare_send_email',
    description: 'Initiate an email dispatch. Generates a secure authorization confirmation token requiring explicit user approval before network dispatch.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Message content' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'confirm_send_email',
    description: 'Finalize and dispatch email after explicit human-in-the-loop verification.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmationToken: { type: 'string', description: 'Secure token from prepare_send_email' },
        userApproved: { type: 'boolean', description: 'Explicit user authorization flag' }
      },
      required: ['confirmationToken', 'userApproved']
    }
  }
];

export async function executeGmailMcpTool(
  toolName: string,
  args: any,
  openaiClient: OpenAI | null
): Promise<{ result: any; isError?: boolean }> {
  switch (toolName) {
    case 'search_emails':
      return { result: searchEmails(args || {}) };
    case 'get_thread':
      return { result: getThreadById(args?.threadId) };
    case 'summarize_email':
      return { result: await summarizeEmailThread(args?.threadId, openaiClient) };
    case 'create_draft':
      return { result: createDraft(args) };
    case 'list_drafts':
      return { result: listDrafts() };
    case 'prepare_send_email':
      return { result: prepareEmailDispatch(args) };
    case 'confirm_send_email':
      return { result: confirmAndDispatchEmail(args.confirmationToken, Boolean(args.userApproved)) };
    default:
      return { isError: true, result: `Unknown tool: ${toolName}` };
  }
}
