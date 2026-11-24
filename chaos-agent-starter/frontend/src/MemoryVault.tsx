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
  Link,
  Unlink,
  Calendar,
  AlertCircle,
  FolderHeart,
  Bookmark,
  CheckCircle2,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink
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

  // Link Task Popover State
  const [linkingMemoryId, setLinkingMemoryId] = useState<string | null>(null);

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
        setLinkingMemoryId(null);
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

  return (
    <div className="memory-vault-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="memory-toast">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="toast-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="vault-header">
        <div className="flex items-center gap-3">
          <div className="icon-halo-cyan">
            <Compass className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="vault-title">Memory Vault</h1>
            <p className="vault-subtitle">
              Long-term project goals, guiding principles, and persistent knowledge linked with active tasks
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={openCreateModal} className="action-btn-primary">
            <Plus className="w-4 h-4" />
            <span>New Memory / Goal</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="vault-filter-bar">
        <div className="vault-search-box">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search memories, principles, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="vault-search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search-btn">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="vault-category-tabs">
          {['all', 'Project Goal', 'Key Principle', 'Vision', 'Reference'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`vault-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat === 'all' ? 'All Memories' : cat}
            </button>
          ))}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`vault-tab-btn ${onlyFavorites ? 'active-favorite' : ''}`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {loading ? (
        <div className="loading-state-card">
          <div className="loading-spinner" />
          <span>Synchronizing Memory Vault...</span>
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-state-card">
          <FolderHeart className="w-12 h-12 text-cyan-400 opacity-60 mb-2" />
          <h3 className="text-lg font-semibold text-white">No Stored Memories Found</h3>
          <p className="text-sm text-gray-400 max-w-md text-center mt-1">
            Store your ambitious project visions, core operating principles, or hackathon goals. They will guide JARVIS when offering productivity suggestions.
          </p>
          <button onClick={openCreateModal} className="action-btn-primary mt-4">
            <Plus className="w-4 h-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="memories-grid">
          {memories.map(mem => {
            const linkedTasks = tasks.filter(t => (mem.linkedTaskIds || []).includes(t.id));
            return (
              <div key={mem.id} className="memory-card">
                <div className="memory-card-header">
                  <div className="flex items-center gap-2">
                    <span className={`category-tag category-${mem.category.replace(/\s+/g, '-').toLowerCase()}`}>
                      {mem.category}
                    </span>
                    <span className={`importance-pill importance-${mem.importance}`}>
                      {mem.importance}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleFavorite(mem.id)}
                      className="card-icon-btn"
                      title={mem.isFavorite ? 'Remove from favorites' : 'Star memory'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          mem.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-400 hover:text-amber-400'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => openEditModal(mem)}
                      className="card-icon-btn"
                      title="Edit memory"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400 hover:text-cyan-400" />
                    </button>
                    <button
                      onClick={() => setDeletingId(mem.id)}
                      className="card-icon-btn"
                      title="Delete memory"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <h3 className="memory-title">{mem.title}</h3>
                <p className="memory-content">{mem.content}</p>

                {/* Deadline if set */}
                {mem.goalDeadline && (
                  <div className="memory-meta-row">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-300">Target Deadline: {mem.goalDeadline}</span>
                  </div>
                )}

                {/* Tags */}
                {mem.tags && mem.tags.length > 0 && (
                  <div className="memory-tags-row">
                    {mem.tags.map(t => (
                      <span key={t} className="memory-tag-item">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Linked Tasks Section */}
                <div className="linked-tasks-section">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                      <Link className="w-3 h-3 text-cyan-400" />
                      Linked Tasks ({linkedTasks.length})
                    </span>
                    <button
                      onClick={() => setLinkingMemoryId(linkingMemoryId === mem.id ? null : mem.id)}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Link Task
                    </button>
                  </div>

                  {/* Task Linker Popover */}
                  {linkingMemoryId === mem.id && (
                    <div className="link-task-popover">
                      <div className="popover-header">
                        <span className="text-xs font-medium text-white">Select Task to Link</span>
                        <button onClick={() => setLinkingMemoryId(null)} className="popover-close">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="popover-list">
                        {tasks
                          .filter(t => !(mem.linkedTaskIds || []).includes(t.id))
                          .slice(0, 5)
                          .map(task => (
                            <button
                              key={task.id}
                              onClick={() => handleLinkTask(mem.id, task.id)}
                              className="popover-item"
                            >
                              <span className="truncate text-left text-xs text-gray-200">{task.title}</span>
                              <Plus className="w-3 h-3 text-cyan-400 shrink-0" />
                            </button>
                          ))}
                        {tasks.filter(t => !(mem.linkedTaskIds || []).includes(t.id)).length === 0 && (
                          <span className="text-xs text-gray-400 p-2">No unlinked tasks available.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linked tasks list */}
                  <div className="linked-task-pills">
                    {linkedTasks.map(t => (
                      <div key={t.id} className="linked-task-chip">
                        <span className={`status-dot status-${t.status}`} />
                        <span className="chip-title truncate">{t.title}</span>
                        <button
                          onClick={() => handleUnlinkTask(mem.id, t.id)}
                          className="chip-remove-btn"
                          title="Unlink task"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {linkedTasks.length === 0 && (
                      <span className="text-xs text-gray-500 italic">No tasks currently linked.</span>
                    )}
                  </div>
                </div>

                <div className="memory-card-footer">
                  <span className="memory-date">
                    Added: {new Date(mem.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Memory Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h3 className="modal-title">
                  {editingMemory ? 'Edit Memory' : 'New Project Goal or Memory'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMemory} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deliver Top Hackathon Presentation"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Content / Core Thesis</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the long-term vision, key operating rule, or strategic importance..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as MemoryCategory)}
                    className="form-select"
                  >
                    <option value="Project Goal">Project Goal</option>
                    <option value="Key Principle">Key Principle</option>
                    <option value="Vision">Vision</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Importance</label>
                  <select
                    value={importance}
                    onChange={e => setImportance(e.target.value as MemoryImportance)}
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Target Deadline (Optional)</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={e => setGoalDeadline(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Tags (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="hackathon, pitch, architecture"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Multi-Select Tasks to link */}
              <div className="form-group">
                <label>Link to Existing Tasks (Optional)</label>
                <div className="task-multiselect-box">
                  {tasks.map(t => {
                    const isChecked = selectedTaskIds.includes(t.id);
                    return (
                      <label key={t.id} className="task-checkbox-item">
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
                        <span className="truncate">{t.title}</span>
                      </label>
                    );
                  })}
                  {tasks.length === 0 && (
                    <span className="text-xs text-gray-500">No tasks created yet.</span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="action-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="action-btn-primary">
                  {editingMemory ? 'Update Memory' : 'Store in Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="modal-title">Confirm Memory Removal</h3>
              </div>
              <button onClick={() => setDeletingId(null)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-300 py-3">
              Are you sure you want to permanently delete this memory from the Vault? This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button onClick={() => setDeletingId(null)} className="action-btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMemory(deletingId)}
                className="action-btn-danger"
              >
                Delete Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
