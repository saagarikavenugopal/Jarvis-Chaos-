import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DriveFile {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.document' | 'application/vnd.google-apps.spreadsheet' | 'application/vnd.google-apps.presentation' | 'application/pdf' | 'application/json' | 'text/plain' | 'image/png';
  sizeBytes: number;
  createdDate: string;
  modifiedDate: string;
  ownerEmail: string;
  sharedWith: string[];
  starred: boolean;
  webViewLink: string;
  contentPreview: string;
  folderId?: string;
  tags?: string[];
}

export interface DriveShareSession {
  confirmationToken: string;
  fileId: string;
  fileName: string;
  recipientEmail: string;
  role: 'reader' | 'commenter' | 'editor';
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'authorized' | 'rejected' | 'shared';
  shareResult?: {
    success: boolean;
    sharedAt: string;
    message: string;
  };
}

export interface DriveStore {
  files: DriveFile[];
  shareSessions: DriveShareSession[];
  quota: {
    usedBytes: number;
    totalBytes: number;
  };
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
const DB_FILE = path.join(DATA_DIR, 'google_drive_store.json');

function getInitialDriveStore(): DriveStore {
  const now = new Date();
  const formatDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const files: DriveFile[] = [
    {
      id: 'file_pitch_deck',
      name: 'JARVIS — Autonomous AI Hackathon Pitch Deck.gslides',
      mimeType: 'application/vnd.google-apps.presentation',
      sizeBytes: 8420000,
      createdDate: formatDate(3),
      modifiedDate: formatDate(0),
      ownerEmail: 'jarvispersonalai170@gmail.com',
      sharedWith: ['judges@ai-hackathon.org'],
      starred: true,
      webViewLink: 'https://docs.google.com/presentation/d/jarvis-pitch-deck/view',
      contentPreview: 'Slide 1: JARVIS — The Autonomous Agentic Operating System.\nSlide 2: Cross-Device Temporal Handover & Self-Healing Architecture.\nSlide 3: Real-Time MCP Integrations: Gmail, Google Drive, Google Calendar.\nSlide 4: Gamified Productivity & Procrastination Elimination Engine.',
      tags: ['Hackathon', 'Pitch', 'Core']
    },
    {
      id: 'file_arch_doc',
      name: 'JARVIS System Architecture & MCP Gateway Specification.gdoc',
      mimeType: 'application/vnd.google-apps.document',
      sizeBytes: 154000,
      createdDate: formatDate(5),
      modifiedDate: formatDate(1),
      ownerEmail: 'jarvispersonalai170@gmail.com',
      sharedWith: [],
      starred: true,
      webViewLink: 'https://docs.google.com/document/d/jarvis-architecture/view',
      contentPreview: 'Technical specification describing the dual JSON-RPC 2.0 MCP interface, local caching with Supabase cloud synchronizer, and biometric/token-based Human-In-The-Loop security dispatch gates.',
      tags: ['Architecture', 'Technical', 'Docs']
    },
    {
      id: 'file_eval_metrics',
      name: 'Benchmark Results & Model Evaluation Matrix.gsheet',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      sizeBytes: 420000,
      createdDate: formatDate(2),
      modifiedDate: formatDate(0),
      ownerEmail: 'jarvispersonalai170@gmail.com',
      sharedWith: ['research@google.com'],
      starred: false,
      webViewLink: 'https://docs.google.com/spreadsheets/d/jarvis-eval-matrix/view',
      contentPreview: 'Sheet 1: Latency benchmarks across local Ollama and OpenAI GPT-4.1-mini. Average response time: 240ms. Task parsing accuracy: 98.4% across 120 zero-shot instructions.',
      tags: ['Benchmarks', 'Data']
    },
    {
      id: 'file_whitepaper_pdf',
      name: 'Procrastination Elimination in Gamified Cognitive Agents.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2450000,
      createdDate: formatDate(7),
      modifiedDate: formatDate(4),
      ownerEmail: 'jarvispersonalai170@gmail.com',
      sharedWith: [],
      starred: false,
      webViewLink: 'https://drive.google.com/file/d/procrastination-whitepaper/view',
      contentPreview: 'Research paper on psychological activation energy, behavioral nudges, and idempotent XP reward algorithms designed to defeat executive dysfunction without shaming.',
      tags: ['Research', 'Psychology']
    }
  ];

  return {
    files,
    shareSessions: [],
    quota: {
      usedBytes: 11434000,
      totalBytes: 16106127360 // 15 GB
    },
    connectedAccount: {
      email: process.env.GDRIVE_USER_EMAIL || 'jarvispersonalai170@gmail.com',
      displayName: 'JARVIS Authorized Operator',
      isConnected: true,
      tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ]
    }
  };
}

function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const bundledFile = path.join(BUNDLED_DATA_DIR, 'google_drive_store.json');
    if (fs.existsSync(bundledFile)) {
      try {
        fs.copyFileSync(bundledFile, DB_FILE);
        return;
      } catch {}
    }
    const initial = getInitialDriveStore();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function getDriveStore(): DriveStore {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      files: Array.isArray(data.files) ? data.files : [],
      shareSessions: Array.isArray(data.shareSessions) ? data.shareSessions : [],
      quota: data.quota || { usedBytes: 11434000, totalBytes: 16106127360 },
      connectedAccount: {
        email: process.env.GDRIVE_USER_EMAIL || data.connectedAccount?.email || 'jarvispersonalai170@gmail.com',
        displayName: data.connectedAccount?.displayName || 'JARVIS Authorized Operator',
        isConnected: true,
        tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString(),
        scope: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.metadata.readonly'
        ]
      }
    };
  } catch (err) {
    console.warn('Failed reading google_drive_store.json, resetting to initial state:', err);
    const initial = getInitialDriveStore();
    saveDriveStore(initial);
    return initial;
  }
}

export function saveDriveStore(store: DriveStore): void {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving google_drive_store.json:', err);
  }
}

// 1. Search Files
export function searchDriveFiles(filter: {
  query?: string;
  mimeType?: string;
  starred?: boolean;
}): { files: DriveFile[]; totalCount: number } {
  const store = getDriveStore();
  let result = [...store.files];

  if (filter.starred !== undefined) {
    result = result.filter(f => f.starred === filter.starred);
  }

  if (filter.mimeType) {
    result = result.filter(f => f.mimeType.toLowerCase().includes(filter.mimeType!.toLowerCase()));
  }

  if (filter.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    result = result.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.contentPreview.toLowerCase().includes(q) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  return { files: result, totalCount: result.length };
}

// 2. Get File By ID
export function getDriveFileById(fileId: string): DriveFile | null {
  const store = getDriveStore();
  return store.files.find(f => f.id === fileId) || null;
}

// 3. Summarize Drive File with AI
export async function summarizeDriveFile(
  fileId: string,
  openaiClient: OpenAI | null
): Promise<{ summary: string; keyInsights: string[]; tags: string[] }> {
  const file = getDriveFileById(fileId);
  if (!file) throw new Error(`Drive file with id "${fileId}" not found.`);

  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are JARVIS Google Drive Intelligence Assistant. Analyze the document preview and extract an executive summary, 3-4 key bullet insights, and 3 high-relevance tags. Return valid JSON only: {"summary": string, "keyInsights": string[], "tags": string[]}.`
          },
          {
            role: 'user',
            content: `Document Name: "${file.name}"\nMIME Type: ${file.mimeType}\nContent:\n${file.contentPreview}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      const parsed = JSON.parse(response.choices[0].message?.content || '{}');
      if (parsed.summary && Array.isArray(parsed.keyInsights)) {
        return {
          summary: parsed.summary,
          keyInsights: parsed.keyInsights,
          tags: parsed.tags || file.tags || []
        };
      }
    } catch (aiErr) {
      console.warn('OpenAI Drive file summarization failed, falling back to deterministic extraction:', aiErr);
    }
  }

  // Deterministic fallback
  const lines = file.contentPreview.split('\n').filter(l => l.trim().length > 0);
  return {
    summary: `Executive summary of "${file.name}": Document details technical deliverables and milestones for autonomous system operation.`,
    keyInsights: lines.slice(0, 4).map(l => l.replace(/^[-•*]\s*/, '')),
    tags: file.tags || ['GoogleDrive', 'Document']
  };
}

// 4. Create / Upload New Drive File
export function createDriveFile(data: {
  name: string;
  mimeType?: DriveFile['mimeType'];
  content: string;
  tags?: string[];
}): DriveFile {
  const store = getDriveStore();
  const now = new Date().toISOString();
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newFile: DriveFile = {
    id: fileId,
    name: data.name.trim(),
    mimeType: data.mimeType || 'application/vnd.google-apps.document',
    sizeBytes: Buffer.byteLength(data.content, 'utf-8'),
    createdDate: now,
    modifiedDate: now,
    ownerEmail: store.connectedAccount.email,
    sharedWith: [],
    starred: false,
    webViewLink: `https://docs.google.com/document/d/${fileId}/view`,
    contentPreview: data.content.trim(),
    tags: data.tags || ['JARVIS Generated']
  };

  store.files.unshift(newFile);
  store.quota.usedBytes += newFile.sizeBytes;
  saveDriveStore(store);
  return newFile;
}

// 5. Delete File
export function deleteDriveFile(fileId: string): boolean {
  const store = getDriveStore();
  const filtered = store.files.filter(f => f.id !== fileId);
  if (filtered.length === store.files.length) return false;
  store.files = filtered;
  saveDriveStore(store);
  return true;
}

// 6. Security Gate: Prepare Share Authorization Session
export function prepareShareDriveFile(data: {
  fileId: string;
  recipientEmail: string;
  role?: 'reader' | 'commenter' | 'editor';
}): DriveShareSession {
  const store = getDriveStore();
  const file = store.files.find(f => f.id === data.fileId);
  if (!file) throw new Error('File not found to share.');

  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  const confirmationToken = `share_gate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const session: DriveShareSession = {
    confirmationToken,
    fileId: file.id,
    fileName: file.name,
    recipientEmail: data.recipientEmail.trim(),
    role: data.role || 'reader',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'pending'
  };

  store.shareSessions.unshift(session);
  saveDriveStore(store);
  return session;
}

// 7. Security Gate: Confirm and Share Drive File
export function confirmAndShareDriveFile(token: string, userApproved: boolean): {
  success: boolean;
  message: string;
  file?: DriveFile;
  session?: DriveShareSession;
} {
  const store = getDriveStore();
  const session = store.shareSessions.find(s => s.confirmationToken === token);
  if (!session) return { success: false, message: 'Invalid confirmation token.' };

  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'rejected';
    saveDriveStore(store);
    return { success: false, message: 'Security authorization token expired. Please re-initiate share.' };
  }

  if (!userApproved) {
    session.status = 'rejected';
    saveDriveStore(store);
    return { success: false, message: 'Share request was declined by user.' };
  }

  const file = store.files.find(f => f.id === session.fileId);
  if (!file) return { success: false, message: 'Target file no longer exists.' };

  if (!file.sharedWith.includes(session.recipientEmail)) {
    file.sharedWith.push(session.recipientEmail);
  }

  session.status = 'shared';
  session.shareResult = {
    success: true,
    sharedAt: new Date().toISOString(),
    message: `File "${file.name}" shared with ${session.recipientEmail} (${session.role})`
  };

  saveDriveStore(store);
  return {
    success: true,
    message: `Successfully authorized and shared "${file.name}" with ${session.recipientEmail}.`,
    file,
    session
  };
}

// 8. MCP Tool Definitions for Google Drive
export const GDRIVE_MCP_TOOLS = [
  {
    name: 'search_drive_files',
    description: 'Search Google Drive files by keyword, mimeType, or starred status.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword query matching name, preview, or tags' },
        mimeType: { type: 'string', description: 'Filter by MIME type or file format' },
        starred: { type: 'boolean', description: 'Filter starred files only' }
      }
    }
  },
  {
    name: 'get_file_metadata',
    description: 'Retrieve file details, permissions, size, and content preview.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'Unique Drive file ID' }
      },
      required: ['fileId']
    }
  },
  {
    name: 'summarize_drive_file',
    description: 'Synthesize an executive summary and key insights from a Google Drive file using AI.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File ID to analyze' }
      },
      required: ['fileId']
    }
  },
  {
    name: 'create_drive_file',
    description: 'Create a new document, spreadsheet, or notes file in Google Drive.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the new file' },
        content: { type: 'string', description: 'Content preview or body' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags or labels' }
      },
      required: ['name', 'content']
    }
  },
  {
    name: 'prepare_share_drive_file',
    description: 'Initiate a secure file sharing session. Generates a 15-minute token requiring explicit human confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'File to share' },
        recipientEmail: { type: 'string', description: 'Email address of recipient' },
        role: { type: 'string', enum: ['reader', 'commenter', 'editor'] }
      },
      required: ['fileId', 'recipientEmail']
    }
  },
  {
    name: 'confirm_share_drive_file',
    description: 'Authorize and execute Google Drive file sharing after user confirmation.',
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

export async function executeDriveMcpTool(
  toolName: string,
  args: any,
  openaiClient: OpenAI | null
): Promise<{ result: any; isError?: boolean }> {
  switch (toolName) {
    case 'search_drive_files':
      return { result: searchDriveFiles(args || {}) };
    case 'get_file_metadata':
      return { result: getDriveFileById(args?.fileId) };
    case 'summarize_drive_file':
      return { result: await summarizeDriveFile(args?.fileId, openaiClient) };
    case 'create_drive_file':
      return { result: createDriveFile(args) };
    case 'prepare_share_drive_file':
      return { result: prepareShareDriveFile(args) };
    case 'confirm_share_drive_file':
      return { result: confirmAndShareDriveFile(args.confirmationToken, Boolean(args.userApproved)) };
    default:
      return { isError: true, result: `Unknown tool: ${toolName}` };
  }
}
