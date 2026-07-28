import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Columns3, LayoutGrid, Video, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ymd = (d) => {
  const z = new Date(d);
  if (isNaN(z.getTime())) return '';
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
};

function Day({ dateKey, dayNumber, inMonth, isToday, isSelected, count, onHover, onSelect }) {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect(dateKey)}
      onMouseEnter={() => { setIsHovered(true); onHover(dateKey); }}
      onMouseLeave={() => { setIsHovered(false); onHover(null); }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl transition-colors',
        'aspect-square',
        inMonth ? 'text-[var(--foreground)]' : 'text-[var(--body)] opacity-40',
        isSelected
          ? 'bg-[var(--primary)] text-white'
          : count > 0
            ? 'bg-[rgba(4,107,210,0.10)] hover:bg-[rgba(4,107,210,0.18)] cursor-pointer'
            : 'bg-[var(--muted)] hover:bg-white/[0.06]',
        isToday && !isSelected ? 'ring-2 ring-[var(--primary)]' : '',
      )}
    >
      <span className="text-sm font-semibold">{dayNumber}</span>
      {count > 0 && (
        <motion.span
          layoutId={`badge-${dateKey}`}
          className={cn(
            'absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
            isSelected ? 'bg-white/25 text-white' : 'bg-[var(--primary)] text-white',
          )}
        >
          {count}
        </motion.span>
      )}
      <AnimatePresence>
        {count > 0 && isHovered && !isSelected && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-[var(--primary)]/90 text-xs font-bold text-white"
          >
            {count} meeting{count === 1 ? '' : 's'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Real-data-driven month calendar with a hover-to-highlight grid and a
// toggleable "Bookings" list view (same interaction pattern as the
// reference InteractiveCalendar component, wired to actual meeting data
// instead of a hardcoded demo array).
export default function InteractiveCalendar({
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  meetingsByDay, // Map<'YYYY-MM-DD', meeting[]>
  selectedDay,
  onSelectDay,
  renderMeeting, // (meeting) => { date, time, title, participants, location }
  className,
}) {
  const [view, setView] = React.useState('grid'); // 'grid' | 'list'
  const [hoveredDay, setHoveredDay] = React.useState(null);

  const cells = React.useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const todayKey = ymd(new Date());

  const daysWithMeetings = React.useMemo(() => {
    const keys = Array.from(meetingsByDay.keys()).sort();
    const sorted = hoveredDay
      ? [hoveredDay, ...keys.filter((k) => k !== hoveredDay)]
      : keys;
    return sorted.filter((k) => meetingsByDay.has(k));
  }, [meetingsByDay, hoveredDay]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onPrevMonth} className="btn-ghost text-sm w-8 h-8 flex items-center justify-center rounded-full" aria-label="Previous month">←</button>
          <h2 className="text-lg font-bold tracking-wide text-[var(--foreground)]">
            {MONTHS[month.getMonth()]} <span className="opacity-50">{month.getFullYear()}</span>
          </h2>
          <button type="button" onClick={onNextMonth} className="btn-ghost text-sm w-8 h-8 flex items-center justify-center rounded-full" aria-label="Next month">→</button>
          <button type="button" onClick={onToday} className="btn-teal text-xs px-3 py-1">Today</button>
        </div>

        <button
          type="button"
          className="relative grid grid-cols-2 rounded-lg border border-[var(--border)] p-1 text-[var(--body)]"
          onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
          aria-label="Toggle grid/list view"
        >
          <div
            className="absolute inset-y-1 left-1 w-7 rounded-md bg-[var(--primary)] transition-transform duration-300"
            style={{ transform: view === 'grid' ? 'translateX(28px)' : 'translateX(0)' }}
          />
          <span className="relative z-[1] flex h-7 w-7 items-center justify-center">
            <Columns3 size={15} className={cn('transition-colors', view === 'list' ? 'text-white' : '')} />
          </span>
          <span className="relative z-[1] flex h-7 w-7 items-center justify-center">
            <LayoutGrid size={15} className={cn('transition-colors', view === 'grid' ? 'text-white' : '')} />
          </span>
        </button>
      </div>

      {view === 'grid' ? (
        <div>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="rounded-lg bg-[var(--muted)] py-1 text-center text-[10px] font-semibold text-[var(--body)]">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d) => {
              const key = ymd(d);
              const count = (meetingsByDay.get(key) || []).length;
              return (
                <Day
                  key={key}
                  dateKey={key}
                  dayNumber={d.getDate()}
                  inMonth={d.getMonth() === month.getMonth()}
                  isToday={key === todayKey}
                  isSelected={selectedDay === key}
                  count={count}
                  onHover={setHoveredDay}
                  onSelect={(k) => onSelectDay(selectedDay === k ? null : k)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-h-[520px] flex-col overflow-y-auto rounded-xl border border-[var(--border)]"
        >
          {daysWithMeetings.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--body)]">No bookings this month yet.</div>
          )}
          <AnimatePresence>
            {daysWithMeetings.map((dayKey) => {
              const dayMeetings = meetingsByDay.get(dayKey) || [];
              return (
                <motion.div key={dayKey} layout className="border-b border-[var(--border)] last:border-b-0">
                  {dayMeetings.map((meeting, i) => {
                    const v = renderMeeting(meeting);
                    return (
                      <motion.div
                        key={meeting.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, delay: i * 0.04 }}
                        className="border-b border-[var(--border)] p-3 last:border-b-0 hover:bg-white/[0.02]"
                      >
                        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--body)]">
                          <span>{v.date}</span>
                          <span>{v.time}</span>
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">{v.title}</h3>
                        {v.participants.length > 0 && (
                          <p className="mb-1 text-xs text-[var(--body)]">{v.participants.join(', ')}</p>
                        )}
                        {v.location && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--primary)]">
                            <Video size={12} />
                            <span>{v.location}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
