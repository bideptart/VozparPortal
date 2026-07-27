import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  Minus,
  Check,
  Target,
  Info,
  User,
  UserPlus,
  Activity,
  MessageSquare,
  FileText,
  Trash2,
  Ticket as TicketIcon,
  Wrench,
  CreditCard,
  TrendingUp,
  LifeBuoy,
  Mail,
  Paperclip,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const DUMMY_TICKETS = [
  { id: 't1', subject: 'Caller reported dropped call', description: 'Caller said the line cut out twice during the call and had to redial to finish the conversation.', status: 'open', priority: 'high', category: 'Technical', caller: '+1 (555) 123-4567', callerName: 'Maria Chen', agent: 'Sales Agent', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 1800000).toISOString() },
  { id: 't2', subject: 'Wrong information given about pricing', description: 'Agent quoted the Growth plan price instead of Starter. Caller was confused about the monthly total.', status: 'in-progress', priority: 'medium', category: 'Content', caller: '+1 (555) 987-6543', callerName: 'David Okafor', agent: 'Support Agent', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 3600000).toISOString() },
  { id: 't3', subject: 'Booking agent not available', description: 'Web visitor tried to book a slot outside business hours and got no fallback message.', status: 'resolved', priority: 'low', category: 'Availability', caller: null, callerName: '', agent: 'Booking Agent', created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 43200000).toISOString() },
  { id: 't4', subject: 'Greeting sounds unnatural', description: 'Internal QA flagged the opening greeting as sounding robotic on the Sales Agent voice.', status: 'open', priority: 'medium', category: 'Voice', caller: null, callerName: '', agent: 'Sales Agent', created: new Date(Date.now() - 259200000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
  { id: 't5', subject: 'Customer asked for human agent', description: 'Caller asked twice to be transferred to a person; the agent did not offer an escalation path.', status: 'closed', priority: 'low', category: 'Escalation', caller: '+1 (555) 456-7890', callerName: 'Priya Sharma', agent: 'Support Agent', created: new Date(Date.now() - 345600000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
];

const AGENT_OPTIONS = ['Sales Agent', 'Support Agent', 'Booking Agent', 'Manual entry'];

const ACTIVITY_META = {
  created: { icon: FileText, color: 'text-[var(--primary)]', bg: 'bg-[var(--glow)]' },
  assigned: { icon: UserPlus, color: 'text-sky-300', bg: 'bg-sky-500/15' },
  status: { icon: Clock, color: 'text-amber-300', bg: 'bg-amber-500/15' },
  priority: { icon: AlertTriangle, color: 'text-orange-300', bg: 'bg-orange-500/15' },
  updated: { icon: Info, color: 'text-[var(--body)]', bg: 'bg-[var(--muted)]' },
};

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
const CATEGORY_OPTIONS = ['Technical', 'Billing', 'Sales', 'Complaint', 'Support', 'General'];

const CATEGORY_META = {
  Technical: { icon: Wrench, color: 'text-sky-300' },
  Billing: { icon: CreditCard, color: 'text-emerald-300' },
  Sales: { icon: TrendingUp, color: 'text-orange-300' },
  Complaint: { icon: AlertTriangle, color: 'text-red-300' },
  Support: { icon: LifeBuoy, color: 'text-[var(--primary)]' },
  General: { icon: LayoutGrid, color: 'text-[var(--body)]' },
};

const RESPONSE_TIME = {
  critical: 'Within 15 minutes',
  high: 'Within 1 hour',
  medium: 'Within 4 hours',
  low: 'Within 24 hours',
};

const CATEGORY_KEYWORDS = [
  { category: 'Billing', words: ['price', 'pricing', 'bill', 'invoice', 'charge', 'refund', 'payment'] },
  { category: 'Technical', words: ['bug', 'error', 'crash', 'not working', 'broken', 'glitch', 'dropped call'] },
  { category: 'Sales', words: ['upgrade', 'demo', 'plan', 'quote', 'trial'] },
  { category: 'Complaint', words: ['angry', 'complain', 'unhappy', 'frustrated', 'disappointed', 'rude'] },
];

function suggestCategory(text) {
  const lower = text.toLowerCase();
  const match = CATEGORY_KEYWORDS.find(({ words }) => words.some((w) => lower.includes(w)));
  return match?.category || null;
}

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

function fmtFullDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function Modal({ title, subtitle, badge, icon: HeaderIcon, onClose, children, widthClassName = 'max-w-md', onKeyDownCapture }) {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-backdrop-in" />
      <div
        className={`relative flex w-full ${widthClassName} max-h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl animate-modal-in`}
        onClick={(event) => event.stopPropagation()}
        onKeyDownCapture={onKeyDownCapture}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            {HeaderIcon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
                <HeaderIcon size={16} />
              </span>
            )}
            <div className="min-w-0">
              <h2 id="modal-title" className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
              {subtitle && <p className="mt-1 text-sm leading-5 text-[var(--body)]">{subtitle}</p>}
              {badge && (
                <span className="mt-2 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--body)]">
                  {badge}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
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
    <div className="animate-pulse px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pl-3">
          <div className="h-4 w-2/5 rounded bg-[var(--muted)]" />
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="h-3 w-20 rounded bg-[var(--muted)]" />
            <div className="h-3 w-16 rounded bg-[var(--muted)]" />
            <div className="h-3 w-20 rounded bg-[var(--muted)]" />
            <div className="h-3 w-24 rounded bg-[var(--muted)]" />
            <div className="h-3 w-24 rounded bg-[var(--muted)]" />
            <div className="h-3 w-16 rounded bg-[var(--muted)]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded bg-[var(--muted)]" />
          <div className="h-8 w-8 rounded-full bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priorityMeta = PRIORITY_META[ticket.priority] || PRIORITY_META.low;
  const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
  const StatusIcon = statusMeta.icon;
  const metaItemClass = 'inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[var(--body)]';
  const stopPropagation = (event) => event.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative cursor-pointer px-4 py-3 transition-all duration-200 hover:bg-[rgba(4,107,210,0.06)] hover:shadow-[inset_0_0_0_1px_rgba(4,107,210,0.34)] focus-visible:outline-none focus-visible:bg-[rgba(4,107,210,0.06)] focus-visible:shadow-[inset_0_0_0_1px_rgba(4,107,210,0.34)]"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span
        className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full"
        style={{ backgroundColor: priorityMeta.railColor }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-5 text-[var(--foreground)] sm:text-[15px]">
            {ticket.subject}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className={metaItemClass}>
              <Tag size={12} className="text-[var(--body)]" />
              {ticket.category || 'General'}
            </span>
            <span className={`${metaItemClass} ${priorityMeta.color}`}>
              <AlertTriangle size={12} />
              {priorityMeta.label}
            </span>
            <span className={`${metaItemClass} ${statusMeta.color}`}>
              <StatusIcon size={12} />
              {statusMeta.label}
            </span>
            <span className={metaItemClass}>
              <Bot size={12} className="text-[var(--body)]" />
              {ticket.agent || 'Unassigned'}
            </span>
            <span className={`${metaItemClass} font-mono`}>
              <Phone size={12} className="text-[var(--body)]" />
              {ticket.caller || '—'}
            </span>
            <span className={metaItemClass}>
              <Clock size={12} className="text-[var(--body)]" />
              {fmtDate(ticket.updated)}
            </span>
            <span className={`${metaItemClass} font-mono`}>
              <FileText size={12} className="text-[var(--body)]" />
              {ticketCode(ticket.id)}
            </span>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--primary)] transition-colors duration-200 hover:bg-[var(--glow)]"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            View details
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
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
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onOpen();
                  }}
                >
                  View details
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
                  onClick={(e) => {
                    stopPropagation(e);
                    navigator?.clipboard?.writeText(ticketCode(ticket.id));
                    setMenuOpen(false);
                  }}
                >
                  Copy ticket ID
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewField({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">
        <Icon size={12} className="text-[var(--body)]" />
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-medium text-[var(--foreground)]">{value || '—'}</div>
    </div>
  );
}

function TicketDrawer({
  ticket,
  slaHours,
  previousTicketsCount,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onAssign,
  onResolve,
  onSaveDetails,
  onAddNote,
  onDelete,
}) {
  const [draft, setDraft] = useState({
    subject: ticket.subject,
    description: ticket.description || '',
    category: ticket.category,
  });
  const [noteDraft, setNoteDraft] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const dirty =
    draft.subject !== ticket.subject ||
    draft.description !== (ticket.description || '') ||
    draft.category !== ticket.category;

  const isOverdue =
    (ticket.status === 'open' || ticket.status === 'in-progress') &&
    (Date.now() - new Date(ticket.created).getTime()) / 3600000 > slaHours;

  const activity = useMemo(
    () => [...(ticket.activityLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [ticket.activityLog]
  );

  const notes = [...(ticket.notes || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleSave = () => {
    if (!dirty) return;
    onSaveDetails(ticket.id, {
      subject: draft.subject.trim() || ticket.subject,
      description: draft.description.trim(),
      category: draft.category,
    });
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    onAddNote(ticket.id, noteDraft.trim());
    setNoteDraft('');
  };

  const handleDelete = () => {
    if (window.confirm('Delete this ticket? This cannot be undone.')) {
      onDelete(ticket.id);
    }
  };

  const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]';
  const fieldLabel = 'text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)]';
  const dropdownToggle =
    'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white';

  const content = (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-in" />

      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl animate-drawer-in"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="shrink-0 border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[var(--body)]">{ticketCode(ticket.id)}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {isOverdue && (
                <span className="inline-flex h-6 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 text-[11px] font-medium text-red-300">
                  <AlertTriangle size={11} />
                  Overdue
                </span>
              )}
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <h2 id="drawer-title" className="mt-3 text-xl font-semibold leading-snug text-[var(--foreground)]">
            {ticket.subject}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <button type="button" className={dropdownToggle} onClick={() => setAssignOpen((v) => !v)}>
                <UserPlus size={13} />
                Assign
              </button>
              {assignOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAssignOpen(false)} />
                  <div className="absolute left-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                    {AGENT_OPTIONS.map((agent) => (
                      <button
                        key={agent}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
                        onClick={() => { onAssign(ticket.id, agent); setAssignOpen(false); }}
                      >
                        {agent}
                        {agent === ticket.agent && <Check size={12} className="text-[var(--primary)]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className={`${dropdownToggle} disabled:opacity-40 disabled:pointer-events-none`}
              onClick={() => onResolve(ticket.id)}
              disabled={ticket.status === 'resolved'}
            >
              <CheckCircle2 size={13} />
              Resolve
            </button>

            <div className="relative">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] text-[var(--body)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white"
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More actions"
              >
                <MoreVertical size={14} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute left-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
                      onClick={() => { onUpdateStatus(ticket.id, 'closed'); setMoreOpen(false); }}
                    >
                      Close ticket
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-[var(--muted)]"
                      onClick={() => { setMoreOpen(false); handleDelete(); }}
                    >
                      Delete ticket
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <div className={sectionLabel}>Ticket Overview</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <OverviewField icon={Bot} label="Assigned Agent" value={ticket.agent} />
              <OverviewField icon={User} label="Caller Name" value={ticket.callerName} />
              <OverviewField icon={Phone} label="Caller Phone" value={ticket.caller} />
              <OverviewField icon={Tag} label="Category" value={ticket.category} />
              <OverviewField icon={Calendar} label="Created" value={fmtFullDate(ticket.created)} />
              <OverviewField icon={Clock} label="Last Updated" value={fmtFullDate(ticket.updated)} />
            </div>
          </section>

          <div className="border-t border-[var(--border)]" />

          <section className="space-y-4">
            <div className={sectionLabel}>Details</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Status</label>
                <select
                  className="input mt-2 h-10 rounded-[var(--radius-sm)] text-sm"
                  value={ticket.status}
                  onChange={(e) => onUpdateStatus(ticket.id, e.target.value)}
                >
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Priority</label>
                <select
                  className="input mt-2 h-10 rounded-[var(--radius-sm)] text-sm"
                  value={ticket.priority}
                  onChange={(e) => onUpdatePriority(ticket.id, e.target.value)}
                >
                  {NEW_TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={fieldLabel}>Category</label>
              <select
                className="input mt-2 h-10 rounded-[var(--radius-sm)] text-sm"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={fieldLabel}>Subject</label>
              <input
                className="input mt-2 h-10 rounded-[var(--radius-sm)] text-sm"
                value={draft.subject}
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className={fieldLabel}>Description</label>
              <textarea
                className="input mt-2 rounded-[var(--radius-sm)] text-sm min-h-[96px] resize-y"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Add a description…"
              />
            </div>
          </section>

          <div className="border-t border-[var(--border)]" />

          <section>
            <div className={`${sectionLabel} flex items-center gap-1.5`}>
              <Activity size={12} />
              Activity
            </div>
            <div className="mt-3 space-y-4">
              {activity.length ? activity.map((entry) => {
                const meta = ACTIVITY_META[entry.type] || ACTIVITY_META.updated;
                const EntryIcon = meta.icon;
                return (
                  <div key={entry.id} className="flex gap-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                      <EntryIcon size={12} className={meta.color} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-sm text-[var(--foreground)]">{entry.text}</div>
                      <div className="mt-0.5 text-xs text-[var(--body)]">{fmtDate(entry.date)}</div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-[var(--body)]">No activity yet.</p>
              )}
            </div>
          </section>

          <div className="border-t border-[var(--border)]" />

          <section>
            <div className={`${sectionLabel} flex items-center gap-1.5`}>
              <MessageSquare size={12} />
              Internal Notes
            </div>
            <div className="mt-3">
              <textarea
                className="input rounded-[var(--radius-sm)] text-sm min-h-[72px] resize-y"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note…"
              />
              <button
                type="button"
                className="btn-ghost text-xs mt-2 disabled:opacity-40 disabled:pointer-events-none"
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
              >
                <Plus size={12} className="mr-1 inline" />
                Add Note
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {notes.length ? notes.map((note) => (
                <div key={note.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3">
                  <div className="flex items-center justify-between text-xs text-[var(--body)]">
                    <span className="font-medium text-[var(--foreground)]">{note.author}</span>
                    <span>{fmtDate(note.date)}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--foreground)]">{note.text}</p>
                </div>
              )) : (
                <p className="text-xs text-[var(--body)]">No internal notes yet.</p>
              )}
            </div>
          </section>

          <div className="border-t border-[var(--border)]" />

          <section>
            <div className={sectionLabel}>Customer Information</div>
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Caller Name</div>
                <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{ticket.callerName || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Phone Number</div>
                <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{ticket.caller || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Previous Tickets</div>
                <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{previousTicketsCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Last Contact</div>
                <div className="mt-1 text-sm font-medium text-[var(--foreground)]">{fmtFullDate(ticket.updated)}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] p-4">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] border border-red-500/25 bg-red-500/10 px-3.5 text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-500/20"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            Delete Ticket
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost text-sm h-10" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn-primary text-sm h-10 disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleSave}
              disabled={!dirty}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

const EMPTY_NEW_TICKET = { subject: '', description: '', category: 'Support', priority: 'medium', callerName: '', callerPhone: '', callerEmail: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldDropdown({ value, options, onChange, renderOption, renderValue, invalid }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className={`input mt-2 flex h-11 w-full items-center justify-between rounded-[var(--radius-sm)] text-sm transition-colors duration-200 ${
          invalid ? '!border-red-500/60' : ''
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        {renderValue(value)}
        <ChevronDown size={14} className={`shrink-0 text-[var(--body)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] animate-modal-in">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)]"
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {renderOption(opt)}
                {opt === value && <Check size={13} className="ml-auto shrink-0 text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState(DUMMY_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
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
  const [newTicketAttachment, setNewTicketAttachment] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);

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

  const appendActivity = (ticketId, text, type) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId
        ? {
            ...t,
            activityLog: [
              ...(t.activityLog || []),
              { id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, text, date: new Date().toISOString() },
            ],
          }
        : t
    )));
  };

  const openTicketDrawer = (ticket) => {
    setTickets((current) => current.map((t) => (
      t.id === ticket.id
        ? {
            ...t,
            description: t.description ?? '',
            callerName: t.callerName ?? '',
            notes: t.notes ?? [],
            activityLog: t.activityLog ?? [
              { id: `${t.id}-seed-created`, type: 'created', text: 'Ticket created', date: t.created },
              { id: `${t.id}-seed-assigned`, type: 'assigned', text: `Assigned to ${t.agent}`, date: t.created },
            ],
          }
        : t
    )));
    setSelectedTicketId(ticket.id);
  };

  const closeTicketDrawer = () => setSelectedTicketId(null);

  const updateTicketStatus = (ticketId, status) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId ? { ...t, status, updated: new Date().toISOString() } : t
    )));
    appendActivity(ticketId, `Status changed to ${STATUS_META[status]?.label || status}`, 'status');
  };

  const updateTicketPriority = (ticketId, priority) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId ? { ...t, priority, updated: new Date().toISOString() } : t
    )));
    appendActivity(ticketId, `Priority changed to ${PRIORITY_META[priority]?.label || priority}`, 'priority');
  };

  const assignTicket = (ticketId, agent) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId ? { ...t, agent, updated: new Date().toISOString() } : t
    )));
    appendActivity(ticketId, `Assigned to ${agent}`, 'assigned');
  };

  const resolveTicket = (ticketId) => updateTicketStatus(ticketId, 'resolved');

  const saveTicketDetails = (ticketId, patch) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId ? { ...t, ...patch, updated: new Date().toISOString() } : t
    )));
    appendActivity(ticketId, 'Ticket details updated', 'updated');
    setToast('Ticket updated successfully.');
  };

  const addTicketNote = (ticketId, text) => {
    setTickets((current) => current.map((t) => (
      t.id === ticketId
        ? { ...t, notes: [...(t.notes || []), { id: `note_${Date.now()}`, text, author: 'You', date: new Date().toISOString() }] }
        : t
    )));
  };

  const deleteTicket = (ticketId) => {
    setTickets((current) => current.filter((t) => t.id !== ticketId));
    setSelectedTicketId(null);
    setToast('Ticket deleted.');
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

  const slaDraftValue = Number(slaDraft);
  const slaDraftValid = Number.isFinite(slaDraftValue) && slaDraftValue >= 1 && slaDraftValue <= 72;

  const adjustSlaDraft = (delta) => {
    setSlaDraft((current) => {
      const base = Number.isFinite(Number(current)) ? Number(current) : slaHours;
      return String(Math.min(72, Math.max(1, Math.round(base) + delta)));
    });
    setSlaError('');
  };

  const saveSla = () => {
    if (!slaDraftValid) {
      setSlaError('Enter a value between 1 and 72 hours.');
      return;
    }
    const rounded = Math.round(slaDraftValue);
    setSlaModalOpen(false);
    if (rounded === slaHours) {
      setToast('No changes to save.');
      return;
    }
    setSlaHours(rounded);
    setToast('SLA updated successfully.');
  };

  const openNewTicketModal = () => {
    setNewTicketForm(EMPTY_NEW_TICKET);
    setNewTicketErrors({});
    setNewTicketAttachment(null);
    setCreatingTicket(false);
    setNewTicketOpen(true);
  };

  const closeNewTicketModal = () => {
    if (creatingTicket) return;
    setNewTicketOpen(false);
  };

  const updateNewTicketField = (field, value) => {
    setNewTicketForm((current) => ({ ...current, [field]: value }));
    setNewTicketErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const newTicketErrorsFor = () => {
    const errors = {};
    if (!newTicketForm.subject.trim()) errors.subject = 'Subject is required.';
    if (!newTicketForm.description.trim()) errors.description = 'Description is required.';
    if (newTicketForm.callerEmail.trim() && !EMAIL_PATTERN.test(newTicketForm.callerEmail.trim())) {
      errors.callerEmail = 'Enter a valid email address.';
    }
    return errors;
  };

  // Only the required fields gate the Create button — an invalid optional
  // email is still caught (and shown inline) at submit time, so it never
  // silently disables the button with no visible reason.
  const newTicketRequiredMet = Boolean(newTicketForm.subject.trim() && newTicketForm.description.trim());

  const createTicket = () => {
    const errors = newTicketErrorsFor();
    if (Object.keys(errors).length) {
      setNewTicketErrors(errors);
      return;
    }

    setCreatingTicket(true);
    setTimeout(() => {
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
        callerEmail: newTicketForm.callerEmail.trim(),
        attachmentName: newTicketAttachment?.name || null,
        agent: 'Manual entry',
        created: now,
        updated: now,
      };

      setTickets((current) => [newTicket, ...current]);
      setCreatingTicket(false);
      setNewTicketOpen(false);
      setToast('Ticket created successfully.');
    }, 600);
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;
  const previousTicketsCount = selectedTicket
    ? tickets.filter((t) => t.id !== selectedTicket.id && t.caller && t.caller === selectedTicket.caller).length
    : 0;

  const toolbarControl = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 text-sm font-medium transition-colors duration-200 shrink-0';
  const toolbarGhost = `${toolbarControl} border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white`;

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

          <button type="button" className={toolbarGhost} onClick={openNewTicketModal}>
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
        <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card)]/40 divide-y divide-[var(--border)]">
          {[0, 1, 2].map((i) => <TicketCardSkeleton key={i} />)}
        </div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card)]/40 transition-opacity duration-200 divide-y divide-[var(--border)]">
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onOpen={() => openTicketDrawer(ticket)}
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
        <Modal
          title="Resolution Target"
          subtitle="Configure how long a ticket can remain open before it is automatically marked as overdue."
          badge={`Current SLA • ${slaHours} Hour${slaHours === 1 ? '' : 's'}`}
          icon={Target}
          widthClassName="max-w-[500px]"
          onClose={() => setSlaModalOpen(false)}
          onKeyDownCapture={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveSla();
            }
          }}
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--body)]">SLA Duration</label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--card)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => adjustSlaDraft(-1)}
                disabled={Number.isFinite(slaDraftValue) && slaDraftValue <= 1}
                aria-label="Decrease SLA hours"
              >
                <Minus size={16} />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={72}
                  inputMode="numeric"
                  autoFocus
                  className="input h-11 rounded-[var(--radius-sm)] text-center text-base font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={slaDraft}
                  onChange={(e) => { setSlaDraft(e.target.value); setSlaError(''); }}
                  aria-label="SLA hours"
                  aria-invalid={!slaDraftValid}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--body)]">
                  Hours
                </span>
              </div>

              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--card)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => adjustSlaDraft(1)}
                disabled={Number.isFinite(slaDraftValue) && slaDraftValue >= 72}
                aria-label="Increase SLA hours"
              >
                <Plus size={16} />
              </button>
            </div>
            {slaError && <p className="mt-2 text-xs font-medium text-red-300">{slaError}</p>}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] px-3.5 py-3">
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--body)]" />
            <p className="text-xs leading-5 text-[var(--body)]">
              Tickets exceeding the configured SLA will automatically be flagged as overdue and highlighted in the ticket list.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <button type="button" className="btn-ghost text-sm h-10" onClick={() => setSlaModalOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn-primary text-sm h-10 disabled:opacity-50 disabled:pointer-events-none"
              onClick={saveSla}
              disabled={!slaDraftValid}
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}

      {newTicketOpen && (() => {
        const fieldLabel = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)]';
        const suggestion = suggestCategory(`${newTicketForm.subject} ${newTicketForm.description}`);
        const showSuggestion = suggestion && suggestion !== newTicketForm.category && (newTicketForm.subject || newTicketForm.description);
        const descLength = newTicketForm.description.length;

        return (
          <Modal
            title="Create New Ticket"
            subtitle="Create a support ticket to track and resolve customer issues."
            icon={TicketIcon}
            widthClassName="max-w-[660px]"
            onClose={closeNewTicketModal}
            onKeyDownCapture={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !creatingTicket) {
                e.preventDefault();
                createTicket();
              }
            }}
          >
            <div className="space-y-6">
              <section className="space-y-4">
                <div className={fieldLabel}>
                  <FileText size={12} />
                  Ticket Information
                </div>

                <div>
                  <label className={fieldLabel}>
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    className={`input mt-2 h-11 rounded-[var(--radius-sm)] text-sm ${newTicketErrors.subject ? '!border-red-500/60' : ''}`}
                    value={newTicketForm.subject}
                    onChange={(e) => updateNewTicketField('subject', e.target.value)}
                    placeholder="e.g. Caller reported a dropped call"
                    aria-invalid={Boolean(newTicketErrors.subject)}
                  />
                  {newTicketErrors.subject && <p className="mt-1.5 text-xs font-medium text-red-300">{newTicketErrors.subject}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className={fieldLabel}>
                      Description <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-[var(--body)]">{descLength}/1000</span>
                  </div>
                  <textarea
                    className={`input mt-2 rounded-[var(--radius-sm)] text-sm min-h-[112px] resize-y ${newTicketErrors.description ? '!border-red-500/60' : ''}`}
                    value={newTicketForm.description}
                    onChange={(e) => updateNewTicketField('description', e.target.value)}
                    placeholder="Describe the issue, expected behavior, and any relevant details."
                    maxLength={1000}
                    aria-invalid={Boolean(newTicketErrors.description)}
                  />
                  {newTicketErrors.description && <p className="mt-1.5 text-xs font-medium text-red-300">{newTicketErrors.description}</p>}

                  <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--body)] transition-colors duration-200 hover:text-[var(--foreground)]">
                    <Paperclip size={13} />
                    {newTicketAttachment ? newTicketAttachment.name : 'Attach a file'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setNewTicketAttachment(e.target.files?.[0] || null)}
                    />
                    {newTicketAttachment && (
                      <button
                        type="button"
                        className="text-[var(--body)] hover:text-red-300"
                        onClick={(e) => { e.preventDefault(); setNewTicketAttachment(null); }}
                        aria-label="Remove attachment"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </label>
                </div>
              </section>

              <div className="border-t border-[var(--border)]" />

              <section className="space-y-3">
                <div className={fieldLabel}>Ticket Details</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>Category</label>
                    <FieldDropdown
                      value={newTicketForm.category}
                      options={CATEGORY_OPTIONS}
                      onChange={(v) => updateNewTicketField('category', v)}
                      renderValue={(v) => {
                        const meta = CATEGORY_META[v];
                        const Icon = meta.icon;
                        return (
                          <span className="inline-flex items-center gap-2">
                            <Icon size={14} className={meta.color} />
                            {v}
                          </span>
                        );
                      }}
                      renderOption={(v) => {
                        const meta = CATEGORY_META[v];
                        const Icon = meta.icon;
                        return (
                          <span className="inline-flex items-center gap-2">
                            <Icon size={14} className={meta.color} />
                            {v}
                          </span>
                        );
                      }}
                    />
                    {showSuggestion && (
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(4,107,210,0.3)] bg-[var(--glow)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary)] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
                        onClick={() => updateNewTicketField('category', suggestion)}
                      >
                        <Sparkles size={11} />
                        AI suggests {suggestion} — apply
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={fieldLabel}>Priority</label>
                    <FieldDropdown
                      value={newTicketForm.priority}
                      options={NEW_TICKET_PRIORITIES}
                      onChange={(v) => updateNewTicketField('priority', v)}
                      renderValue={(v) => (
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[v].dot}`} />
                          {PRIORITY_META[v].label}
                        </span>
                      )}
                      renderOption={(v) => (
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[v].dot}`} />
                          {PRIORITY_META[v].label}
                        </span>
                      )}
                    />
                    <p className="mt-2 text-[11px] text-[var(--body)]">
                      Estimated response: {RESPONSE_TIME[newTicketForm.priority]}
                    </p>
                  </div>
                </div>
              </section>

              <div className="border-t border-[var(--border)]" />

              <section>
                <div className={fieldLabel}>Customer Information</div>
                <div className="mt-3 space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-4">
                  <div>
                    <label className={fieldLabel}>Caller Name</label>
                    <div className="relative mt-2">
                      <User size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
                      <input
                        className="input h-11 rounded-[var(--radius-sm)] pl-10 text-sm"
                        value={newTicketForm.callerName}
                        onChange={(e) => updateNewTicketField('callerName', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel}>Caller Phone</label>
                      <div className="relative mt-2">
                        <Phone size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
                        <input
                          className="input h-11 rounded-[var(--radius-sm)] pl-10 text-sm"
                          value={newTicketForm.callerPhone}
                          onChange={(e) => updateNewTicketField('callerPhone', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={fieldLabel}>Email</label>
                      <div className="relative mt-2">
                        <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
                        <input
                          className={`input h-11 rounded-[var(--radius-sm)] pl-10 text-sm ${newTicketErrors.callerEmail ? '!border-red-500/60' : ''}`}
                          value={newTicketForm.callerEmail}
                          onChange={(e) => updateNewTicketField('callerEmail', e.target.value)}
                          placeholder="Optional"
                          aria-invalid={Boolean(newTicketErrors.callerEmail)}
                        />
                      </div>
                      {newTicketErrors.callerEmail && <p className="mt-1.5 text-xs font-medium text-red-300">{newTicketErrors.callerEmail}</p>}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <button type="button" className="btn-ghost text-sm h-10" onClick={closeNewTicketModal} disabled={creatingTicket}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm h-10 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                onClick={createTicket}
                disabled={!newTicketRequiredMet || creatingTicket}
              >
                {creatingTicket && <Loader2 size={14} className="animate-spin" />}
                {creatingTicket ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </Modal>
        );
      })()}

      {selectedTicket && (
        <TicketDrawer
          key={selectedTicket.id}
          ticket={selectedTicket}
          slaHours={slaHours}
          previousTicketsCount={previousTicketsCount}
          onClose={closeTicketDrawer}
          onUpdateStatus={updateTicketStatus}
          onUpdatePriority={updateTicketPriority}
          onAssign={assignTicket}
          onResolve={resolveTicket}
          onSaveDetails={saveTicketDetails}
          onAddNote={addTicketNote}
          onDelete={deleteTicket}
        />
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
