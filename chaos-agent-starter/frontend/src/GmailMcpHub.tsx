import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  Send,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  Paperclip,
  CheckSquare,
  Star,
  Clock,
  Filter,
  Inbox,
  ArrowLeft,
  RefreshCw,
  FileText,
  User,
  Check,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

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
  date: string;
  isUnread: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  attachments?: GmailAttachment[];
  labels: string[];
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

export interface EmailSummary {
  summary: string;
  actionItems: string[];
  urgency: 'high' | 'medium' | 'low';
  keyParticipants: string[];
}

export interface DispatchSession {
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

interface GmailMcpHubProps {
  apiBaseUrl: string;
  onNavigateToTab?: (tab: string) => void;
}

export const GmailMcpHub: React.FC<GmailMcpHubProps> = ({ apiBaseUrl, onNavigateToTab }) => {
  // State
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [drafts, setDrafts] = useState<GmailDraft[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<GmailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'important' | 'attachments' | 'drafts' | 'sent'>('all');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Summary State
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [threadSummary, setThreadSummary] = useState<EmailSummary | null>(null);
  const [taskAddedIndex, setTaskAddedIndex] = useState<{ [key: number]: boolean }>({});

  // Compose / Draft State
  const [showComposer, setShowComposer] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Security Gate Send Confirmation Modal
  const [dispatchSession, setDispatchSession] = useState<DispatchSession | null>(null);
  const [userExplicitlyApproved, setUserExplicitlyApproved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessReceipt, setSendSuccessReceipt] = useState<{ providerId?: string; message: string } | null>(null);

  // Connected Account
  const [connectedAccount, setConnectedAccount] = useState<{
    email: string;
    displayName: string;
    isConnected: boolean;
    tokenExpiry: string;
    scope: string[];
  }>({
    email: 'user@jarvis-os.ai',
    displayName: 'Autonomous JARVIS Operator',
    isConnected: true,
    tokenExpiry: new Date(Date.now() + 86400000).toISOString(),
    scope: ['https://mail.google.com/', 'gmail.readonly', 'gmail.compose', 'gmail.modify']
  });

  // Fetch threads & account status
  const fetchInbox = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const accRes = await fetch(`${apiBaseUrl}/api/gmail/account`);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.account) setConnectedAccount(accData.account);
      }

      const threadsRes = await fetch(`${apiBaseUrl}/api/gmail/threads`);
      if (threadsRes.ok) {
        const data = await threadsRes.json();
        setThreads(data.threads || []);
        if (data.threads?.length > 0 && !selectedThreadId) {
          setSelectedThreadId(data.threads[0].id);
        }
      }

      const draftsRes = await fetch(`${apiBaseUrl}/api/gmail/drafts`);
      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setDrafts(draftsData.drafts || []);
      }
    } catch (err: any) {
      console.error('Failed to load Gmail inbox:', err);
      setErrorMsg('Could not connect to Gmail MCP server. Showing offline buffered inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [apiBaseUrl]);

  // Load single thread when selected
  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      setThreadSummary(null);
      return;
    }

    const found = threads.find(t => t.id === selectedThreadId);
    if (found) {
      setSelectedThread(found);
      setThreadSummary(null);
      setTaskAddedIndex({});
    } else {
      // Fetch specifically from backend
      fetch(`${apiBaseUrl}/api/gmail/threads/${selectedThreadId}`)
        .then(res => res.json())
        .then(data => {
          if (data.thread) {
            setSelectedThread(data.thread);
            setThreadSummary(null);
          }
        })
        .catch(console.error);
    }
  }, [selectedThreadId, threads, apiBaseUrl]);

  // Trigger AI Thread Summarization
  const handleSummarizeThread = async () => {
    if (!selectedThread) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/gmail/threads/${selectedThread.id}/summarize`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok && data.summary) {
        setThreadSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to summarize thread:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Convert AI Action Item to Smart Task
  const handleConvertToActionTask = async (actionText: string, index: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: actionText,
          description: `Extracted from Gmail Thread "${selectedThread?.subject || 'Inbox'}" via JARVIS AI Summarizer.`,
          priority: threadSummary?.urgency === 'high' ? 'high' : 'medium',
          category: 'Email Follow-up'
        })
      });
      if (res.ok) {
        setTaskAddedIndex(prev => ({ ...prev, [index]: true }));
      }
    } catch (err) {
      console.error('Failed to convert to task:', err);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert('Please fill recipient, subject, and body.');
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/gmail/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
      });
      const data = await res.json();
      if (data.ok && data.draft) {
        setDrafts(prev => [data.draft, ...prev]);
        setShowComposer(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        alert('Draft saved successfully to Gmail MCP store.');
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  // Step 1 of Security Gate: Prepare Send
  const handleInitiateSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert('Please complete recipient, subject, and body before initiating send.');
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/gmail/prepare-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setDispatchSession(data.session);
        setUserExplicitlyApproved(false);
        setSendSuccessReceipt(null);
      }
    } catch (err) {
      console.error('Failed to prepare send session:', err);
      alert('Could not generate send authorization session.');
    }
  };

  // Step 2 of Security Gate: Confirm and Dispatch
  const handleConfirmDispatch = async () => {
    if (!dispatchSession || !userExplicitlyApproved) return;
    setIsSending(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/gmail/confirm-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationToken: dispatchSession.confirmationToken,
          userApproved: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSendSuccessReceipt({
          providerId: data.dispatchedEmail?.id || data.auditSession?.dispatchResult?.providerId,
          message: data.message
        });
        // Refresh inbox so sent email appears
        fetchInbox();
      } else {
        alert(data.message || 'Dispatch was declined by the server.');
      }
    } catch (err) {
      console.error('Failed to dispatch email:', err);
      alert('Network failure during email dispatch.');
    } finally {
      setIsSending(false);
    }
  };

  // Pre-fill composer for replying
  const handleReplyToThread = () => {
    if (!selectedThread) return;
    const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
    setComposeTo(lastMsg ? lastMsg.senderEmail : selectedThread.participantEmails[0] || '');
    setComposeSubject(selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`);
    setComposeBody(`\n\n--- On ${new Date(selectedThread.lastMessageDate).toLocaleDateString()}, ${lastMsg?.sender || 'Sender'} wrote:\n> ${lastMsg?.body || selectedThread.snippet}`);
    setShowComposer(true);
  };

  // Filter threads based on query & selected filter tab
  const filteredThreads = threads.filter(t => {
    if (filterType === 'important' && !t.isImportant) return false;
    if (filterType === 'attachments' && !t.messages.some(m => m.hasAttachments)) return false;
    if (filterType === 'sent' && !t.labels.includes('SENT')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchSnippet = t.snippet.toLowerCase().includes(q);
      const matchParticipants = t.participantEmails.some(p => p.toLowerCase().includes(q));
      const matchMessages = t.messages.some(m => m.sender.toLowerCase().includes(q) || m.body.toLowerCase().includes(q));
      return matchSubject || matchSnippet || matchParticipants || matchMessages;
    }
    return true;
  });

  const importantCount = threads.filter(t => t.isImportant).length;
  const totalAttachments = threads.reduce((acc, t) => acc + t.messages.filter(m => m.hasAttachments).length, 0);

  return (
    <div className="gmail-mcp-container" style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 1. Header HUD & Connection Status */}
      <div
        className="vault-header-card"
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ea4335, #fbbc05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
              }}
            >
              <Mail size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                  Gmail MCP Intelligence Hub
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'var(--pastel-mint)',
                    color: 'var(--pastel-mint-text)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span>
                  MCP Connected
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Model Context Protocol gateway linked with authorized account: <strong style={{ color: 'var(--text-main)' }}>{connectedAccount.email}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchInbox}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}
              title="Sync with Gmail MCP Server"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
                setShowComposer(true);
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13 }}
            >
              <Plus size={16} />
              <span>Compose / Draft</span>
            </button>
          </div>
        </div>

        {/* 4 HUD Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 22,
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ background: 'var(--pastel-sky)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-sky-text)', textTransform: 'uppercase' }}>
              Total Threads
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {threads.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Synchronized via MCP Protocol</div>
          </div>

          <div style={{ background: 'var(--pastel-pink)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-pink-text)', textTransform: 'uppercase' }}>
              Important Messages
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {importantCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Flagged for high attention</div>
          </div>

          <div style={{ background: 'var(--pastel-lavender)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-lavender-text)', textTransform: 'uppercase' }}>
              Saved Drafts
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {drafts.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Ready for review & dispatch</div>
          </div>

          <div style={{ background: 'var(--pastel-mint)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-mint-text)', textTransform: 'uppercase' }}>
              Security Send Gate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--secondary-text)', marginTop: 4 }}>
              Active
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Zero unauthorized transmissions</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 20
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 500 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search emails by sender, subject, or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, height: 42, borderRadius: 10 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'important', 'attachments', 'drafts', 'sent'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: filterType === tab ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: filterType === tab ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                color: filterType === tab ? 'var(--primary-text)' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'all' && 'All Threads'}
              {tab === 'important' && `Important (${importantCount})`}
              {tab === 'attachments' && 'Has Attachments'}
              {tab === 'drafts' && `Drafts (${drafts.length})`}
              {tab === 'sent' && 'Sent'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Workspace: Two-Column Thread Browser & AI Conversation Hub */}
      {filterType === 'drafts' ? (
        /* Drafts List View */
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            padding: 24
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Prepared Email Drafts</h3>
            <button
              className="btn-primary"
              onClick={() => {
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
                setShowComposer(true);
              }}
              style={{ padding: '8px 16px', fontSize: 12 }}
            >
              <Plus size={14} /> New Draft
            </button>
          </div>
          {drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Inbox size={40} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
              <p>No drafts currently saved. Click "+ New Draft" to prepare an email.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {drafts.map(draft => (
                <div
                  key={draft.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>{draft.subject || '(No Subject)'}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>To: {draft.to}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {draft.body}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => {
                        setComposeTo(draft.to);
                        setComposeSubject(draft.subject);
                        setComposeBody(draft.body);
                        setShowComposer(true);
                      }}
                    >
                      Open & Send
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 10px', color: 'var(--error)' }}
                      onClick={async () => {
                        await fetch(`${apiBaseUrl}/api/gmail/drafts/${draft.id}`, { method: 'DELETE' });
                        setDrafts(prev => prev.filter(d => d.id !== draft.id));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Master-Detail Two Column View */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 20, minHeight: 600 }}>
          {/* Left Column: Thread List */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 280px)'
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                INBOX ({filteredThreads.length})
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                Sort: Most Recent
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {filteredThreads.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Inbox size={36} style={{ opacity: 0.35, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, margin: 0 }}>No emails found matching your filter.</p>
                </div>
              ) : (
                filteredThreads.map(thread => {
                  const isSelected = selectedThreadId === thread.id;
                  const firstMsg = thread.messages[0];
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        marginBottom: 6,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                        background: isSelected ? 'var(--bg-surface-active)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: thread.isImportant ? 'var(--pastel-pink)' : 'var(--primary-subtle)',
                              color: thread.isImportant ? 'var(--pastel-pink-text)' : 'var(--primary-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {firstMsg ? firstMsg.sender.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: thread.isUnread ? 800 : 600,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {firstMsg ? firstMsg.sender : 'Sender'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                          {new Date(thread.lastMessageDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: thread.isUnread ? 700 : 500,
                          color: 'var(--text-main)',
                          marginTop: 6,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {thread.subject}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginTop: 3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.4
                        }}
                      >
                        {thread.snippet}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        {thread.isImportant && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--pastel-pink)',
                              color: 'var(--pastel-pink-text)'
                            }}
                          >
                            IMPORTANT
                          </span>
                        )}
                        {thread.messages.some(m => m.hasAttachments) && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--pastel-sky)',
                              color: 'var(--pastel-sky-text)'
                            }}
                          >
                            <Paperclip size={10} /> Attachment
                          </span>
                        )}
                        {thread.labels.includes('SENT') && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--pastel-mint)',
                              color: 'var(--pastel-mint-text)'
                            }}
                          >
                            SENT
                          </span>
                        )}
                        {thread.messages.length > 1 && (
                          <span style={{ fontSize: 10, color: 'var(--text-subtle)', marginLeft: 'auto' }}>
                            {thread.messages.length} msgs
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation & AI Synthesis Hub */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 280px)'
            }}
          >
            {selectedThread ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Thread Header */}
                <div
                  style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-muted)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedThread.subject}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Participants: {selectedThread.participantEmails.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={handleSummarizeThread}
                      disabled={summaryLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #ede9fe, #fce7f3)',
                        borderColor: '#c084fc',
                        color: '#6d28d9'
                      }}
                    >
                      <Sparkles size={14} className={summaryLoading ? 'animate-spin' : ''} />
                      <span>{summaryLoading ? 'Analyzing...' : 'Summarize with JARVIS'}</span>
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleReplyToThread}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12 }}
                    >
                      <Send size={13} />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  {/* AI Thread Summary Card */}
                  {threadSummary && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(237, 233, 254, 0.4), rgba(254, 243, 199, 0.4))',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: 12,
                        padding: '16px 20px',
                        marginBottom: 24,
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Sparkles size={16} color="var(--primary)" />
                          <strong style={{ fontSize: 14, color: 'var(--primary-text)' }}>
                            JARVIS AI Executive Summary
                          </strong>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: threadSummary.urgency === 'high' ? 'var(--pastel-pink)' : 'var(--pastel-sky)',
                            color: threadSummary.urgency === 'high' ? 'var(--pastel-pink-text)' : 'var(--pastel-sky-text)',
                            textTransform: 'uppercase'
                          }}
                        >
                          Urgency: {threadSummary.urgency}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-main)' }}>
                        {threadSummary.summary}
                      </p>

                      {threadSummary.actionItems?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                            Extracted Action Items:
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {threadSummary.actionItems.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'var(--bg-surface-elevated)',
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: 12
                                }}
                              >
                                <span style={{ color: 'var(--text-main)' }}>• {item}</span>
                                <button
                                  className="btn-secondary"
                                  disabled={taskAddedIndex[idx]}
                                  onClick={() => handleConvertToActionTask(item, idx)}
                                  style={{
                                    fontSize: 11,
                                    padding: '4px 8px',
                                    gap: 4,
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  {taskAddedIndex[idx] ? (
                                    <>
                                      <Check size={12} color="#10b981" /> Added to Tasks
                                    </>
                                  ) : (
                                    <>
                                      <CheckSquare size={12} /> Add to Tasks
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message History Timeline */}
                  <div style={{ display: 'grid', gap: 20 }}>
                    {selectedThread.messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 12,
                          padding: '16px 20px',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: 'var(--primary-subtle)',
                                color: 'var(--primary-text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 13
                              }}
                            >
                              {msg.sender.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                                {msg.sender} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>&lt;{msg.senderEmail}&gt;</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                To: {msg.recipient} &lt;{msg.recipientEmail}&gt;
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                            {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>

                        {/* Message Body */}
                        <div
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.65,
                            color: 'var(--text-main)',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit'
                          }}
                        >
                          {msg.body}
                        </div>

                        {/* Attachments Section */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div
                            style={{
                              marginTop: 16,
                              paddingTop: 14,
                              borderTop: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Paperclip size={13} /> Attachments ({msg.attachments.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {msg.attachments.map(att => (
                                <div
                                  key={att.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--pastel-sky)',
                                    fontSize: 12,
                                    color: 'var(--pastel-sky-text)'
                                  }}
                                >
                                  <FileText size={14} />
                                  <span style={{ fontWeight: 600 }}>{att.filename}</span>
                                  <span style={{ fontSize: 10, opacity: 0.8 }}>({Math.round(att.sizeBytes / 1024)} KB)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Select an email thread from the inbox to read messages and run AI analysis.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Compose / Edit Draft Drawer Modal */}
      {showComposer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 680,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              padding: 28,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                  Compose Verified Email
                </h3>
              </div>
              <button
                onClick={() => setShowComposer(false)}
                className="btn-secondary"
                style={{ padding: '6px 10px', borderRadius: 8 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>
                  Recipient Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Subject of the email"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>
                  Message Content
                </label>
                <textarea
                  className="form-control"
                  style={{ minHeight: 180, resize: 'vertical' }}
                  placeholder="Draft your message or paste synthesis briefing here..."
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                />
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--pastel-lavender)',
                  fontSize: 12,
                  color: 'var(--pastel-lavender-text)',
                  lineHeight: 1.5
                }}
              >
                🔒 <strong>Security Send Policy:</strong> Emails are never dispatched without your explicit review and authorization. Clicking "Prepare Secure Dispatch" locks the message into a 15-minute verification session.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={savingDraft}
                  onClick={handleSaveDraft}
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  {savingDraft ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleInitiateSend}
                  style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Shield size={15} />
                  <span>Prepare Secure Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. STRICT SECURITY GATE: Human-in-the-Loop Confirmation Modal */}
      {dispatchSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 10, 30, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '2px solid var(--primary)',
              borderRadius: 18,
              width: '100%',
              maxWidth: 620,
              boxShadow: '0 25px 60px rgba(139, 92, 246, 0.25)',
              padding: 30,
              position: 'relative'
            }}
          >
            {sendSuccessReceipt ? (
              /* Success Confirmation */
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--pastel-mint)',
                    color: 'var(--pastel-mint-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                  Email Dispatched Successfully
                </h3>
                <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--text-muted)' }}>
                  {sendSuccessReceipt.message}
                </p>
                {sendSuccessReceipt.providerId && (
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      background: 'var(--bg-surface)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      display: 'inline-block',
                      marginBottom: 20
                    }}
                  >
                    Provider Reference ID: {sendSuccessReceipt.providerId}
                  </div>
                )}
                <div>
                  <button
                    className="btn-primary"
                    style={{ padding: '10px 24px' }}
                    onClick={() => {
                      setDispatchSession(null);
                      setShowComposer(false);
                      setSendSuccessReceipt(null);
                    }}
                  >
                    Done & Return to Inbox
                  </button>
                </div>
              </div>
            ) : (
              /* Authorization Gate Form */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>
                      Security Gate: Confirm Email Dispatch
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Authorized Provider: <strong>{connectedAccount.email}</strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16
                  }}
                >
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>To:</strong>{' '}
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{dispatchSession.to}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Subject:</strong>{' '}
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{dispatchSession.subject}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Message Content:</strong>
                      <div
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                          maxHeight: 140,
                          overflowY: 'auto',
                          fontSize: 12,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {dispatchSession.body}
                      </div>
                    </div>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    color: 'var(--text-main)',
                    marginBottom: 20
                  }}
                >
                  <input
                    type="checkbox"
                    checked={userExplicitlyApproved}
                    onChange={e => setUserExplicitlyApproved(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    I have reviewed the recipient, subject, and content. I grant explicit authorization to dispatch this email from my connected Gmail account.
                  </span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setDispatchSession(null)}
                    style={{ padding: '10px 18px', fontSize: 13 }}
                  >
                    Cancel / Abort
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!userExplicitlyApproved || isSending}
                    onClick={handleConfirmDispatch}
                    style={{
                      padding: '10px 22px',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: userExplicitlyApproved ? 1 : 0.5
                    }}
                  >
                    <Send size={14} />
                    <span>{isSending ? 'Verifying & Dispatching...' : 'Authorize & Dispatch'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
