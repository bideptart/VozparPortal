import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  RefreshCw,
  Plus,
  Check,
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
  critical: { color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/25', dot: 'bg-rose-400', railColor: '#fb7185', label: 'Critical' },
  high: { color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/25', dot: 'bg-red-400', railColor: '#f87171', label: 'High' },
  medium: { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/25', dot: 'bg-orange-400', railColor: '#fb923c', label: 'Medium' },
  low: { color: 'text-sky-300', bg: 'bg-sky-500/15', border: 'border-sky-500/25', dot: 'bg-sky-400', railColor: '#38bdf8', label: 'Low' },
};

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
const NEW_TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORY_OPTIONS = ['Support', 'Technical', 'Billing', 'Sales', 'Complaint', 'General'];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'priority', label: 'Priority (high first)' },
];

const SUMMARY_CARDS = [
  { id: 'all', label: 'Total Tickets', icon: LayoutGrid, tone: { bg: 'bg-[var(--glow)]', color: 'text-[var(--primary)]' } },
  { id: 'open', label: 'Open', icon: AlertTriangle, tone: { bg: 'bg-amber-500/15', color: 'text-amber-300' } },
  { id: 'in-progress', label: 'In Progress', icon: Clock, tone: { bg: 'bg-[var(--glow)]', color: 'text-[var(--primary)]' } },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: { bg: 'bg-emerald-500/15', color: 'text-emerald-300' } },
  { id: 'closed', label: 'Closed', icon: XCircle, tone: { bg: 'bg-[var(--muted)]', color: 'text-[var(--body)]' } },
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

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-backdrop-in" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--body)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function SummaryCard({ icon: Icon, label, value, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius)] border p-4 text-left transition-colors duration-200 ${
        active
          ? 'border-[var(--primary)] bg-[var(--glow)] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_16px_-10px_rgba(0,0,0,0.5)]'
          : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">{label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${tone.bg}`}>
          <Icon size={12} className={tone.color} />
        </span>
      </div>
      <div className="mt-2 text-[26px] font-bold leading-none text-[var(--foreground)]">{value}</div>
    </button>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium ${meta.bg} ${meta.color} ${meta.border}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.low;
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${meta.bg} ${meta.color} ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function TicketCardSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 animate-pulse">
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
      className="group relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] border-l-4 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)] cursor-pointer"
      style={{ borderLeftColor: priorityMeta.railColor }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <h3 className="text-base font-semibold leading-snug text-[var(--foreground)] truncate">{ticket.subject}</h3>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
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

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--body)]">
        <span className="inline-flex items-center gap-1.5">
          <Tag size={12} className="text-[var(--body)]" />
          {ticket.category}
        </span>
        {ticket.caller && (
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Phone size={12} className="text-[var(--body)]" />
            {ticket.caller}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Bot size={12} className="text-[var(--body)]" />
          {ticket.agent}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={12} className="text-[var(--body)]" />
          {fmtDate(ticket.updated)}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
        <span className="font-mono text-[11px] text-[var(--body)]">{ticketCode(ticket.id)}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-0.5">
          View details
          <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}

const EMPTY_NEW_TICKET = { subject: '', description: '', category: 'Support', priority: 'medium', callerName: '', callerPhone: '' };

export default function Tickets() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const isAdminTier = currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  const [tickets, setTickets] = useState(DUMMY_TICKETS);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const [slaHours, setSlaHours] = useState(3);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaDraft, setSlaDraft] = useState('3');
  const [slaError, setSlaError] = useState('');

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState(EMPTY_NEW_TICKET);
  const [newTicketErrors, setNewTicketErrors] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const togglePriorityFilter = (p) => {
    setPriorityFilter((current) => (current.includes(p) ? current.filter((x) => x !== p) : [...current, p]));
  };

  const filtered = useMemo(() => {
    let list = tickets.filter((t) => {
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
  }, [tickets, filter, search, sort, priorityFilter]);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    tickets.forEach((t) => { if (c[t.status] !== undefined) c[t.status]++; });
    return c;
  }, [tickets]);

  const clearAllFilters = () => {
    setFilter('all');
    setSearch('');
    setPriorityFilter([]);
  };

  const hasActiveFilters = filter !== 'all' || Boolean(search) || priorityFilter.length > 0;

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setToast('Tickets updated successfully.');
    }, 700);
  };

  const openSlaModal = () => {
    setSlaDraft(String(slaHours));
    setSlaError('');
    setSlaModalOpen(true);
  };

  const saveSla = () => {
    const value = Number(slaDraft);
    if (!Number.isFinite(value) || value < 1 || value > 72) {
      setSlaError('Enter a value between 1 and 72 hours.');
      return;
    }
    setSlaHours(Math.round(value));
    setSlaModalOpen(false);
    setToast('SLA target updated successfully.');
  };

  const openNewTicketModal = () => {
    setNewTicketForm(EMPTY_NEW_TICKET);
    setNewTicketErrors({});
    setNewTicketOpen(true);
  };

  const updateNewTicketField = (field, value) => {
    setNewTicketForm((current) => ({ ...current, [field]: value }));
  };

  const createTicket = () => {
    const errors = {};
    if (!newTicketForm.subject.trim()) errors.subject = 'Subject is required.';
    if (!newTicketForm.description.trim()) errors.description = 'Description is required.';
    if (Object.keys(errors).length) {
      setNewTicketErrors(errors);
      return;
    }

    const now = new Date().toISOString();
    const newTicket = {
      id: `t${Date.now()}`,
      subject: newTicketForm.subject.trim(),
      description: newTicketForm.description.trim(),
      status: 'open',
      priority: newTicketForm.priority,
      category: newTicketForm.category,
      caller: newTicketForm.callerPhone.trim() || null,
      callerName: newTicketForm.callerName.trim(),
      agent: 'Manual entry',
      created: now,
      updated: now,
    };

    setTickets((current) => [newTicket, ...current]);
    setNewTicketOpen(false);
    setToast('Ticket created successfully.');
  };

  const toolbarControl = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 text-sm font-medium transition-colors duration-200 shrink-0';
  const toolbarGhost = `${toolbarControl} border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[var(--primary)]/50`;
  const toolbarPrimary = `${toolbarControl} border-[rgba(4,107,210,0.35)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]`;

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Issues your AI agent captured during calls. SLA: {slaHours}h</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SUMMARY_CARDS.map((card) => (
          <SummaryCard
            key={card.id}
            icon={card.icon}
            label={card.label}
            value={counts[card.id] ?? 0}
            tone={card.tone}
            active={filter === card.id}
            onClick={() => setFilter(card.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={toolbarGhost} onClick={openSlaModal}>
            <Clock size={14} />
            SLA
          </button>

          <button
            type="button"
            className={toolbarGhost}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button type="button" className={toolbarPrimary} onClick={openNewTicketModal}>
            <Plus size={14} />
            New Ticket
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input
              className="input h-10 rounded-[var(--radius-sm)] pl-10 text-sm"
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
              className={
                priorityFilter.length
                  ? `${toolbarControl} border-[rgba(4,107,210,0.35)] bg-[var(--glow)] text-[var(--primary)]`
                  : toolbarGhost
              }
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
              className="input h-10 w-auto min-w-[168px] appearance-none rounded-[var(--radius-sm)] pl-9 pr-8 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <TicketCardSkeleton key={i} />)}
        </div>
      ) : filtered.length ? (
        <div className="space-y-3 transition-opacity duration-200">
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

      {slaModalOpen && (
        <Modal title="Resolution target" onClose={() => setSlaModalOpen(false)}>
          <p className="text-sm text-[var(--body)]">
            Tickets that remain open longer than this will automatically be marked as overdue.
          </p>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">SLA Hours</label>
            <input
              type="number"
              min={1}
              max={72}
              className="input mt-2 text-sm"
              value={slaDraft}
              onChange={(e) => { setSlaDraft(e.target.value); setSlaError(''); }}
            />
            <p className="mt-2 text-xs text-[var(--body)]">
              Tickets exceeding this duration will automatically be highlighted as overdue.
            </p>
            {slaError && <p className="mt-2 text-xs font-medium text-red-300">{slaError}</p>}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={() => setSlaModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary text-sm" onClick={saveSla}>Save Target</button>
          </div>
        </Modal>
      )}

      {newTicketOpen && (
        <Modal title="Create ticket" onClose={() => setNewTicketOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Subject</label>
              <input
                className="input mt-2 text-sm"
                value={newTicketForm.subject}
                onChange={(e) => updateNewTicketField('subject', e.target.value)}
                placeholder="Brief summary of the issue"
              />
              {newTicketErrors.subject && <p className="mt-1.5 text-xs font-medium text-red-300">{newTicketErrors.subject}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Description</label>
              <textarea
                className="input mt-2 text-sm min-h-[88px] resize-y"
                value={newTicketForm.description}
                onChange={(e) => updateNewTicketField('description', e.target.value)}
                placeholder="What happened, and any relevant context"
              />
              {newTicketErrors.description && <p className="mt-1.5 text-xs font-medium text-red-300">{newTicketErrors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Category</label>
                <select
                  className="input mt-2 text-sm"
                  value={newTicketForm.category}
                  onChange={(e) => updateNewTicketField('category', e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Priority</label>
                <select
                  className="input mt-2 text-sm"
                  value={newTicketForm.priority}
                  onChange={(e) => updateNewTicketField('priority', e.target.value)}
                >
                  {NEW_TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Caller Name</label>
                <input
                  className="input mt-2 text-sm"
                  value={newTicketForm.callerName}
                  onChange={(e) => updateNewTicketField('callerName', e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Caller Phone</label>
                <input
                  className="input mt-2 text-sm"
                  value={newTicketForm.callerPhone}
                  onChange={(e) => updateNewTicketField('callerPhone', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={() => setNewTicketOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary text-sm" onClick={createTicket}>Create Ticket</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[10000] animate-pop-in">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-[var(--popover)] px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-xl">
            <Check size={16} className="text-emerald-400" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
