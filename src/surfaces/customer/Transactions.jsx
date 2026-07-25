import { useMemo, useState } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

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

function SummaryCard({ label, value, hint, accent = false }) {
  return (
    <div className={`form-card min-h-[124px] rounded-[18px] border border-[var(--border)] ${accent ? 'gradient-border' : ''}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold mb-3">{label}</div>
      <div className={`leading-none font-extrabold ${accent ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'} text-[40px]`}>
        {value}
      </div>
      {hint ? <div className="mt-3 text-sm text-[var(--body)]">{hint}</div> : null}
    </div>
  );
}

export default function Transactions() {
  const { currentUser, demoMode } = useApp();
  const [preset, setPreset] = useState('today');
  const [dates, setDates] = useState(() => rangeForPreset('today'));
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [error] = useState('');

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
  const providerLabel = filtered.find((txn) => txn.provider)?.provider || 'Razorpay';
  const hasAnyTransactions = DUMMY_TXNS.length > 0;
  const hasFilteredResults = filtered.length > 0;

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

  const resetFilters = () => {
    setSearch('');
    setKind('all');
    applyPreset('today');
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-[15px] font-medium text-[var(--body)] max-w-3xl">
            Every payment from this account - plan purchases, plan changes, restarts, and wallet top-ups.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="btn-ghost text-sm inline-flex items-center gap-2"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="btn-ghost text-sm inline-flex items-center gap-2"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Request failed: {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Transactions" value={filtered.length} />
        <SummaryCard label="Total Paid" value={totalPaid > 0 ? money(totalPaid) : '—'} hint={`via ${providerLabel}`} />
        <SummaryCard label="Portal" value={portalLabel} accent />
      </div>

      <div className="form-card rounded-[18px] border border-[var(--border)] space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                preset === option.id
                  ? 'bg-[var(--glow)] border-[var(--primary)] text-[var(--foreground)]'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--body)] hover:bg-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1.5">From date</label>
            <input
              type="date"
              className="input"
              value={dates.from}
              onChange={(e) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, from: e.target.value }));
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1.5">To date</label>
            <input
              type="date"
              className="input"
              value={dates.to}
              onChange={(e) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, to: e.target.value }));
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1.5">Kind</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All kinds ({kindOptions.length})</option>
              {kindOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1.5">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
              <input
                className="input pl-10"
                placeholder="description, ref, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-card rounded-[18px] border border-[var(--border)] overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[rgba(255,255,255,0.03)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">When</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Kind</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Description</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Amount</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Status</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Provider</th>
                <th className="text-left px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Ref</th>
              </tr>
            </thead>

            <tbody>
              {hasFilteredResults ? filtered.map((txn) => (
                <tr key={txn.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="px-6 py-4 text-[var(--foreground)] font-medium">{formatDate(txn.date)}</td>
                  <td className="px-4 py-4 text-[var(--body)] capitalize">{txn.kind}</td>
                  <td className="px-4 py-4 text-[var(--body)]">{txn.description}</td>
                  <td className="px-4 py-4 text-[var(--foreground)] font-semibold">{money(txn.amount)}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]">
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[var(--body)]">{txn.provider}</td>
                  <td className="px-4 py-4 font-mono text-xs text-[var(--body)]">{txn.ref}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center text-center min-h-[280px]">
                      <div className="w-20 h-20 rounded-full bg-[var(--glow)] text-[var(--primary)] flex items-center justify-center mb-5 border border-[var(--primary)]">
                        <Wallet size={34} />
                      </div>
                      <div className="text-2xl font-semibold text-[var(--foreground)]">
                        {hasAnyTransactions ? 'No transactions in this date range' : 'No Transactions Yet'}
                      </div>
                      <div className="text-sm text-[var(--body)] mt-2 max-w-md">
                        {hasAnyTransactions
                          ? `You have ${DUMMY_TXNS.length} transaction${DUMMY_TXNS.length === 1 ? '' : 's'} outside this range.`
                          : 'Your payments, wallet top-ups, plan purchases, and renewals will appear here once you start using Vozper.'}
                      </div>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        {hasAnyTransactions ? (
                          <button type="button" onClick={() => applyPreset('all')} className="btn-primary text-sm">
                            View all time
                          </button>
                        ) : (
                          <>
                            <button type="button" className="btn-primary text-sm">+ Add Funds</button>
                            <button type="button" className="btn-ghost text-sm">Browse Plans</button>
                          </>
                        )}
                      </div>
                      {!hasAnyTransactions ? (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--body)]">
                          <span>View Pricing</span>
                          <span className="text-[var(--border)]">•</span>
                          <span>Learn about Billing</span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 text-right text-sm text-[var(--body)] border-t border-[var(--border)]">
          Showing {filtered.length} of {DUMMY_TXNS.length} transactions
        </div>
      </div>
    </div>
  );
}
