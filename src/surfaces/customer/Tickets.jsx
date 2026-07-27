import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../AppContext.jsx';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Tag,
  Phone,
  Bot,
  Calendar,
  MoreVertical,
  ArrowRight,
  Inbox,
  X,
} from 'lucide-react';

const DUMMY_TICKETS = [
  { id: 't1', subject: 'Caller reported dropped call', status: 'open', priority: 'high', category: 'Technical', caller: '+1 (555) 123-4567', agent: 'Sales Agent', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 1800000).toISOString() },
  { id: 't2', subject: 'Wrong information given about pricing', status: 'in-progress', priority: 'medium', category: 'Content', caller: '+1 (555) 987-6543', agent: 'Support Agent', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 3600000).toISOString() },
  { id: 't3', subject: 'Booking agent not available', status: 'resolved', priority: 'low', category: 'Availability', caller: 'Web Visitor', agent: 'Booking Agent', created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 43200000).toISOString() },
  { id: 't4', subject: 'Greeting sounds unnatural', status: 'open', priority: 'medium', category: 'Voice', caller: null, agent: 'Sales Agent', created: new Date(Date.now() - 259200000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
  { id: 't5', subject: 'Customer asked for human agent', status: 'closed', priority: 'low', category: 'Escalation', caller: '+1 (555) 456-7890', agent: 'Support Agent', created: new Date(Date.now() - 345600000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
];

const STATUS_META = {
  open: { icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/25', label: 'Open' },
  'in-progress': { icon: Clock, color: 'text-[var(--primary)]', bg: 'bg-[var(--glow)]', border: 'border-[rgba(4,107,210,0.28)]', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', label: 'Resolved' },
  closed: { icon: XCircle, color: 'text-[var(--body)]', bg: 'bg-[var(--muted)]', border: 'border-[var(--border)]', label: 'Closed' },
};

const PRIORITY_META = {
  high: { color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/25', dot: 'bg-red-400', railColor: '#f87171', label: 'High' },
  medium: { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/25', dot: 'bg-orange-400', railColor: '#fb923c', label: 'Medium' },
  low: { color: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/25', dot: 'bg-sky-400', railColor: '#38bdf8', label: 'Low' },
};

const STATUS_ORDER = ['all', 'open', 'in-progress', 'resolved', 'closed'];
const PRIORITY_ORDER = ['high', 'medium', 'low'];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'priority', label: 'Priority (high first)' },
];

function ticketCode(id) {
  const n = Number(String(id).replace(/\D/g, '')) || 0;
  return `#TK-${String(2040 + n).padStart(4, '0')}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="form-card rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[0_16px_36px_-22px_var(--glow-strong)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.bg}`}>
          <Icon size={14} className={tone.color} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.bg} ${meta.color} ${meta.border}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.low;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.bg} ${meta.color} ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function TicketCardSkeleton() {
  return (
    <div className="form-card rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-2/5 rounded bg-[var(--muted)]" />
        <div className="h-4 w-16 rounded-full bg-[var(--muted)]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="h-3 w-24 rounded bg-[var(--muted)]" />
        <div className="h-3 w-28 rounded bg-[var(--muted)]" />
        <div className="h-3 w-20 rounded bg-[var(--muted)]" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-[var(--muted)]" />
        <div className="h-3 w-20 rounded bg-[var(--muted)]" />
      </div>
    </div>
  );
}

function TicketCard({ ticket, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priorityMeta = PRIORITY_META[ticket.priority] || PRIORITY_META.low;

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative form-card rounded-2xl border-l-4 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[0_18px_40px_-22px_var(--glow-strong)] cursor-pointer"
      style={{ borderLeftColor: priorityMeta.railColor }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] truncate">{ticket.subject}</h3>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Ticket actions"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                <button type="button" className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}>Mark resolved</button>
                <button type="button" className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}>Reassign</button>
                <button type="button" className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-[var(--muted)]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}>Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--body)]">
        <span className="inline-flex items-center gap-1.5">
          <Tag size={12} className="text-[var(--accent)]" />
          {ticket.category}
        </span>
        {ticket.caller && (
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Phone size={12} className="text-[var(--accent)]" />
            {ticket.caller}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Bot size={12} className="text-[var(--accent)]" />
          {ticket.agent}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={12} className="text-[var(--accent)]" />
          {fmtDate(ticket.updated)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className="font-mono text-[11px] text-[var(--body)]">{ticketCode(ticket.id)}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] transition-transform group-hover:translate-x-0.5">
          View details
          <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const isAdminTier = currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const togglePriorityFilter = (p) => {
    setPriorityFilter((current) => (current.includes(p) ? current.filter((x) => x !== p) : [...current, p]));
  };

  const filtered = useMemo(() => {
    let list = DUMMY_TICKETS.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (priorityFilter.length && !priorityFilter.includes(t.priority)) return false;
      if (search && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'priority') {
        return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      }
      const diff = new Date(b.updated) - new Date(a.updated);
      return sort === 'oldest' ? -diff : diff;
    });

    return list;
  }, [filter, search, sort, priorityFilter]);

  const counts = useMemo(() => {
    const c = { all: DUMMY_TICKETS.length, open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    DUMMY_TICKETS.forEach((t) => { if (c[t.status] !== undefined) c[t.status]++; });
    return c;
  }, []);

  const clearAllFilters = () => {
    setFilter('all');
    setSearch('');
    setPriorityFilter([]);
  };

  const hasActiveFilters = filter !== 'all' || Boolean(search) || priorityFilter.length > 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Issues your AI agent captured during calls. SLA: 3h</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard icon={LayoutGrid} label="Total Tickets" value={counts.all} tone={{ bg: 'bg-[var(--glow)]', color: 'text-[var(--primary)]' }} />
        <SummaryCard icon={AlertTriangle} label="Open" value={counts.open} tone={{ bg: 'bg-amber-500/15', color: 'text-amber-300' }} />
        <SummaryCard icon={Clock} label="In Progress" value={counts['in-progress']} tone={{ bg: 'bg-[var(--glow)]', color: 'text-[var(--primary)]' }} />
        <SummaryCard icon={CheckCircle2} label="Resolved" value={counts.resolved} tone={{ bg: 'bg-emerald-500/15', color: 'text-emerald-300' }} />
        <SummaryCard icon={XCircle} label="Closed" value={counts.closed} tone={{ bg: 'bg-[var(--muted)]', color: 'text-[var(--body)]' }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === s
                ? 'bg-[var(--primary)] text-white shadow-[0_10px_24px_-14px_var(--glow-strong)]'
                : 'border border-[var(--border)] bg-[var(--card)] text-[var(--body)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_META[s]?.label || s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
          <input
            className="input pl-10 text-sm"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--body)] hover:text-[var(--foreground)]"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`inline-flex h-[42px] items-center gap-2 rounded-[var(--radius-sm)] border px-4 text-sm font-medium transition-colors ${
              priorityFilter.length
                ? 'border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filter
            {priorityFilter.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {priorityFilter.length}
              </span>
            )}
          </button>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Priority</div>
                <div className="mt-2 space-y-1.5">
                  {PRIORITY_ORDER.map((p) => (
                    <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={priorityFilter.includes(p)}
                        onChange={() => togglePriorityFilter(p)}
                        className="accent-[var(--primary)]"
                      />
                      {PRIORITY_META[p].label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative shrink-0">
          <ArrowUpDown size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
          <select
            className="input h-[42px] w-auto min-w-[168px] appearance-none pl-9 pr-8 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <TicketCardSkeleton key={i} />)}
        </div>
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onOpen={() => navigate(`${basePath}/ticket-detail?id=${ticket.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="form-card rounded-2xl flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--body)]">
            <Inbox size={22} />
          </div>
          <div className="text-sm font-semibold text-[var(--foreground)]">No tickets match your filters</div>
          <p className="max-w-xs text-xs text-[var(--body)]">Try adjusting your search, status, or priority filters to see more results.</p>
          {hasActiveFilters && (
            <button type="button" className="btn-ghost text-xs mt-1" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
