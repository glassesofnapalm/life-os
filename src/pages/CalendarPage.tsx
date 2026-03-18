import { useState, useMemo, useCallback } from 'react';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  getHours,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import { useStore, useActions } from '@/stores/store';
import type { CalendarEvent, CalendarView } from '@/types';
import { Modal } from '@/components/ui/Modal';

// ── Constants ──────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, string> = {
  outlook: 'badge badge-blue',
  icloud:  'badge badge-green',
  local:   'badge badge-purple',
};

const SOURCE_EVENT_STYLE: Record<string, React.CSSProperties> = {
  outlook: {
    background: 'var(--accent-blue-glass)',
    border: '1px solid rgba(96,165,250,0.28)',
    color: 'var(--accent-blue)',
  },
  icloud: {
    background: 'var(--accent-green-glass)',
    border: '1px solid rgba(52,211,153,0.28)',
    color: 'var(--accent-green)',
  },
  local: {
    background: 'var(--accent-purple-glass)',
    border: '1px solid rgba(167,139,250,0.28)',
    color: 'var(--accent-purple)',
  },
};

const SOURCE_DOT_COLOR: Record<string, string> = {
  outlook: 'var(--accent-blue)',
  icloud:  'var(--accent-green)',
  local:   'var(--accent-purple)',
};

const VIEW_OPTIONS: { label: string; value: CalendarView }[] = [
  { label: 'Day',   value: 'day' },
  { label: 'Week',  value: 'week' },
  { label: 'Month', value: 'month' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 7 am – 10 pm
const DISPLAY_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

// ── Helpers ────────────────────────────────────────────────────────────────

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

function eventStyle(source: string): React.CSSProperties {
  return (
    SOURCE_EVENT_STYLE[source] ?? {
      background: 'var(--glass-bg-active)',
      border: '1px solid var(--glass-border)',
      color: 'var(--text-secondary)',
    }
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface EventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
}

function emptyForm(defaultDate?: Date): EventForm {
  const d = defaultDate ?? new Date();
  return {
    title: '',
    date: format(d, 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    allDay: false,
    location: '',
    description: '',
  };
}

export default function CalendarPage() {
  const calendarEvents = useStore((s) => s.calendarEvents) ?? [];
  const { addCalendarEvent, deleteCalendarEvent } = useActions();
  const [view, setView]             = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(() => emptyForm());

  const openAddModal = useCallback((day?: Date) => {
    setEventForm(emptyForm(day));
    setShowAddModal(true);
  }, []);

  const handleSubmitEvent = useCallback(() => {
    if (!eventForm.title.trim()) return;
    const dateStr = eventForm.date;
    let start: Date;
    let end: Date;
    if (eventForm.allDay) {
      start = parseISO(dateStr);
      end = parseISO(dateStr);
    } else {
      start = parseISO(`${dateStr}T${eventForm.startTime}`);
      end = parseISO(`${dateStr}T${eventForm.endTime}`);
    }
    addCalendarEvent({
      title: eventForm.title.trim(),
      start,
      end,
      allDay: eventForm.allDay,
      source: 'local',
      location: eventForm.location || undefined,
      description: eventForm.description || undefined,
    });
    setShowAddModal(false);
  }, [eventForm, addCalendarEvent]);

  // Navigation
  const goBack = useCallback(() => {
    setCurrentDate((d) => {
      if (view === 'day')  return subDays(d, 1);
      if (view === 'week') return subWeeks(d, 1);
      return subMonths(d, 1);
    });
  }, [view]);

  const goForward = useCallback(() => {
    setCurrentDate((d) => {
      if (view === 'day')  return addDays(d, 1);
      if (view === 'week') return addWeeks(d, 1);
      return addMonths(d, 1);
    });
  }, [view]);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  }, []);

  // Header label
  const headerLabel = useMemo(() => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (view === 'week') {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate, view]);

  // Month grid (padded to full weeks)
  const monthGrid = useMemo(() => {
    const ms        = startOfMonth(currentDate);
    const me        = endOfMonth(currentDate);
    const gridStart = startOfWeek(ms);
    const gridEnd   = endOfWeek(me);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate);
    return eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
  }, [currentDate]);

  // Selected day events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getEventsForDay(calendarEvents, selectedDay);
  }, [selectedDay, calendarEvents]);

  const handleDayClick = useCallback((day: Date) => setSelectedDay(day), []);

  // ── Sub-components ──────────────────────────────────────────────────────

  const EmptyState = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--glass-bg-active)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CalendarDays size={24} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p className="heading-sm" style={{ marginTop: 4 }}>No events yet</p>
      <p className="body-sm" style={{ maxWidth: 280 }}>
        Connect your calendars or add events to see them here. Outlook, iCloud,
        and local events will appear color-coded.
      </p>
    </div>
  );

  // Single event dot shown inside a month cell
  const EventDot = ({ source }: { source: string }) => (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: SOURCE_DOT_COLOR[source] ?? 'var(--text-tertiary)',
        flexShrink: 0,
      }}
    />
  );

  // Compact event pill for week/day timeline rows
  const EventPill = ({ ev }: { ev: CalendarEvent }) => (
    <div
      style={{
        ...eventStyle(ev.source),
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        fontSize: 11,
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {ev.title}
    </div>
  );

  // ── Month View ──────────────────────────────────────────────────────────

  const MonthView = () => {
    const weeks: Date[][] = [];
    for (let i = 0; i < monthGrid.length; i += 7) {
      weeks.push(monthGrid.slice(i, i + 7));
    }

    return (
      <div style={{ width: '100%' }}>
        {/* Day-of-week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--glass-border)',
            marginBottom: 0,
          }}
        >
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="cal-grid-header" style={{ textAlign: 'center' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: wi < weeks.length - 1 ? '1px solid var(--glass-border)' : 'none',
            }}
          >
            {week.map((day, di) => {
              const dayEvents = getEventsForDay(calendarEvents, day);
              const inMonth   = isSameMonth(day, currentDate);
              const todayDay  = isToday(day);
              const selected  = selectedDay ? isSameDay(day, selectedDay) : false;

              const classes = [
                'cal-day',
                todayDay  ? 'today'       : '',
                !inMonth  ? 'other-month' : '',
                selected  ? 'selected'    : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${wi}-${di}`}
                  className={classes}
                  onClick={() => handleDayClick(day)}
                  style={{
                    borderRight: di < 6 ? '1px solid var(--glass-border)' : 'none',
                    borderRadius: 0,
                    textAlign: 'left',
                    background: undefined, // let CSS class handle it
                  }}
                >
                  <span className="cal-day-num">{format(day, 'd')}</span>

                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventDot key={ev.id} source={ev.source} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="body-xs" style={{ fontSize: 10 }}>
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── Week View ───────────────────────────────────────────────────────────

  const WeekView = () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {/* Day headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '52px repeat(7, 1fr)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div />
        {weekDays.map((day) => {
          const todayDay = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              style={{
                padding: '10px 4px',
                textAlign: 'center',
                background: todayDay ? 'rgba(96,165,250,0.06)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRight: '1px solid var(--glass-border)',
              }}
            >
              <div className="label" style={{ textAlign: 'center' }}>
                {format(day, 'EEE')}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  marginTop: 2,
                  background: todayDay ? 'var(--accent-blue)' : 'transparent',
                  color: todayDay ? '#fff' : 'var(--text-primary)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {format(day, 'd')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hourly rows */}
      <div style={{ maxHeight: 560, overflowY: 'auto' }}>
        {DISPLAY_HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px repeat(7, 1fr)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <div
              className="body-xs"
              style={{
                textAlign: 'right',
                paddingRight: 8,
                paddingTop: 10,
                color: 'var(--text-tertiary)',
                borderRight: '1px solid var(--glass-border)',
              }}
            >
              {format(new Date().setHours(hour, 0), 'h a')}
            </div>
            {weekDays.map((day) => {
              const hourEvents = getEventsForDay(calendarEvents, day).filter(
                (e) => !e.allDay && getHours(new Date(e.start)) === hour,
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  style={{
                    minHeight: 48,
                    padding: '2px 3px',
                    borderRight: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {hourEvents.map((ev) => (
                    <EventPill key={ev.id} ev={ev} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Day View ────────────────────────────────────────────────────────────

  const DayView = () => {
    const dayEvents  = getEventsForDay(calendarEvents, currentDate);
    const allDayEvs  = dayEvents.filter((e) => e.allDay);
    const timedEvs   = dayEvents.filter((e) => !e.allDay);

    return (
      <div style={{ width: '100%' }}>
        {/* All-day strip */}
        {allDayEvs.length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <span className="label" style={{ marginRight: 6 }}>All Day</span>
            {allDayEvs.map((ev) => (
              <span
                key={ev.id}
                style={{
                  ...eventStyle(ev.source),
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {ev.title}
              </span>
            ))}
          </div>
        )}

        {/* Hourly timeline */}
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {DISPLAY_HOURS.map((hour) => {
            const hourEvents = timedEvs.filter(
              (e) => getHours(new Date(e.start)) === hour,
            );

            return (
              <div
                key={hour}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <div
                  className="body-xs"
                  style={{
                    textAlign: 'right',
                    paddingRight: 12,
                    paddingTop: 12,
                    color: 'var(--text-tertiary)',
                    borderRight: '1px solid var(--glass-border)',
                  }}
                >
                  {format(new Date().setHours(hour, 0), 'h a')}
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    minHeight: 54,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {hourEvents.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        ...eventStyle(ev.source),
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                      }}
                    >
                      <div className="heading-sm">{ev.title}</div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginTop: 4,
                        }}
                      >
                        <span
                          className="body-xs"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: 0.75,
                          }}
                        >
                          <Clock size={12} />
                          {format(new Date(ev.start), 'h:mm a')} –{' '}
                          {format(new Date(ev.end), 'h:mm a')}
                        </span>
                        {ev.location && (
                          <span
                            className="body-xs"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: 0.75,
                            }}
                          >
                            <MapPin size={12} />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p
                          className="body-xs"
                          style={{
                            marginTop: 4,
                            opacity: 0.6,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Selected Day Panel ──────────────────────────────────────────────────

  const SelectedDayPanel = () => {
    if (!selectedDay) return null;

    return (
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="heading-md">{format(selectedDay, 'EEEE, MMMM d')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isToday(selectedDay) && <span className="badge badge-blue">Today</span>}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openAddModal(selectedDay)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p className="body-sm" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
            No events — tap Add to create one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                style={{ ...eventStyle(ev.source), borderRadius: 'var(--radius-md)', padding: '10px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="heading-sm">{ev.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={SOURCE_BADGE[ev.source] ?? 'badge badge-default'}>{ev.source}</span>
                    {ev.source === 'local' && (
                      <button
                        onClick={() => deleteCalendarEvent(ev.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: 2, display: 'flex' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {ev.allDay ? (
                  <p className="body-xs" style={{ marginTop: 4 }}>All day</p>
                ) : (
                  <p className="body-xs" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {format(new Date(ev.start), 'h:mm a')} – {format(new Date(ev.end), 'h:mm a')}
                  </p>
                )}
                {ev.location && (
                  <p className="body-xs" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} />{ev.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Main Layout ─────────────────────────────────────────────────────────

  const showSidebar = view !== 'day' && selectedDay !== null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '24px',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="heading-xl">Calendar</h1>
          <p className="body-sm" style={{ marginTop: 4 }}>
            Stay on top of your schedule
          </p>
        </div>

        <button
          className="btn btn-primary btn-md"
          onClick={() => openAddModal(selectedDay ?? new Date())}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} />
          Add Event
        </button>
      </div>

      {/* ── Sub-header: nav + view switcher ── */}
      <div className="glass-card" style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: arrows + month label + Today */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className="btn-icon"
              onClick={goBack}
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={goToday}
            >
              Today
            </button>

            <button
              className="btn-icon"
              onClick={goForward}
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>

            <h2 className="heading-md" style={{ marginLeft: 8 }}>
              {headerLabel}
            </h2>
          </div>

          {/* Right: Day / Week / Month tab bar */}
          <div className="tab-bar">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`tab${view === opt.value ? ' active' : ''}`}
                onClick={() => setView(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Source legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {(
          [
            { key: 'outlook', label: 'Outlook', cls: 'badge-blue' },
            { key: 'icloud',  label: 'iCloud',  cls: 'badge-green' },
            { key: 'local',   label: 'Local',   cls: 'badge-purple' },
          ] as const
        ).map(({ key, label, cls }) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: SOURCE_DOT_COLOR[key],
                display: 'inline-block',
              }}
            />
            <span className="body-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar body + optional sidebar ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showSidebar ? '1fr 280px' : '1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Main calendar card */}
        <div
          className="glass-card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          {view === 'month' && <MonthView />}
          {view === 'week'  && <WeekView />}
          {view === 'day'   && <DayView />}

          {calendarEvents.length === 0 && <EmptyState />}
        </div>

        {/* Selected day panel */}
        {showSidebar && <SelectedDayPanel />}
      </div>

      {/* Add Event Modal */}
      <Modal open={showAddModal} title="Add Event" onClose={() => setShowAddModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Title *</label>
            <input
              className="input"
              autoFocus
              value={eventForm.title}
              onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title"
              onKeyDown={e => e.key === 'Enter' && handleSubmitEvent()}
            />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input
              className="input"
              type="date"
              value={eventForm.date}
              onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="allDay"
              checked={eventForm.allDay}
              onChange={e => setEventForm(f => ({ ...f, allDay: e.target.checked }))}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
            <label htmlFor="allDay" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>All day</label>
          </div>
          {!eventForm.allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Start time</label>
                <input
                  className="input"
                  type="time"
                  value={eventForm.startTime}
                  onChange={e => setEventForm(f => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">End time</label>
                <input
                  className="input"
                  type="time"
                  value={eventForm.endTime}
                  onChange={e => setEventForm(f => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          <div>
            <label className="form-label">Location</label>
            <input
              className="input"
              value={eventForm.location}
              onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input
              className="input"
              value={eventForm.description}
              onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost btn-md" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary btn-md" onClick={handleSubmitEvent} disabled={!eventForm.title.trim()}>
              Add Event
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
