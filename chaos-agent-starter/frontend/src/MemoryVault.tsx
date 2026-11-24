import React, { useState, useEffect } from 'react';
import {
  Compass,
  Star,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Tag,
  Link as LinkIcon,
  Unlink,
  Calendar,
  AlertCircle,
  FolderHeart,
  Bookmark,
  CheckCircle2,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Target,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type MemoryCategory = 'Project Goal' | 'Key Principle' | 'Vision' | 'Reference';
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export interface Memory {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  goalDeadline: string;
  linkedTaskIds: string[];
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemoryVaultProps {
  apiBaseUrl?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const MemoryVault: React.FC<MemoryVaultProps> = ({
  apiBaseUrl = '',
  onNavigateToTab
}) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('Project Goal');
  const [importance, setImportance] = useState<MemoryImportance>('high');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Delete Confirmation Modal State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Link Task Modal State (Clean dedicated modal instead of cramped inline popover)
  const [linkingMemoryId, setLinkingMemoryId] = useState<string | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

  const fetchMemoriesAndTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (onlyFavorites) params.append('favorite', 'true');

      const [memRes, taskRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/memories?${params.toString()}`),
        fetch(`${apiBaseUrl}/api/tasks`)
      ]);

      if (memRes.ok) {
        const data = await memRes.json();
        setMemories(data.memories || []);
      }
      if (taskRes.ok) {
        const tData = await taskRes.json();
        setTasks(tData.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load memory vault data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoriesAndTasks();
  }, [searchQuery, selectedCategory, onlyFavorites]);

  const openCreateModal = () => {
    setEditingMemory(null);
    setTitle('');
    setContent('');
    setCategory('Project Goal');
    setImportance('high');
    setGoalDeadline('');
    setTagInput('');
    setSelectedTaskIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (mem: Memory) => {
    setEditingMemory(mem);
    setTitle(mem.title);
    setContent(mem.content);
    setCategory(mem.category);
    setImportance(mem.importance);
    setGoalDeadline(mem.goalDeadline || '');
    setTagInput(mem.tags.join(', '));
    setSelectedTaskIds(mem.linkedTaskIds || []);
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (editingMemory) {
        const res = await fetch(`${apiBaseUrl}/api/memories/${editingMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            category,
            importance,
            goalDeadline,
            tags,
            linkedTaskIds: selectedTaskIds
          })
        });
        if (res.ok) {
          setToastMessage('Memory updated successfully.');
          setIsModalOpen(false);
          fetchMemoriesAndTasks();
        }
      } else {
        const res = await fetch(`${apiBaseUrl}/api/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            category,
            importance,
            goalDeadline,
            tags,
            linkedTaskIds: selectedTaskIds,
            isFavorite: false
          })
        });
        if (res.ok) {
          setToastMessage('Goal stored in Memory Vault!');
          setIsModalOpen(false);
          fetchMemoriesAndTasks();
        }
      }
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/memories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToastMessage('Memory removed.');
        setDeletingId(null);
        fetchMemoriesAndTasks();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/memories/${id}/favorite`, { method: 'PATCH' });
      if (res.ok) {
        fetchMemoriesAndTasks();
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleLinkTask = async (memoryId: string, taskId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/memories/${memoryId}/link-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      if (res.ok) {
        setToastMessage('Task linked to goal!');
        fetchMemoriesAndTasks();
      }
    } catch (err) {
      console.error('Failed to link task:', err);
    }
  };

  const handleUnlinkTask = async (memoryId: string, taskId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/memories/${memoryId}/unlink-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      if (res.ok) {
        setToastMessage('Task unlinked from goal.');
        fetchMemoriesAndTasks();
      }
    } catch (err) {
      console.error('Failed to unlink task:', err);
    }
  };

  // Metrics summary
  const totalGoals = memories.filter(m => m.category === 'Project Goal').length;
  const totalPrinciples = memories.filter(m => m.category === 'Key Principle' || m.category === 'Vision').length;
  const totalLinkedTasks = memories.reduce((acc, m) => acc + (m.linkedTaskIds?.length || 0), 0);

  const activeTargetMemory = linkingMemoryId ? memories.find(m => m.id === linkingMemoryId) : null;
  const availableTasksToLink = tasks.filter(t => 
    activeTargetMemory && !(activeTargetMemory.linkedTaskIds || []).includes(t.id) &&
    (taskSearchQuery.trim() === '' || t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()))
  );

  return (
    <div className="vault-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="vault-toast-banner">
          <Sparkles size={16} className="toast-sparkle" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="toast-dismiss-btn">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modern Header Section */}
      <div className="vault-header-card">
        <div className="vault-header-info">
          <div className="vault-halo-badge">
            <Compass size={24} />
          </div>
          <div className="vault-title-column">
            <div className="vault-title-line">
              <h1 className="vault-main-title">Memory Vault</h1>
              <span className="vault-count-chip">{memories.length} Stored</span>
            </div>
            <p className="vault-description">
              Long-term project goals, guiding principles, and persistent knowledge linked with active tasks
            </p>
          </div>
        </div>

        <div className="vault-header-actions">
          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={16} />
            <span>New Goal / Memory</span>
          </button>
        </div>
      </div>

      {/* High-Level Overview Metrics (Clean & Spacious) */}
      <div className="vault-metrics-row">
        <div className="vault-stat-box">
          <div className="stat-top">
            <span className="stat-label">Total Vault Items</span>
            <Bookmark size={16} className="stat-icon-violet" />
          </div>
          <span className="stat-value">{memories.length}</span>
          <span className="stat-subtext">Active knowledge base</span>
        </div>

        <div className="vault-stat-box">
          <div className="stat-top">
            <span className="stat-label">Project Goals</span>
            <Target size={16} className="stat-icon-sky" />
          </div>
          <span className="stat-value">{totalGoals}</span>
          <span className="stat-subtext">Strategic objectives</span>
        </div>

        <div className="vault-stat-box">
          <div className="stat-top">
            <span className="stat-label">Principles & Vision</span>
            <Shield size={16} className="stat-icon-purple" />
          </div>
          <span className="stat-value">{totalPrinciples}</span>
          <span className="stat-subtext">Operating axioms</span>
        </div>

        <div className="vault-stat-box">
          <div className="stat-top">
            <span className="stat-label">Linked Tasks</span>
            <LinkIcon size={16} className="stat-icon-emerald" />
          </div>
          <span className="stat-value">{totalLinkedTasks}</span>
          <span className="stat-subtext">Active task connections</span>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="vault-filter-container">
        <div className="vault-search-wrapper">
          <Search size={16} className="search-symbol" />
          <input
            type="text"
            placeholder="Search goals, principles, thesis, or #tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="vault-search-field"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="search-reset-btn">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="vault-tab-strip">
          {[
            { id: 'all', label: 'All Items', count: memories.length },
            { id: 'Project Goal', label: 'Goals', count: totalGoals },
            { id: 'Key Principle', label: 'Principles', count: memories.filter(m => m.category === 'Key Principle').length },
            { id: 'Vision', label: 'Vision', count: memories.filter(m => m.category === 'Vision').length },
            { id: 'Reference', label: 'References', count: memories.filter(m => m.category === 'Reference').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`view-tab-btn ${selectedCategory === tab.id ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`view-tab-btn ${onlyFavorites ? 'active' : ''}`}
          >
            <Star size={13} className={onlyFavorites ? 'star-gold-fill' : ''} />
            <span>Favorites</span>
            <span className="tab-count">{memories.filter(m => m.isFavorite).length}</span>
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {loading ? (
        <div className="vault-loading-card">
          <div className="loading-spinner" />
          <span className="loading-text">Synchronizing Memory Vault...</span>
        </div>
      ) : memories.length === 0 ? (
        <div className="vault-empty-card">
          <FolderHeart size={44} className="empty-vault-icon" />
          <h3 className="empty-vault-title">No Stored Memories Found</h3>
          <p className="empty-vault-desc">
            Store your project goals, core operating principles, or hackathon objectives. They anchor JARVIS when generating anti-procrastination guidance and task suggestions.
          </p>
          <button onClick={openCreateModal} className="btn-primary" style={{ marginTop: 14 }}>
            <Plus size={16} />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="vault-cards-grid">
          {memories.map(mem => {
            const linkedTasks = tasks.filter(t => (mem.linkedTaskIds || []).includes(t.id));
            const categoryClass = mem.category.toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={mem.id} className="vault-item-card">
                {/* Card Header */}
                <div className="card-top-bar">
                  <div className="badge-group">
                    <span className={`vault-category-pill cat-${categoryClass}`}>
                      {mem.category}
                    </span>
                    <span className={`vault-importance-pill imp-${mem.importance}`}>
                      {mem.importance}
                    </span>
                  </div>

                  <div className="card-actions-group">
                    <button
                      onClick={() => handleToggleFavorite(mem.id)}
                      className={`btn-icon ${mem.isFavorite ? 'fav-active' : ''}`}
                      title={mem.isFavorite ? 'Remove star' : 'Star favorite'}
                    >
                      <Star size={14} className={mem.isFavorite ? 'star-gold-fill' : ''} />
                    </button>
                    <button
                      onClick={() => openEditModal(mem)}
                      className="btn-icon"
                      title="Edit memory"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingId(mem.id)}
                      className="btn-icon btn-icon-danger"
                      title="Delete memory"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Title & Content */}
                <h3 className="card-item-title">{mem.title}</h3>
                <p className="card-item-body">{mem.content}</p>

                {/* Deadline & Tags Meta Row */}
                <div className="card-metadata-row">
                  {mem.goalDeadline && (
                    <div className="card-deadline-pill">
                      <Calendar size={13} className="text-muted" />
                      <span>Target: {mem.goalDeadline}</span>
                    </div>
                  )}

                  {mem.tags && mem.tags.length > 0 && (
                    <div className="card-tags-wrap">
                      {mem.tags.map(t => (
                        <span key={t} className="card-tag-pill">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Tasks Section (Clean, De-congested) */}
                <div className="card-linked-tasks-tray">
                  <div className="tasks-tray-header">
                    <span className="tasks-tray-title">
                      <LinkIcon size={13} />
                      <span>Linked Tasks ({linkedTasks.length})</span>
                    </span>
                    <button
                      onClick={() => {
                        setLinkingMemoryId(mem.id);
                        setTaskSearchQuery('');
                      }}
                      className="btn-secondary link-action-btn"
                    >
                      <Plus size={12} />
                      <span>Link Task</span>
                    </button>
                  </div>

                  {linkedTasks.length > 0 ? (
                    <div className="tasks-chip-list">
                      {linkedTasks.map(t => (
                        <div key={t.id} className="linked-task-token">
                          <span className={`task-status-indicator status-${t.status}`} />
                          <span className="task-token-name" title={t.title}>{t.title}</span>
                          <button
                            onClick={() => handleUnlinkTask(mem.id, t.id)}
                            className="task-token-remove"
                            title="Unlink task"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tasks-tray-empty">
                      <span>No tasks connected yet. Click "+ Link Task" to anchor.</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="card-bottom-date">
                  <span>Recorded on {new Date(mem.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Linker Dedicated Modal (Clean & Beautiful) */}
      {linkingMemoryId && activeTargetMemory && (
        <div className="modal-backdrop">
          <div className="modal-dialog link-modal-box">
            <div className="modal-header">
              <div className="modal-header-left">
                <LinkIcon size={18} className="text-primary" />
                <h3 className="modal-title">Link Task to "{activeTargetMemory.title}"</h3>
              </div>
              <button onClick={() => setLinkingMemoryId(null)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div className="link-modal-search">
              <Search size={15} className="search-symbol" />
              <input
                type="text"
                placeholder="Search available tasks..."
                value={taskSearchQuery}
                onChange={e => setTaskSearchQuery(e.target.value)}
                className="vault-search-field"
              />
            </div>

            <div className="link-tasks-scroll-list">
              {availableTasksToLink.map(task => (
                <div key={task.id} className="link-candidate-row">
                  <div className="candidate-details">
                    <span className={`task-status-indicator status-${task.status}`} />
                    <span className="candidate-title">{task.title}</span>
                    <span className="candidate-meta">
                      {task.priority.toUpperCase()} {task.dueDate ? `• Due ${task.dueDate}` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => handleLinkTask(activeTargetMemory.id, task.id)}
                    className="btn-secondary link-row-btn"
                  >
                    <Plus size={13} />
                    <span>Link</span>
                  </button>
                </div>
              ))}
              {availableTasksToLink.length === 0 && (
                <div className="candidate-empty-message">
                  {tasks.length === 0
                    ? 'No tasks created yet in Task Manager.'
                    : 'All matching tasks are already linked to this goal.'}
                </div>
              )}
            </div>

            <div className="modal-actions-row">
              <button onClick={() => setLinkingMemoryId(null)} className="btn-secondary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Memory Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog memory-form-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <Compass size={20} className="text-primary" />
                <h3 className="modal-title">
                  {editingMemory ? 'Edit Stored Memory' : 'New Project Goal or Guiding Principle'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="memory-form-stack">
              <div className="form-group">
                <label className="form-label">Goal Title or Principle</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deliver Top Hackathon Presentation & Live Demo"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Core Content & Strategic Context</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the thesis, high-level requirements, and why this goal is of critical importance..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Classification Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as MemoryCategory)}
                    className="form-input"
                  >
                    <option value="Project Goal">Project Goal</option>
                    <option value="Key Principle">Key Principle</option>
                    <option value="Vision">Vision</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Importance Tier</label>
                  <select
                    value={importance}
                    onChange={e => setImportance(e.target.value as MemoryImportance)}
                    className="form-input"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Target Milestone Date (Optional)</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={e => setGoalDeadline(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="hackathon, pitch, architecture"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Task Linker inside creation modal */}
              <div className="form-group">
                <label className="form-label">Link to Active Tasks in Vault</label>
                <div className="task-multiselect-container">
                  {tasks.map(t => {
                    const isChecked = selectedTaskIds.includes(t.id);
                    return (
                      <label key={t.id} className="task-multiselect-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedTaskIds([...selectedTaskIds, t.id]);
                            } else {
                              setSelectedTaskIds(selectedTaskIds.filter(id => id !== t.id));
                            }
                          }}
                        />
                        <span className="multiselect-task-name">{t.title}</span>
                      </label>
                    );
                  })}
                  {tasks.length === 0 && (
                    <span className="empty-subtext">No tasks available in Task Manager.</span>
                  )}
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} />
                  <span>{editingMemory ? 'Save Changes' : 'Store in Memory Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-backdrop">
          <div className="modal-dialog delete-confirm-box">
            <div className="delete-icon-wrap">
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <h3 className="modal-title">Delete Memory?</h3>
            <p className="delete-confirm-text">
              Are you sure you want to remove this entry from the Memory Vault? This action is permanent and cannot be undone.
            </p>
            <div className="modal-actions-row" style={{ marginTop: 20 }}>
              <button onClick={() => setDeletingId(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMemory(deletingId)}
                className="btn-primary"
                style={{ background: '#ef4444', borderColor: '#dc2626' }}
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
