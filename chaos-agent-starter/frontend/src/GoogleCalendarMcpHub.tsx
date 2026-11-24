import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  Clock,
  Video,
  RefreshCw,
  ExternalLink,
  Sparkles,
  CheckSquare,
  Check,
  User,
  MapPin,
  CalendarCheck,
  Flame,
  ArrowRight
} from 'lucide-react';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  location?: string;
  meetLink?: string;
  isAllDay: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizerEmail: string;
  category: 'Hackathon' | 'Review' | 'Deep Work' | 'Sync' | 'General';
}

export interface ScheduleBriefing {
  briefing: string;
  recommendedFocusBlocks: string[];
  highPriorityAlerts: string[];
  totalEventsCount: number;
}

interface GoogleCalendarMcpHubProps {
  apiBaseUrl: string;
  onNavigateToTab?: (tab: string) => void;
}

export const GoogleCalendarMcpHub: React.FC<GoogleCalendarMcpHubProps> = ({ apiBaseUrl, onNavigateToTab }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Hackathon' | 'Deep Work' | 'Sync' | 'Review'>('all');
  const [briefing, setBriefing] = useState<ScheduleBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [taskAddedIndex, setTaskAddedIndex] = useState<{ [key: string]: boolean }>({});

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('11:00');
  const [newEndTime, setNewEndTime] = useState('12:00');
  const [newAttendees, setNewAttendees] = useState('');
  const [newLocation, setNewLocation] = useState('Virtual / Google Meet');
  const [generateMeet, setGenerateMeet] = useState(true);
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newCategory, setNewCategory] = useState<CalendarEvent['category']>('Sync');

  // Security Gate State
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [pendingEventData, setPendingEventData] = useState<any>(null);
  const [userExplicitlyApproved, setUserExplicitlyApproved] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);

  // Connected Account
  const [connectedAccount, setConnectedAccount] = useState<{
    email: string;
    displayName: string;
    isConnected: boolean;
    timeZone: string;
  }>({
    email: 'jarvispersonalai170@gmail.com',
    displayName: 'Autonomous JARVIS Operator',
    isConnected: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  });

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const accRes = await fetch(`${apiBaseUrl}/api/calendar/account`);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.account) setConnectedAccount(accData.account);
      }

      const eventsRes = await fetch(`${apiBaseUrl}/api/calendar/events`);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }

      fetchBriefing();
    } catch (err) {
      console.error('Failed to load Google Calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/calendar/daily-briefing`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      }
    } catch (err) {
      console.error('Failed to load schedule briefing:', err);
    } finally {
      setBriefingLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [apiBaseUrl]);

  // Step 1: Prepare Event Creation with Security Token
  const handleInitiateSchedule = async () => {
    if (!newTitle.trim() || !newDate || !newStartTime || !newEndTime) {
      alert('Please fill out title, date, start time, and end time.');
      return;
    }

    const startISO = new Date(`${newDate}T${newStartTime}:00`).toISOString();
    const endISO = new Date(`${newDate}T${newEndTime}:00`).toISOString();
    const attendeesList = newAttendees.split(',').map(a => a.trim()).filter(Boolean);
    if (!attendeesList.includes(connectedAccount.email)) {
      attendeesList.unshift(connectedAccount.email);
    }

    const payload = {
      title: newTitle,
      description: newDescription,
      startTime: startISO,
      endTime: endISO,
      attendees: attendeesList,
      location: newLocation,
      generateMeetLink: generateMeet,
      priority: newPriority,
      category: newCategory
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/calendar/prepare-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', eventData: payload })
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setConfirmationToken(data.session.confirmationToken);
        setPendingEventData(payload);
        setShowScheduleModal(false);
        setUserExplicitlyApproved(false);
        setSuccessReceipt(null);
        setSecurityModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to prepare event:', err);
    }
  };

  // Step 2: Confirm and Authorize Calendar Event Dispatch
  const handleConfirmEvent = async () => {
    if (!confirmationToken || !userExplicitlyApproved) return;
    setIsDispatching(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/calendar/confirm-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationToken,
          userApproved: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessReceipt(data.message);
        fetchCalendarData();
      } else {
        alert(data.message || 'Dispatch was declined.');
      }
    } catch (err) {
      console.error('Failed to confirm event:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Convert recommended focus block or event to Smart Task
  const handleConvertFocusToTask = async (blockText: string, keyId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Focus Block: ${blockText}`,
          description: `Scheduled focus block recommended by JARVIS Schedule Optimizer.`,
          priority: 'high',
          category: 'Focus Session'
        })
      });
      if (res.ok) {
        setTaskAddedIndex(prev => ({ ...prev, [keyId]: true }));
      }
    } catch (err) {
      console.error('Failed to add focus task:', err);
    }
  };

  const filteredEvents = events.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        e.attendees.some(a => a.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const highPriorityCount = events.filter(e => e.priority === 'high').length;

  return (
    <div className="google-calendar-hub-container" style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* 1. Header HUD */}
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
                background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.25)'
              }}
            >
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                  Google Calendar MCP Hub
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
                Calendar connected to: <strong style={{ color: 'var(--text-main)' }}>{connectedAccount.email}</strong> • Timezone: {connectedAccount.timeZone}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchCalendarData}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13 }}
            >
              <Plus size={16} />
              <span>Schedule Event</span>
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
              Scheduled Events
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {events.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Synchronized via Calendar MCP</div>
          </div>

          <div style={{ background: 'var(--pastel-pink)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-pink-text)', textTransform: 'uppercase' }}>
              High Priority
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {highPriorityCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Crucial demos & milestone syncs</div>
          </div>

          <div style={{ background: 'var(--pastel-lavender)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-lavender-text)', textTransform: 'uppercase' }}>
              Deep Work Focus
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--pastel-lavender-text)', marginTop: 4 }}>
              2 Sprints
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Optimized by JARVIS Schedule AI</div>
          </div>

          <div style={{ background: 'var(--pastel-mint)', padding: '14px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pastel-mint-text)', textTransform: 'uppercase' }}>
              Scheduling Gate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--secondary-text)', marginTop: 4 }}>
              Guarded
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Human verification required</div>
          </div>
        </div>
      </div>

      {/* 2. AI Schedule Optimizer & Briefing Box */}
      {briefing && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.45), rgba(237, 233, 254, 0.45))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 14,
            padding: '18px 24px',
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--primary)" />
              <strong style={{ fontSize: 15, color: 'var(--primary-text)' }}>
                JARVIS Schedule Intelligence & Focus Optimizer
              </strong>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Live Briefing
            </span>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-main)' }}>
            {briefing.briefing}
          </p>

          {briefing.recommendedFocusBlocks?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} color="#ea580c" /> Recommended Deep Work Blocks Today:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
                {briefing.recommendedFocusBlocks.map((block, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>• {block}</span>
                    <button
                      className="btn-secondary"
                      disabled={taskAddedIndex[`focus_${i}`]}
                      onClick={() => handleConvertFocusToTask(block, `focus_${i}`)}
                      style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {taskAddedIndex[`focus_${i}`] ? (
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

      {/* 3. Search & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 500 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search calendar events by title, description, or attendee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 40, height: 42, borderRadius: 10 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'Hackathon', 'Deep Work', 'Sync', 'Review'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCategoryFilter(tab as any)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: categoryFilter === tab ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: categoryFilter === tab ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                color: categoryFilter === tab ? 'var(--primary-text)' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'all' ? 'All Events' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Events Timeline */}
      <div style={{ display: 'grid', gap: 14 }}>
        {filteredEvents.length === 0 ? (
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '50px 20px', textAlign: 'center', borderRadius: 14, color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            <CalendarCheck size={40} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14 }}>No calendar events match your current filter.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const startD = new Date(event.startTime);
            const endD = new Date(event.endTime);
            const isHigh = event.priority === 'high';

            return (
              <div
                key={event.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: isHigh ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 20,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Date & Time Column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 200 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: isHigh ? 'var(--pastel-pink)' : 'var(--pastel-sky)',
                      color: isHigh ? 'var(--pastel-pink-text)' : 'var(--pastel-sky-text)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}
                  >
                    <span style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {startD.toLocaleDateString([], { month: 'short' })}
                    </span>
                    <span style={{ fontSize: 18 }}>
                      {startD.getDate()}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="var(--primary)" />
                      {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {Math.round((endD.getTime() - startD.getTime()) / 60000)} mins duration
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>
                      {event.title}
                    </h4>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isHigh ? 'var(--pastel-pink)' : 'var(--pastel-lavender)',
                        color: isHigh ? 'var(--pastel-pink-text)' : 'var(--pastel-lavender-text)'
                      }}
                    >
                      {event.category}
                    </span>
                  </div>

                  <p style={{ margin: '6px 0 10px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {event.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-subtle)' }}>
                    {event.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} /> {event.location}
                      </span>
                    )}
                    {event.attendees?.length > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={13} /> {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {event.meetLink && (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, textDecoration: 'none' }}
                    >
                      <Video size={14} />
                      <span>Join Meet</span>
                    </a>
                  )}
                  <button
                    className="btn-secondary"
                    disabled={taskAddedIndex[event.id]}
                    onClick={() => handleConvertFocusToTask(event.title, event.id)}
                    style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {taskAddedIndex[event.id] ? (
                      <>
                        <Check size={13} color="#10b981" /> Task Added
                      </>
                    ) : (
                      <>
                        <CheckSquare size={13} /> Task
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Schedule Event Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 16, width: '100%', maxWidth: 640, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Schedule Google Calendar Event</h3>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary" style={{ padding: '6px 10px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Event Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. JARVIS Live Demo Presentation"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Start Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>End Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={newEndTime}
                    onChange={e => setNewEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Attendees (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="judges@hackathon.org, partner@domain.com"
                  value={newAttendees}
                  onChange={e => setNewAttendees(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Event Description</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  placeholder="Meeting agenda, briefing notes, or goals..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Category</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Deep Work">Deep Work</option>
                    <option value="Sync">Sync / Meeting</option>
                    <option value="Review">Review</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Priority</label>
                  <select
                    className="form-control"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={generateMeet}
                  onChange={e => setGenerateMeet(e.target.checked)}
                />
                <span>Automatically attach Google Meet video link</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleInitiateSchedule}>Prepare Authorization Gate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Security Confirmation Gate Modal */}
      {securityModalOpen && pendingEventData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 10, 30, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface-elevated)', border: '2px solid var(--primary)', borderRadius: 18, width: '100%', maxWidth: 580, padding: 30 }}>
            {successReceipt ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 14px' }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Event Scheduled on Calendar</h3>
                <p style={{ margin: '8px 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>{successReceipt}</p>
                <button className="btn-primary" onClick={() => setSecurityModalOpen(false)}>Done</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Shield size={24} color="var(--primary)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Security Gate: Confirm Calendar Event</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Account: {connectedAccount.email}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 16, fontSize: 13 }}>
                  <div><strong>Title:</strong> {pendingEventData.title}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Time:</strong> {new Date(pendingEventData.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} - {new Date(pendingEventData.endTime).toLocaleTimeString([], { timeStyle: 'short' })}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Attendees:</strong> {pendingEventData.attendees.join(', ')}
                  </div>
                  {pendingEventData.generateMeetLink && (
                    <div style={{ marginTop: 6, color: '#16a34a', fontWeight: 600 }}>
                      ✓ Google Meet video link will be generated automatically
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12.5, marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    checked={userExplicitlyApproved}
                    onChange={e => setUserExplicitlyApproved(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>I authorize JARVIS to dispatch and schedule this event on my connected Google Calendar.</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn-secondary" onClick={() => setSecurityModalOpen(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    disabled={!userExplicitlyApproved || isDispatching}
                    onClick={handleConfirmEvent}
                  >
                    {isDispatching ? 'Scheduling...' : 'Authorize & Schedule'}
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
