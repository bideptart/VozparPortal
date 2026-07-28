import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import MiniCalendar from '../../components/MiniCalendar.jsx';

const PRIMARY_HEX = '#046BD2';

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US');
};

const fmtShortDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
};

// Shown only when the real purchase list comes back genuinely empty — same
// "never overrides real data" rule as the admin surface's demo fallbacks.
const DEMO_PURCHASES = [
  { id: 'demo-1', createdAt: hoursAgo(3),   customer: { company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example' }, kind: 'new-number-plan', description: 'Growth plan + new DID', amount: 93,  status: 'succeeded', did: '+1 415 555 0142', paymentMethod: 'Card •••• 4242', transactionId: 'txn_8f31a2c9', notes: '' },
  { id: 'demo-2', createdAt: hoursAgo(30),  customer: { company: 'Bluepeak Studio',   name: 'Owen Clarke', email: 'owen@bluepeak.example' },   kind: 'topup',           description: 'Wallet top-up',         amount: 50,  status: 'succeeded', did: null, paymentMethod: 'Card •••• 1187', transactionId: 'txn_2b7e9d41', notes: '' },
  { id: 'demo-3', createdAt: hoursAgo(75),  customer: { company: 'Larkspur Dental',   name: 'Maria Gomez', email: 'maria@larkspur.example' },  kind: 'plan-change',     description: 'Upgraded Starter → Scale', amount: 285, status: 'succeeded', did: '+1 646 555 0110', paymentMethod: 'Wallet balance', transactionId: 'txn_c4913fa0', notes: 'Requested by customer via support ticket' },
  { id: 'demo-4', createdAt: hoursAgo(140), customer: { company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example' },   kind: 'plan-restart',    description: 'Plan restart after pause', amount: 0,   status: 'pending',   did: null, paymentMethod: '—', transactionId: 'txn_71a0e6bd', notes: '' },
  { id: 'demo-5', createdAt: hoursAgo(200), customer: { company: 'Larkspur Dental',   name: 'Maria Gomez', email: 'maria@larkspur.example' },  kind: 'signup',          description: 'New signup via portal', amount: 0,   status: 'succeeded', did: null, paymentMethod: '—', transactionId: 'txn_0d5c8e12', notes: '' },
];
const DEMO_TOTALS = [
  { kind: 'new-number-plan', count: 1, sum: 93 },
  { kind: 'topup',           count: 1, sum: 50 },
  { kind: 'plan-change',     count: 1, sum: 285 },
  { kind: 'plan-restart',    count: 1, sum: 0 },
  { kind: 'signup',          count: 1, sum: 0 },
];

// Symbol for the reseller's storefront currency. Falls back to $ when the
// field isn't populated (legacy resellers).
const symbolFor = (cur) => (cur === 'USD' ? '$' : `${cur || '$'} `);
const fmtMoney = (n, cur) => {
  const sym = symbolFor(cur);
  return cur === 'USD'
    ? `${sym}${Number(n || 0).toLocaleString('en-US')}`
    : `${sym}${Number(n || 0).toFixed(2)}`;
};

// Human label + badge color for each wallet-transaction kind. The DB stores
// compact machine-readable kinds; this maps them to UI badges.
const KIND_META = {
  'new-number-plan': { label: 'New plan + DID', className: 'border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[var(--primary)]' },
  'plan-change':     { label: 'Plan change',    className: 'border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[var(--primary)]' },
  'plan-restart':    { label: 'Plan restart',   className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  topup:             { label: 'Wallet top-up',  className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  'save-card':       { label: 'Card saved',     className: 'border-purple-500/25 bg-purple-500/10 text-purple-300' },
  signup:            { label: 'Signup',         className: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300' },
};
const kindMeta = (k) => KIND_META[k] || { label: k, className: 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]' };

const STATUS_META = {
  succeeded: { label: 'Succeeded', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  success:   { label: 'Succeeded', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  pending:   { label: 'Pending',   className: 'border-amber-500/25 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  failed:    { label: 'Failed',    className: 'border-red-500/25 bg-red-500/10 text-red-300', dot: 'bg-red-400' },
};
const statusMeta = (s) => STATUS_META[s] || { label: s || '—', className: 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]', dot: 'bg-[var(--body)]' };

// Count + sum trend over the last 7 days vs the 7 days before that — used by
// every KPI card. Returns null (no prior data to compare against) instead of
// a misleading 0% when the prior window is empty.
function trendPct(list, { since = 7, getValue = () => 1, predicate = () => true } = {}) {
  const now = Date.now();
  const windowMs = since * 86400000;
  let cur = 0;
  let prev = 0;
  list.forEach((p) => {
    if (!predicate(p)) return;
    const age = now - new Date(p.createdAt).getTime();
    if (age <= windowMs) cur += getValue(p);
    else if (age <= windowMs * 2) prev += getValue(p);
  });
  if (prev === 0) return cur > 0 ? { pct: null, cur, prev } : { pct: 0, cur, prev };
  return { pct: Math.round(((cur - prev) / prev) * 100), cur, prev };
}

function TrendBadge({ trend }) {
  if (!trend || trend.pct === 0) return <div className="mt-2 text-[11px] text-[var(--body)]">No change vs last 7 days</div>;
  if (trend.pct === null) return <div className="mt-2 text-[11px] text-[var(--primary)]">New activity this week</div>;
  const up = trend.pct > 0;
  return (
    <div className={`mt-2 text-[11px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend.pct)}% vs last 7 days
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--muted)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">{label}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
          <Icon size={14} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold leading-none text-[var(--foreground)]">{value}</div>
      <TrendBadge trend={trend} />
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input h-10 w-auto min-w-[132px] flex items-center justify-between gap-2 rounded-[var(--radius-sm)] text-sm"
      >
        <span className={selected?.value ? 'text-[var(--foreground)]' : 'text-[var(--body)]'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`text-[var(--body)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors duration-150 ${
                  value === opt.value ? 'bg-[var(--glow)] text-[var(--foreground)]' : 'text-[var(--body)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const RANGE_PRESETS = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

// Compact "Jul 20 – Jul 28, 2026" button that opens a small popover with
// quick range chips plus two MiniCalendars for a custom range — the same
// building blocks DateRangePicker uses elsewhere, just packaged to take a
// single toolbar slot instead of a full filter panel.
function DateRangeButton({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState('from'); // which calendar tab is active inside the popover
  const btnRef = useRef(null);

  const label = !from && !to
    ? 'All time'
    : `${from ? fmtShortDate(from) : '…'} – ${to ? fmtShortDate(to) : '…'}`;

  const applyPreset = (preset) => {
    if (preset.days === null) { onChange({ from: '', to: '' }); return; }
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - (preset.days - 1));
    onChange({ from: ymd(fromDate), to: ymd(toDate) });
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="input h-10 w-auto flex items-center gap-2 rounded-[var(--radius-sm)] text-sm"
      >
        <Calendar size={14} className="text-[var(--body)]" />
        <span className="text-[var(--foreground)]">{label}</span>
        <ChevronDown size={14} className={`text-[var(--body)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--popover)] p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] animate-modal-in">
            <div className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-semibold text-[var(--body)] transition-colors duration-150 hover:border-[rgba(4,107,210,0.35)] hover:text-[var(--foreground)]"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
              <button
                type="button"
                onClick={() => setField('from')}
                className={`flex-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${field === 'from' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)]'}`}
              >
                From: {from ? fmtShortDate(from) : 'Any'}
              </button>
              <button
                type="button"
                onClick={() => setField('to')}
                className={`flex-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${field === 'to' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)]'}`}
              >
                To: {to ? fmtShortDate(to) : 'Any'}
              </button>
            </div>

            <div className="mt-2">
              <MiniCalendar
                value={field === 'from' ? from : to}
                min={field === 'to' ? (from || undefined) : undefined}
                max={field === 'from' ? (to || undefined) : undefined}
                onSelect={(d) => {
                  if (field === 'from') onChange({ from: d, to });
                  else onChange({ from, to: d });
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  const options = [
    { id: 'csv', label: 'Export as CSV', Icon: FileText },
    { id: 'excel', label: 'Export as Excel', Icon: FileSpreadsheet },
    { id: 'pdf', label: 'Export as PDF', Icon: Download },
  ];
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white"
      >
        <Download size={14} /> Export <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
            {options.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setOpen(false); onExport(id); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)]"
              >
                <Icon size={13} className="text-[var(--body)]" /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ purchase, onViewDetails, onCopyId }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const MENU_HEIGHT = 2 * 32 + 8;

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT && rect.top > MENU_HEIGHT;
      setPos(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      );
    }
    setOpen((v) => !v);
  };

  // Portaled + fixed-position so the menu can't be clipped by the table's
  // horizontally-scrolling wrapper. Closes on scroll to avoid a stale
  // position lingering on screen.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const items = [
    { label: 'View Details', Icon: Eye, onClick: () => onViewDetails(purchase) },
    { label: 'Copy Transaction ID', Icon: Copy, onClick: () => onCopyId(purchase) },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        aria-label="Row actions"
      >
        <MoreVertical size={15} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]" style={pos}>
            {items.map(({ label, Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setOpen(false); onClick(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--muted)]"
              >
                <Icon size={13} className="text-[var(--body)]" /> {label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function DetailDrawer({ purchase, currency, onClose }) {
  if (typeof document === 'undefined' || !purchase) return null;
  const meta = kindMeta(purchase.kind);
  const status = statusMeta(purchase.status);
  const isCredit = purchase.amount > 0;

  const row = (label, value) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-[var(--body)]">{label}</span>
      <span className="text-sm font-medium text-[var(--foreground)] text-right break-all">{value}</span>
    </div>
  );

  const content = (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-in" />
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl animate-drawer-in"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-drawer-title"
      >
        <div className="shrink-0 border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>
              <h2 id="purchase-drawer-title" className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                {purchase.amount ? `${isCredit ? '+' : ''}${fmtMoney(purchase.amount, currency)}` : '—'}
              </h2>
              <span className={`mt-1 inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${status.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Transaction Details</div>
          <div className="mt-1 divide-y divide-[var(--border)]">
            {row('Customer', purchase.customer.company || purchase.customer.name)}
            {row('Email', purchase.customer.email || '—')}
            {row('Plan Purchased', purchase.description || '—')}
            {row('DID Purchased', purchase.did || '—')}
            {row('Payment Method', purchase.paymentMethod || '—')}
            {row('Transaction ID', purchase.transactionId || purchase.id)}
            {row('Timestamp', fmtDateTime(purchase.createdAt))}
          </div>

          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Notes</div>
          <p className="mt-2 text-sm text-[var(--body)]">{purchase.notes || 'No notes for this transaction.'}</p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, amount } = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
      <div className="text-xs font-semibold text-[var(--foreground)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--body)]">${amount.toLocaleString('en-US')}</div>
    </div>
  );
}

function InsightsPanel({ list, totals, currency }) {
  const revenueData = useMemo(() => {
    const days = 14;
    const buckets = new Map();
    const today = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(ymd(d), { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amount: 0 });
    }
    list.forEach((p) => {
      const key = ymd(new Date(p.createdAt));
      if (buckets.has(key)) buckets.get(key).amount += Number(p.amount || 0);
    });
    return [...buckets.values()];
  }, [list]);

  const topActions = useMemo(() => [...totals].sort((a, b) => b.count - a.count).slice(0, 5), [totals]);

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Revenue Trend</div>
        <p className="mt-1 text-xs text-[var(--body)]">Last 14 days</p>
        <div className="mt-3 h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(203,213,225,0.6)', fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.2)' }} />
              <Line type="monotone" dataKey="amount" stroke={PRIMARY_HEX} strokeWidth={2} dot={false} isAnimationActive animationDuration={500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Top Actions</div>
        <div className="mt-3 space-y-2">
          {topActions.length === 0 && <div className="text-xs text-[var(--body)]">No activity yet.</div>}
          {topActions.map((t) => {
            const meta = kindMeta(t.kind);
            return (
              <div key={t.kind} className="flex items-center justify-between text-xs">
                <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-medium ${meta.className}`}>{meta.label}</span>
                <span className="font-semibold text-[var(--foreground)]">{t.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Reseller Purchases — every plan and wallet transaction made by a customer
// under this reseller. Includes new-plan buys, plan changes, restarts, and
// wallet top-ups. Sourced from /api/reseller/purchases (joined to users
// where reseller_id = me.id).
// =============================================================================
export default function Purchases() {
  const { currentUser } = useApp();
  const [list, setList]   = useState(null);
  const [totals, setTotals] = useState([]);
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [sortKey, setSortKey] = useState('when');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  // The reseller's storefront currency drives display of amounts (USD vs $).
  const currency = currentUser?.displayCurrency || 'USD';

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await api('/api/reseller/purchases');
      setList(r.purchases || []);
      setTotals(r.totals || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Falls back to demo purchases only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_PURCHASES);
  const effectiveTotals = list !== null && list.length === 0 && totals.length === 0 ? DEMO_TOTALS : totals;

  const customerOptions = useMemo(() => {
    const seen = new Map();
    (effectiveList || []).forEach((p) => {
      const key = p.customer.email || p.customer.company;
      if (key && !seen.has(key)) seen.set(key, p.customer.company || p.customer.name);
    });
    return [{ value: 'all', label: 'All Customers' }, ...[...seen.entries()].map(([value, label]) => ({ value, label }))];
  }, [effectiveList]);

  const dateFiltered = useMemo(() => {
    if (!effectiveList) return [];
    const fromDate = parseYmd(range.from);
    const toDate = parseYmd(range.to);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    return effectiveList.filter((p) => {
      const d = new Date(p.createdAt);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [effectiveList, range]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = dateFiltered.filter((p) => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (customerFilter !== 'all' && (p.customer.email || p.customer.company) !== customerFilter) return false;
      if (!q) return true;
      return (
        (p.customer.email   || '').toLowerCase().includes(q) ||
        (p.customer.company || '').toLowerCase().includes(q) ||
        (p.customer.name    || '').toLowerCase().includes(q) ||
        (p.description      || '').toLowerCase().includes(q)
      );
    });
    const sorted = [...rows].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'amount') return mul * (Number(a.amount || 0) - Number(b.amount || 0));
      return mul * (new Date(a.createdAt) - new Date(b.createdAt));
    });
    return sorted;
  }, [dateFiltered, search, kindFilter, statusFilter, customerFilter, sortKey, sortDir]);

  // Roll-up of grand totals from the server-side aggregation (unfiltered by
  // date — the trend badges always compare "last 7 days" to "the 7 before
  // that" against the full history, independent of the date-range picker).
  const sumAll  = effectiveTotals.reduce((a, t) => a + (t.sum || 0), 0);
  const countAll = effectiveTotals.reduce((a, t) => a + (t.count || 0), 0);
  const newPlanRow = effectiveTotals.find((t) => t.kind === 'new-number-plan');
  const topupRow   = effectiveTotals.find((t) => t.kind === 'topup');

  const countTrend  = useMemo(() => effectiveList ? trendPct(effectiveList) : null, [effectiveList]);
  const volumeTrend = useMemo(() => effectiveList ? trendPct(effectiveList, { getValue: (p) => Number(p.amount || 0) }) : null, [effectiveList]);
  const newPlanTrend = useMemo(() => effectiveList ? trendPct(effectiveList, { predicate: (p) => p.kind === 'new-number-plan' }) : null, [effectiveList]);
  const topupTrend   = useMemo(() => effectiveList ? trendPct(effectiveList, { predicate: (p) => p.kind === 'topup' }) : null, [effectiveList]);

  // Date-range totals for the insights panel + table — computed from the
  // date-filtered set (not the further search/kind/status-filtered rows) so
  // the revenue chart and top actions reflect "this range", not "this search".
  const rangeTotals = useMemo(() => {
    const map = new Map();
    dateFiltered.forEach((p) => {
      const cur = map.get(p.kind) || { kind: p.kind, count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += Number(p.amount || 0);
      map.set(p.kind, cur);
    });
    return [...map.values()];
  }, [dateFiltered]);

  const clearFilters = () => {
    setSearch('');
    setKindFilter('all');
    setStatusFilter('all');
    setCustomerFilter('all');
    setRange({ from: '', to: '' });
  };

  const toRows = (rows) => rows.map((p) => [
    fmtDateTime(p.createdAt), p.customer.company || p.customer.name, p.customer.email,
    kindMeta(p.kind).label, p.description || '', p.amount || 0, p.status, p.transactionId || p.id,
  ]);
  const HEADERS = ['When', 'Customer', 'Email', 'Action', 'Description', 'Amount', 'Status', 'Transaction ID'];

  const downloadBlob = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAs = (format) => {
    if (format === 'pdf') {
      // No PDF library in this project — the browser's own print dialog
      // ("Save as PDF") is a real, dependency-free way to produce one.
      window.print();
      return;
    }
    const rows = [HEADERS, ...toRows(filtered)];
    if (format === 'excel') {
      const table = `<table><thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
        rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')
      }</tbody></table>`;
      downloadBlob(table, 'application/vnd.ms-excel', 'purchases.xls');
      return;
    }
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', 'purchases.csv');
  };

  const copyTransactionId = async (p) => {
    const id = p.transactionId || p.id;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      // Clipboard API unavailable (older browser / no permission) — nothing
      // destructive to fall back to, so just skip silently.
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortHeader = (key, label, align = 'left') => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--body)] hover:text-[var(--foreground)] transition-colors duration-150 ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {label}
      <ArrowUpDown size={11} className={sortKey === key ? 'text-[var(--primary)]' : 'text-[var(--body)]'} />
    </button>
  );

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Plan purchases</h1>
          <p className="mt-1 text-sm text-[var(--body)]">
            Every plan buy, change, restart, and wallet top-up made by a customer in your portal.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeButton from={range.from} to={range.to} onChange={setRange} />
          <ExportMenu onExport={exportAs} />
          <button type="button" onClick={load} className={toolbarButton} disabled={loading} aria-label="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-[var(--radius)] px-3 py-2">
          {err}
        </div>
      )}

      {copiedId && (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-[var(--radius)] px-3 py-2">
          ✓ Copied transaction ID {copiedId}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Activity} label="Total Transactions" value={effectiveList === null ? '—' : countAll} trend={countTrend} />
        <KpiCard icon={CreditCard} label="Total Volume" value={effectiveList === null ? '—' : fmtMoney(sumAll, currency)} trend={volumeTrend} />
        <KpiCard icon={Sparkles} label="New Plans Bought" value={effectiveList === null ? '—' : (newPlanRow?.count || 0)} trend={newPlanTrend} />
        <KpiCard icon={Wallet} label="Wallet Top-ups" value={effectiveList === null ? '—' : (topupRow?.count || 0)} trend={topupTrend} />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input
              className="input h-10 rounded-[var(--radius-sm)] pl-10 text-sm"
              placeholder="Search customer, email, or note…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--body)] hover:text-[var(--foreground)]" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <CustomSelect
            value={kindFilter}
            onChange={setKindFilter}
            options={[{ value: 'all', label: 'All Types' }, ...effectiveTotals.map((t) => ({ value: t.kind, label: kindMeta(t.kind).label }))]}
            placeholder="Type"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: 'all', label: 'All Status' }, { value: 'succeeded', label: 'Succeeded' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]}
            placeholder="Status"
          />
          <CustomSelect value={customerFilter} onChange={setCustomerFilter} options={customerOptions} placeholder="Customer" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--card)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-6 py-3">{sortHeader('when', 'When')}</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Action</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Description</th>
                  <th className="text-right px-4 py-3">{sortHeader('amount', 'Amount', 'right')}</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {effectiveList === null && (
                  <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-[var(--body)]">Loading…</td></tr>
                )}
                {effectiveList !== null && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-14">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--body)]">
                          <CreditCard size={24} />
                        </div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">No Plan Purchases Found</div>
                        <p className="max-w-sm text-xs text-[var(--body)]">New customer purchases and wallet top-ups will appear here automatically.</p>
                        <button type="button" onClick={clearFilters} className="btn-primary text-sm mt-1">Clear Filters</button>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((p) => {
                  const meta = kindMeta(p.kind);
                  const status = statusMeta(p.status);
                  const isCredit = p.amount > 0;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border)] transition-colors duration-200 hover:bg-[var(--muted)] cursor-pointer"
                      onClick={() => setSelected(p)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--body)]">{fmtDateTime(p.createdAt)}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[var(--foreground)]">{p.customer.company || p.customer.name}</div>
                        <div className="text-xs text-[var(--body)]">{p.customer.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--body)]">{p.description || '—'}</td>
                      <td className={`px-4 py-4 text-right whitespace-nowrap font-semibold ${isCredit ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
                        {p.amount ? `${isCredit ? '+' : ''}${fmtMoney(p.amount, currency)}` : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${status.className}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <RowMenu purchase={p} onViewDetails={setSelected} onCopyId={copyTransactionId} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <InsightsPanel list={dateFiltered} totals={rangeTotals} currency={currency} />
        </div>
      </div>

      <DetailDrawer purchase={selected} currency={currency} onClose={() => setSelected(null)} />
    </div>
  );
}
