import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  Star,
  RefreshCw,
  FileText,
  ExternalLink,
  Share2,
  Sparkles,
  CheckSquare,
  Check,
  Folder,
  Layers,
  FileSpreadsheet,
  Presentation,
  File
} from 'lucide-react';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdDate: string;
  modifiedDate: string;
  ownerEmail: string;
  sharedWith: string[];
  starred: boolean;
  webViewLink: string;
  contentPreview: string;
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

interface GoogleDriveMcpHubProps {
  apiBaseUrl: string;
  onNavigateToTab?: (tab: string) => void;
}

export const GoogleDriveMcpHub: React.FC<GoogleDriveMcpHubProps> = ({ apiBaseUrl }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'doc' | 'sheet' | 'slide' | 'pdf' | 'starred'>('all');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ usedBytes: number; totalBytes: number }>({
    usedBytes: 11434000,
    totalBytes: 16106127360
  });

  // AI Summary State
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [fileSummary, setFileSummary] = useState<{ summary: string; keyInsights: string[]; tags: string[] } | null>(null);
  const [taskAddedIndex, setTaskAddedIndex] = useState<{ [key: number]: boolean }>({});

  // Create File State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<string>('application/vnd.google-apps.document');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileTags, setNewFileTags] = useState('');

  // Share Security Gate State
  const [shareSession, setShareSession] = useState<DriveShareSession | null>(null);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'commenter' | 'editor'>('reader');
  const [userExplicitlyApproved, setUserExplicitlyApproved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);

  // Connected Account
  const [connectedAccount, setConnectedAccount] = useState<{
    email: string;
    displayName: string;
    isConnected: boolean;
    tokenExpiry: string;
  }>({
    email: 'jarvispersonalai170@gmail.com',
    displayName: 'Autonomous JARVIS Operator',
    isConnected: true,
    tokenExpiry: new Date(Date.now() + 86400000 * 30).toISOString()
  });

  const fetchDriveData = async () => {
    setLoading(true);
    try {
      const accRes = await fetch(`${apiBaseUrl}/api/drive/account`);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.account) setConnectedAccount(accData.account);
        if (accData.quota) setQuota(accData.quota);
      }

      const filesRes = await fetch(`${apiBaseUrl}/api/drive/files`);
      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
        if (data.files?.length > 0 && !selectedFileId) {
          setSelectedFileId(data.files[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load Google Drive store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveData();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedFileId) {
      setSelectedFile(null);
      setFileSummary(null);
      return;
    }
    const found = files.find(f => f.id === selectedFileId);
    if (found) {
      setSelectedFile(found);
      setFileSummary(null);
      setTaskAddedIndex({});
    }
  }, [selectedFileId, files]);

  // Summarize File
  const handleSummarizeFile = async () => {
    if (!selectedFile) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/drive/files/${selectedFile.id}/summarize`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok && data.summary) {
        setFileSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to summarize file:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Convert insight to task
  const handleConvertInsightToTask = async (insight: string, idx: number) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: insight,
          description: `Extracted from Google Drive file "${selectedFile?.name}" via JARVIS AI Analyzer.`,
          priority: 'medium',
          category: 'Document Follow-up'
        })
      });
      if (res.ok) {
        setTaskAddedIndex(prev => ({ ...prev, [idx]: true }));
      }
    } catch (err) {
      console.error('Failed to convert insight to task:', err);
    }
  };

  // Create File
  const handleCreateFile = async () => {
    if (!newFileName.trim() || !newFileContent.trim()) {
      alert('Please fill out file title and content.');
      return;
    }

    try {
      const tagsArray = newFileTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`${apiBaseUrl}/api/drive/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFileName,
          mimeType: newFileType,
          content: newFileContent,
          tags: tagsArray.length > 0 ? tagsArray : ['User Created']
        })
      });
      const data = await res.json();
      if (data.ok && data.file) {
        setFiles(prev => [data.file, ...prev]);
        setSelectedFileId(data.file.id);
        setShowCreateModal(false);
        setNewFileName('');
        setNewFileContent('');
        setNewFileTags('');
      }
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  // Step 1: Initiate Share Security Gate
  const handleInitiateShare = async () => {
    if (!selectedFile || !shareRecipient.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/drive/prepare-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedFile.id,
          recipientEmail: shareRecipient,
          role: shareRole
        })
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setShareSession(data.session);
        setUserExplicitlyApproved(false);
        setShareSuccessMessage(null);
      }
    } catch (err) {
      console.error('Failed to prepare share session:', err);
    }
  };

  // Step 2: Confirm and Authorize Share
  const handleConfirmShare = async () => {
    if (!shareSession || !userExplicitlyApproved) return;
    setIsSharing(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/drive/confirm-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationToken: shareSession.confirmationToken,
          userApproved: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        setShareSuccessMessage(data.message);
        fetchDriveData();
      } else {
        alert(data.message || 'Share authorization was declined.');
      }
    } catch (err) {
      console.error('Failed to confirm share:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document')) return <FileText size={18} color="#2563eb" />;
    if (mimeType.includes('spreadsheet')) return <FileSpreadsheet size={18} color="#16a34a" />;
    if (mimeType.includes('presentation')) return <Presentation size={18} color="#ea580c" />;
    return <File size={18} color="#9333ea" />;
  };

  const filteredFiles = files.filter(f => {
    if (filterType === 'starred' && !f.starred) return false;
    if (filterType === 'doc' && !f.mimeType.includes('document')) return false;
    if (filterType === 'sheet' && !f.mimeType.includes('spreadsheet')) return false;
    if (filterType === 'slide' && !f.mimeType.includes('presentation')) return false;
    if (filterType === 'pdf' && !f.mimeType.includes('pdf')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchPreview = f.contentPreview.toLowerCase().includes(q);
      const matchTags = f.tags?.some(t => t.toLowerCase().includes(q));
      return matchName || matchPreview || matchTags;
    }
    return true;
  });

  const usedMB = (quota.usedBytes / (1024 * 1024)).toFixed(1);
  const totalGB = (quota.totalBytes / (1024 * 1024 * 1024)).toFixed(0);
  const starredCount = files.filter(f => f.starred).length;

  return (
    <div className="google-drive-hub-container" style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
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
                background: 'linear-gradient(135deg, #4285f4, #34a853)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.25)'
              }}
            >
              <HardDrive size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                  Google Drive MCP Hub
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
                Google Drive Storage linked with authorized account: <strong style={{ color: 'var(--text-main)' }}>{connectedAccount.email}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchDriveData}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13 }}
            >
              <Plus size={16} />
              <span>Create / Upload Document</span>
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
              Total Files
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {files.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Synchronized via Google Drive MCP</div>
          </div>

          <div style={{ background: 'var(--pastel-lavender)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-lavender-text)', textTransform: 'uppercase' }}>
              Starred Documents
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {starredCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>High-priority resources</div>
          </div>

          <div style={{ background: 'var(--pastel-mint)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-mint-text)', textTransform: 'uppercase' }}>
              Storage Quota
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--secondary-text)', marginTop: 4 }}>
              {usedMB} MB <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/ {totalGB} GB</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Google Workspace Tier</div>
          </div>

          <div style={{ background: 'var(--pastel-peach)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-peach-text)', textTransform: 'uppercase' }}>
              Security Share Gate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#c2410c', marginTop: 4 }}>
              Protected
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Zero unauthorized document sharing</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 500 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search Google Drive files by title, contents, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, height: 42, borderRadius: 10 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'doc', 'sheet', 'slide', 'pdf', 'starred'] as const).map(tab => (
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
              {tab === 'all' && 'All Files'}
              {tab === 'doc' && 'Google Docs'}
              {tab === 'sheet' && 'Sheets'}
              {tab === 'slide' && 'Slides'}
              {tab === 'pdf' && 'PDFs'}
              {tab === 'starred' && `Starred (${starredCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Two-Column Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 20, minHeight: 600 }}>
        {/* Left Column: Files List */}
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
              FILES ({filteredFiles.length})
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Drive Root</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Folder size={36} style={{ opacity: 0.35, margin: '0 auto 10px' }} />
                <p style={{ fontSize: 13, margin: 0 }}>No files match your query.</p>
              </div>
            ) : (
              filteredFiles.map(file => {
                const isSelected = selectedFileId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ marginTop: 2 }}>{getFileIcon(file.mimeType)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {file.name}
                          </span>
                          {file.starred && <Star size={13} fill="#f59e0b" color="#f59e0b" />}
                        </div>

                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                          Modified {new Date(file.modifiedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {Math.round(file.sizeBytes / 1024)} KB
                        </div>

                        {file.tags && file.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            {file.tags.map((tag, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'var(--pastel-sky)',
                                  color: 'var(--pastel-sky-text)'
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: File Inspector & AI Intelligence */}
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
          {selectedFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Header */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getFileIcon(selectedFile.mimeType)}
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedFile.name}
                    </h3>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Owner: {selectedFile.ownerEmail} • Size: {Math.round(selectedFile.sizeBytes / 1024)} KB
                    {selectedFile.sharedWith.length > 0 && ` • Shared with: ${selectedFile.sharedWith.join(', ')}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    onClick={handleSummarizeFile}
                    disabled={summaryLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ede9fe, #d1fae5)',
                      borderColor: '#10b981',
                      color: '#065f46'
                    }}
                  >
                    <Sparkles size={14} className={summaryLoading ? 'animate-spin' : ''} />
                    <span>{summaryLoading ? 'Analyzing...' : 'Summarize with JARVIS'}</span>
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShareRecipient('');
                      setShareSession(null);
                      setUserExplicitlyApproved(false);
                      setShareSuccessMessage(null);
                      setShareSession({
                        confirmationToken: `token_ui_${Date.now()}`,
                        fileId: selectedFile.id,
                        fileName: selectedFile.name,
                        recipientEmail: '',
                        role: 'reader',
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 900000).toISOString(),
                        status: 'pending'
                      });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12 }}
                  >
                    <Share2 size={13} />
                    <span>Share File</span>
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* AI Document Summary Card */}
                {fileSummary && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.4), rgba(224, 242, 254, 0.4))',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: 12,
                      padding: '16px 20px',
                      marginBottom: 20
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Sparkles size={16} color="#059669" />
                      <strong style={{ fontSize: 14, color: '#065f46' }}>JARVIS Document Synthesis</strong>
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-main)' }}>
                      {fileSummary.summary}
                    </p>
                    {fileSummary.keyInsights?.length > 0 && (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Key Extracted Takeaways:</div>
                        {fileSummary.keyInsights.map((insight, idx) => (
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
                            <span>• {insight}</span>
                            <button
                              className="btn-secondary"
                              disabled={taskAddedIndex[idx]}
                              onClick={() => handleConvertInsightToTask(insight, idx)}
                              style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
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
                    )}
                  </div>
                )}

                {/* Document Preview Box */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
                    Document Preview Content
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-mono, monospace)',
                      background: 'var(--bg-surface-muted)',
                      padding: 16,
                      borderRadius: 8
                    }}
                  >
                    {selectedFile.contentPreview}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select a file to inspect metadata and run AI analysis.
            </div>
          )}
        </div>
      </div>

      {/* 4. Create File Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 16, width: '100%', maxWidth: 640, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HardDrive size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Create Google Drive File</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '6px 10px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>File Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Q4 Autonomous Execution Plan"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Document Format</label>
                <select
                  className="form-control"
                  value={newFileType}
                  onChange={e => setNewFileType(e.target.value)}
                >
                  <option value="application/vnd.google-apps.document">Google Docs (.gdoc)</option>
                  <option value="application/vnd.google-apps.spreadsheet">Google Sheets (.gsheet)</option>
                  <option value="application/vnd.google-apps.presentation">Google Slides (.gslides)</option>
                  <option value="text/plain">Plain Text (.txt)</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Document Content</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: 160, resize: 'vertical' }}
                  placeholder="Enter initial document content or paste research briefing..."
                  value={newFileContent}
                  onChange={e => setNewFileContent(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Research, Strategy, AI"
                  value={newFileTags}
                  onChange={e => setNewFileTags(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCreateFile}>Save to Drive</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Security Share Gate Modal */}
      {shareSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 10, 30, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', border: '2px solid var(--primary)', borderRadius: 18, width: '100%', maxWidth: 580, padding: 30 }}>
            {shareSuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 14px' }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Document Shared Successfully</h3>
                <p style={{ margin: '8px 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>{shareSuccessMessage}</p>
                <button className="btn-primary" onClick={() => setShareSession(null)}>Close</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Shield size={24} color="var(--primary)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Security Gate: Confirm Document Sharing</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Account: {connectedAccount.email}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 16, fontSize: 13 }}>
                  <div><strong>File:</strong> {shareSession.fileName}</div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Recipient Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="collaborator@example.com"
                      value={shareRecipient}
                      onChange={e => setShareRecipient(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Access Permission</label>
                    <select
                      className="form-control"
                      value={shareRole}
                      onChange={e => setShareRole(e.target.value as any)}
                    >
                      <option value="reader">Viewer (Read Only)</option>
                      <option value="commenter">Commenter</option>
                      <option value="editor">Editor (Full Edit Access)</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12.5, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    checked={userExplicitlyApproved}
                    onChange={e => setUserExplicitlyApproved(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>I explicitly authorize JARVIS to grant external access to this file from my Google Drive account.</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn-secondary" onClick={() => setShareSession(null)}>Cancel</button>
                  <button
                    className="btn-primary"
                    disabled={!userExplicitlyApproved || !shareRecipient.trim() || isSharing}
                    onClick={async () => {
                      // First prepare if needed, then confirm
                      const prepRes = await fetch(`${apiBaseUrl}/api/drive/prepare-share`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileId: shareSession.fileId, recipientEmail: shareRecipient, role: shareRole })
                      });
                      const prepData = await prepRes.json();
                      if (prepData.ok && prepData.session) {
                        const confRes = await fetch(`${apiBaseUrl}/api/drive/confirm-share`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ confirmationToken: prepData.session.confirmationToken, userApproved: true })
                        });
                        const confData = await confRes.json();
                        if (confData.ok) {
                          setShareSuccessMessage(confData.message);
                          fetchDriveData();
                        } else {
                          alert(confData.message);
                        }
                      }
                    }}
                  >
                    {isSharing ? 'Sharing...' : 'Authorize & Share'}
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
