import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad2 = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromIso = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtDisplay = (iso) => {
  const d = fromIso(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// A dark, circular-day calendar grid — month/year header with prev/next
// arrows plus a "Today" jump button, a weekday row, and a 6-week grid of
// round day buttons. Purely presentational; the caller owns the selected
// value and viewed month.
function CalendarGrid({ viewDate, selected, onSelect, onViewChange }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const goMonth = (delta) => onViewChange(new Date(year, month + delta, 1));

  return (
    <div className="w-[320px] rounded-2xl border border-lime-500/30 bg-[var(--popover)] shadow-[0_0_0_1px_rgba(163,230,53,0.08),0_20px_60px_-20px_rgba(0,0,0,0.6)] p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-mute hover:text-[var(--foreground)] hover:border-[var(--primary)] transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { onViewChange(new Date(today.getFullYear(), today.getMonth(), 1)); onSelect(today); }}
          className="px-4 py-1.5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-mute hover:text-[var(--foreground)] hover:border-[var(--primary)] transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center text-xs font-semibold uppercase tracking-wider text-mute mb-2">
        {MONTH_NAMES[month]} {year}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-bold tracking-wider text-mute">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              className={`aspect-square w-full rounded-full text-sm flex items-center justify-center border transition
                ${isSelected
                  ? 'bg-[var(--primary)] border-lime-400 text-white ring-2 ring-lime-400/70 font-semibold'
                  : isToday
                    ? 'border-[var(--primary)] text-[var(--foreground)]'
                    : inMonth
                      ? 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)]'
                      : 'border-transparent text-mute/40'
                }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A trigger button styled like the app's other inputs; clicking it opens
// the calendar centered in a fixed overlay rather than anchored beneath
// the field (the native <input type="date"> popup this replaces opened
// off to the side, anchored to the field).
export default function DatePickerField({ value, onChange, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => fromIso(value) || new Date());
  const selected = fromIso(value);
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) setViewDate(selected || new Date());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input text-left flex items-center justify-between gap-2 w-full"
      >
        <span className={value ? 'text-[var(--foreground)]' : 'text-mute'}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        <CalendarDays className="w-4 h-4 text-mute shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={containerRef}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
            <CalendarGrid
              viewDate={viewDate}
              selected={selected}
              onViewChange={setViewDate}
              onSelect={(d) => { onChange(toIso(d)); setOpen(false); }}
            />
            <div className="flex items-center gap-4">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="text-sm text-mute hover:text-[var(--foreground)] transition"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-lime-400 hover:text-lime-300 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
