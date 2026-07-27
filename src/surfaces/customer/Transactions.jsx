import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Download,
  RefreshCw,
  Search,
  Wallet,
  Check,
  CircleDollarSign,
  ReceiptText,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../AppContext.jsx';
import DatePickerField from '../../components/ui/date-picker.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
const PRIMARY_HEX = '#046BD2';

const DUMMY_TXNS = [
  {
    id: 'tx_001',
    kind: 'plan purchase',
    description: 'Growth Plan - Monthly',
    amount: 29.00,
    status: 'paid',
    provider: 'Razorpay',
    ref: 'pay_Q7VOZPER9278',
    date: new Date(now - (9 * DAY_MS)).toISOString(),
  },
  {
    id: 'tx_002',
    kind: 'wallet top-up',
    description: 'Wallet top-up via Stripe',
    amount: 50.00,
    status: 'paid',
    provider: 'Stripe',
    ref: 'pi_3QVOZPER7281',
    date: new Date(now - (7 * DAY_MS)).toISOString(),
  },
  {
    id: 'tx_003',
    kind: 'usage charge',
    description: 'Voice minutes - 48 min @ $0.09/min',
    amount: 4.32,
    status: 'paid',
    provider: 'Wallet',
    ref: 'usage_048',
    date: new Date(now - (3 * DAY_MS)).toISOString(),
  },
];

const QUICK_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' },
];

const GRANULARITIES = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isoInput(date) {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function rangeForPreset(preset) {
  const today = new Date();
  if (preset === 'today') {
    return { from: isoInput(startOfDay(today)), to: isoInput(today) };
  }
  if (preset === 'yesterday') {
    const y = new Date(now - DAY_MS);
    return { from: isoInput(startOfDay(y)), to: isoInput(y) };
  }
  if (preset === 'last7') {
    const from = new Date(now - (6 * DAY_MS));
    return { from: isoInput(startOfDay(from)), to: isoInput(today) };
  }
  if (preset === 'thisMonth') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: isoInput(startOfDay(first)), to: isoInput(today) };
  }
  if (preset === 'lastMonth') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: isoInput(startOfDay(first)), to: isoInput(last) };
  }
  return { from: '', to: '' };
}

function slugifyCompany(company) {
  if (!company) return '';
  return `${String(company).toLowerCase().replace(/[^a-z0-9]+/g, '').trim() || 'portal'}.io`;
}

function transactionKindMeta(kind) {
  const key = String(kind || '').toLowerCase();
  if (key.includes('topup') || key.includes('top-up') || key.includes('wallet')) {
    return { label: 'Wallet Top-up', dot: 'bg-sky-400', className: 'border-sky-500/20 bg-sky-500/10 text-sky-300' };
  }
  if (key.includes('plan') || key.includes('purchase') || key.includes('renewal')) {
    return { label: 'Plan Purchase', dot: 'bg-violet-400', className: 'border-violet-500/20 bg-violet-500/10 text-violet-300' };
  }
  if (key.includes('overflow') || key.includes('usage') || key.includes('charge')) {
    return { label: 'Usage Charge', dot: 'bg-amber-400', className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' };
  }
  if (key.includes('refund') || key.includes('credit')) {
    return { label: 'Refund', dot: 'bg-emerald-400', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' };
  }
  return {
    label: kind ? kind.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Transaction',
    dot: 'bg-[var(--primary)]',
    className: 'border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[var(--foreground)]',
  };
}

function transactionStatusMeta(status) {
  const key = String(status || 'paid').toLowerCase();
  if (['completed', 'success', 'succeeded', 'paid'].includes(key)) {
    return { label: 'Completed', dot: 'bg-emerald-400', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' };
  }
  if (['pending', 'processing'].includes(key)) {
    return { label: 'Pending', dot: 'bg-amber-400', className: 'border-amber-500/20 bg-amber-500/10 text-amber-200' };
  }
  if (['failed', 'declined', 'canceled'].includes(key)) {
    return { label: 'Failed', dot: 'bg-red-400', className: 'border-red-500/20 bg-red-500/10 text-red-300' };
  }
  return {
    label: status ? status.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown',
    dot: 'bg-[var(--primary)]',
    className: 'border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[var(--foreground)]',
  };
}

function chartCategory(txn) {
  const key = String(txn?.kind || '').toLowerCase();
  if (key.includes('topup') || key.includes('top-up') || key.includes('wallet')) return 'Wallet Top-ups';
  if (key.includes('plan') || key.includes('purchase') || key.includes('renewal')) return 'Plan Purchases';
  if (key.includes('refund') || key.includes('credit')) return 'Refunds';
  return 'Add-ons';
}

function bucketDate(date, granularity) {
  const d = new Date(date);
  if (granularity === 'week') {
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = startOfDay(d);
    monday.setDate(d.getDate() + diffToMonday);
    return monday;
  }
  if (granularity === 'month') {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return startOfDay(d);
}

function bucketLabel(date, granularity) {
  if (granularity === 'week') {
    return `Wk of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function trendDirection(delta) {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function compareMetric(current, previous) {
  if (!current && !previous) {
    return { delta: 0, label: 'No change', direction: 'flat' };
  }
  if (!previous && current) {
    return { delta: 100, label: 'New activity', direction: 'up' };
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.abs(delta) >= 10 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  return {
    delta,
    direction: trendDirection(delta),
    label: `${rounded}% vs previous period`,
  };
}

function EmptyTransactionsState({ hasAnyTransactions, onResetRange }) {
  if (!hasAnyTransactions) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="text-2xl">📊</div>
        <div className="mt-3 text-base font-semibold text-[var(--foreground)]">No transactions yet</div>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--body)]">
          Your payments, wallet top-ups, and billing history will appear here.
        </p>
        <Link to="/dashboard/pricing" className="btn-primary text-sm mt-4">
          Add Plan / Number
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-2xl">📊</div>
      <div className="mt-3 text-base font-semibold text-[var(--foreground)]">No transactions in this range</div>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--body)]">
        Your payment history exists outside the current filters. Widen the date range to review the full activity.
      </p>
      <button type="button" onClick={onResetRange} className="btn-primary text-sm mt-4">
        View all time
      </button>
    </div>
  );
}

function MetricCard({ label, value, hint, prefix = '', suffix = '', decimals = 0, trend, icon: Icon }) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;
  const trendTone = trend?.direction === 'down'
    ? 'text-red-300 bg-red-500/10 border-red-500/20'
    : trend?.direction === 'flat'
      ? 'text-[var(--body)] bg-[var(--muted)] border-[var(--border)]'
      : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--muted)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">{label}</div>
        {Icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
            <Icon size={13} />
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-end gap-1 leading-none font-extrabold text-[var(--foreground)] text-2xl">
        {prefix ? <span className="text-base text-[var(--body)]">{prefix}</span> : null}
        <NumberFlow
          value={Number(value || 0)}
          format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
          willChange
        />
        {suffix ? <span className="pb-0.5 text-xs font-semibold text-[var(--body)]">{suffix}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {trend ? (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${trendTone}`}>
            {trend.direction === 'flat' ? <Activity size={11} /> : <TrendIcon size={11} />}
            {trend.label}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-[var(--body)]">{hint}</span> : null}
      </div>
    </div>
  );
}

function SpendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, total, count } = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3.5 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
      <div className="text-xs font-semibold text-[var(--foreground)]">{label}</div>
      <div className="mt-1.5 flex items-center justify-between gap-6 text-xs">
        <span className="text-[var(--body)]">Transactions</span>
        <span className="font-medium text-[var(--foreground)]">{count}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-6 text-xs">
        <span className="text-[var(--body)]">Total spent</span>
        <span className="font-semibold text-[var(--foreground)]">{money(total)}</span>
      </div>
    </div>
  );
}

function TransactionsTableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((row) => (
        <tr key={row} className="border-b border-[var(--border)] animate-pulse">
          <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-6 w-24 rounded-full bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-4 w-52 rounded bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-6 w-20 rounded-full bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-[var(--muted)]" /></td>
          <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-[var(--muted)]" /></td>
        </tr>
      ))}
    </>
  );
}

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected ? selected.label : placeholder;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? 'text-[var(--foreground)]' : 'text-[var(--body)]'}>
          {displayLabel}
        </span>
        <ChevronDown size={16} className={`text-[var(--body)] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-[var(--border)] bg-[var(--popover)] shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] py-1.5 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm transition-colors duration-150 ${
                  value === opt.value
                    ? 'bg-[var(--glow)] text-[var(--foreground)]'
                    : 'text-[var(--body)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value ? <Check size={15} className="text-[var(--primary)]" /> : null}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Transactions() {
  const { currentUser, demoMode } = useApp();
  const [preset, setPreset] = useState('today');
  const [dates, setDates] = useState(() => rangeForPreset('today'));
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState('day');

  const user = currentUser || (demoMode ? {
    company: 'Vozper Demo',
    resellerPortal: 'vozper.io',
  } : {});

  const portalLabel = (
    user?.resellerPortal
    || user?.viaPortal
    || slugifyCompany(user?.company)
    || 'vozper.io'
  ).toLowerCase();

  const kindOptions = useMemo(() => [...new Set(DUMMY_TXNS.map((txn) => txn.kind))], []);

  const kindDropdownOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All kinds' }];
    kindOptions.forEach((k) => {
      opts.push({ value: k, label: transactionKindMeta(k).label });
    });
    return opts;
  }, [kindOptions]);

  const filtered = useMemo(() => {
    const fromMs = dates.from ? startOfDay(new Date(dates.from)).getTime() : -Infinity;
    const toMs = dates.to ? endOfDay(new Date(dates.to)).getTime() : Infinity;

    return DUMMY_TXNS.filter((txn) => {
      const txnMs = new Date(txn.date).getTime();
      if (txnMs < fromMs || txnMs > toMs) return false;
      if (kind !== 'all' && txn.kind !== kind) return false;
      if (search) {
        const haystack = [txn.description, txn.ref, txn.provider].join(' ').toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [dates.from, dates.to, kind, search]);

  const totalPaid = filtered.reduce((sum, txn) => sum + (txn.amount > 0 ? txn.amount : 0), 0);
  const hasAnyTransactions = DUMMY_TXNS.length > 0;
  const hasFilteredResults = filtered.length > 0;
  const walletTopups = filtered
    .filter((txn) => chartCategory(txn) === 'Wallet Top-ups')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const previousWindow = useMemo(() => {
    if (!dates.from || !dates.to) return [];
    const currentStart = startOfDay(new Date(dates.from)).getTime();
    const currentEnd = endOfDay(new Date(dates.to)).getTime();
    const span = Math.max(DAY_MS, currentEnd - currentStart + 1);
    const previousEnd = currentStart - 1;
    const previousStart = previousEnd - span + 1;

    return DUMMY_TXNS.filter((txn) => {
      const txnMs = new Date(txn.date).getTime();
      if (txnMs < previousStart || txnMs > previousEnd) return false;
      if (kind !== 'all' && txn.kind !== kind) return false;
      if (search) {
        const haystack = [txn.description, txn.ref, txn.provider].join(' ').toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [dates.from, dates.to, kind, search]);

  const metricComparisons = useMemo(() => {
    const previousTotal = previousWindow.reduce((sum, txn) => sum + txn.amount, 0);
    const previousTopups = previousWindow
      .filter((txn) => chartCategory(txn) === 'Wallet Top-ups')
      .reduce((sum, txn) => sum + txn.amount, 0);
    return {
      total: compareMetric(totalPaid, previousTotal),
      count: compareMetric(filtered.length, previousWindow.length),
      wallet: compareMetric(walletTopups, previousTopups),
    };
  }, [filtered.length, previousWindow, totalPaid, walletTopups]);

  const barData = useMemo(() => {
    const grouped = new Map();
    filtered.forEach((txn) => {
      const bucket = bucketDate(txn.date, granularity);
      const key = bucket.getTime();
      if (!grouped.has(key)) {
        grouped.set(key, { key, label: bucketLabel(bucket, granularity), total: 0, count: 0 });
      }
      const entry = grouped.get(key);
      entry.total += txn.amount;
      entry.count += 1;
    });
    return [...grouped.values()].sort((a, b) => a.key - b.key);
  }, [filtered, granularity]);

  const exportCsv = () => {
    const rows = [
      ['when', 'kind', 'description', 'amount', 'status', 'provider', 'ref'],
      ...filtered.map((txn) => [
        formatDate(txn.date),
        txn.kind,
        txn.description,
        txn.amount.toFixed(2),
        txn.status,
        txn.provider,
        txn.ref,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (nextPreset) => {
    setPreset(nextPreset);
    setDates(rangeForPreset(nextPreset));
  };

  const handleRefresh = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 700);
  };

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-[var(--body)] max-w-2xl">
          Every payment from this account — plan purchases, plan changes, restarts, and wallet top-ups.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCsv} className={toolbarButton}>
            <Download size={14} />
            Export CSV
          </button>
          <button type="button" onClick={handleRefresh} className={toolbarButton} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Spend"
          value={totalPaid}
          prefix="$"
          decimals={2}
          hint={totalPaid > 0 ? undefined : 'No billing activity yet'}
          trend={metricComparisons.total}
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Transactions"
          value={filtered.length}
          hint={hasFilteredResults ? 'In current view' : 'No results in range'}
          trend={metricComparisons.count}
          icon={ReceiptText}
        />
        <MetricCard
          label="Wallet Top-ups"
          value={walletTopups}
          prefix="$"
          decimals={2}
          hint="Funding added to wallet"
          trend={metricComparisons.wallet}
          icon={Wallet}
        />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-200 ${
                preset === option.id
                  ? 'bg-[var(--glow)] border-[var(--primary)] text-[var(--foreground)]'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--body)] hover:bg-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[var(--border)]" />

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">From date</label>
            <DatePickerField
              value={dates.from}
              onChange={(value) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, from: value }));
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">To date</label>
            <DatePickerField
              value={dates.to}
              onChange={(value) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, to: value }));
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">Transaction type</label>
            <CustomSelect
              value={kind}
              onChange={setKind}
              options={kindDropdownOptions}
              placeholder="Select type"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
              <input
                className="input pl-10"
                placeholder="description, ref, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Spending Overview</div>
            <p className="mt-1 text-xs text-[var(--body)]">Spend grouped by {GRANULARITIES.find((g) => g.id === granularity)?.label.toLowerCase()}, based on the filters above.</p>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
            {GRANULARITIES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGranularity(g.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                  granularity === g.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--body)] hover:text-[var(--foreground)]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {barData.length ? (
          <div className="mt-3 h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} key={`${granularity}-${preset}-${kind}-${search}-${dates.from}-${dates.to}`}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(203,213,225,0.78)', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(203,213,225,0.78)', fontSize: 12 }} tickFormatter={(value) => `$${value}`} width={48} />
                <Tooltip content={<SpendTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
                <Bar dataKey="total" fill={PRIMARY_HEX} radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 flex h-[110px] flex-col items-center justify-center gap-1 text-center">
            <div className="text-sm font-medium text-[var(--foreground)]">No spend data for this range</div>
            <p className="text-xs text-[var(--body)]">Adjust the filters above to see a chart.</p>
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Type</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Description</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Amount</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Provider</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Reference</th>
              </tr>
            </thead>

            <tbody>
              {loading ? <TransactionsTableSkeleton /> : hasFilteredResults ? filtered.map((txn) => {
                const kindMeta = transactionKindMeta(txn.kind);
                const statusMeta = transactionStatusMeta(txn.status);
                return (
                  <tr
                    key={txn.id}
                    className="border-b border-[var(--border)] transition-colors duration-200 hover:bg-[var(--muted)]"
                  >
                    <td className="px-6 py-2.5 text-[var(--foreground)] font-medium">{formatDate(txn.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${kindMeta.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${kindMeta.dot}`} />
                        {kindMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--body)]">{txn.description}</td>
                    <td className="px-4 py-2.5 text-[var(--foreground)] font-semibold">{money(txn.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${statusMeta.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--body)]">{txn.provider}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--body)]">{txn.ref}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-6">
                    <EmptyTransactionsState hasAnyTransactions={hasAnyTransactions} onResetRange={() => applyPreset('all')} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 text-right text-sm text-[var(--body)] border-t border-[var(--border)]">
          Showing {filtered.length} of {DUMMY_TXNS.length} transactions
        </div>
      </div>
    </div>
  );
}
