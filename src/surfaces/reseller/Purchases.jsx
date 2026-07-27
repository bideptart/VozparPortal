import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US');
};

const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

// Shown only when the real purchase list comes back genuinely empty — same
// "never overrides real data" rule as the admin surface's demo fallbacks.
const DEMO_PURCHASES = [
  { id: 'demo-1', createdAt: hoursAgo(3),   customer: { company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example' }, kind: 'new-number-plan', description: 'Growth plan + new DID', amount: 93,  status: 'succeeded' },
  { id: 'demo-2', createdAt: hoursAgo(30),  customer: { company: 'Bluepeak Studio',   name: 'Owen Clarke', email: 'owen@bluepeak.example' },   kind: 'topup',           description: 'Wallet top-up',         amount: 50,  status: 'succeeded' },
  { id: 'demo-3', createdAt: hoursAgo(75),  customer: { company: 'Larkspur Dental',   name: 'Maria Gomez', email: 'maria@larkspur.example' },  kind: 'plan-change',     description: 'Upgraded Starter → Scale', amount: 285, status: 'succeeded' },
  { id: 'demo-4', createdAt: hoursAgo(140), customer: { company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example' },   kind: 'plan-restart',    description: 'Plan restart after pause', amount: 0,   status: 'pending' },
  { id: 'demo-5', createdAt: hoursAgo(200), customer: { company: 'Larkspur Dental',   name: 'Maria Gomez', email: 'maria@larkspur.example' },  kind: 'signup',          description: 'New signup via portal', amount: 0,   status: 'succeeded' },
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
const symbolFor = (cur) => (cur === 'USD' ? '$' : cur === 'USD' ? '$' : `${cur || '$'} `);

const fmtMoney = (n, cur) => {
  const sym = symbolFor(cur);
  return cur === 'USD'
    ? `${sym}${Number(n || 0).toLocaleString('en-US')}`
    : `${sym}${Number(n || 0).toFixed(2)}`;
};

// Human label for each wallet-transaction kind. The DB stores compact
// machine-readable kinds; this maps them to UI badges.
const KIND_META = {
  'new-number-plan':   { label: 'New plan + DID',   pill: 'bg-primary/10 text-primary' },
  'plan-change':       { label: 'Plan change',      pill: 'bg-primary/10 text-primary' },
  'plan-restart':      { label: 'Plan restart',     pill: 'bg-amber-100 text-amber-700' },
  'topup':             { label: 'Wallet top-up',    pill: 'bg-emerald-100 text-emerald-700' },
  'save-card':         { label: 'Card saved',       pill: 'bg-purple-100 text-purple-700' },
  'signup':            { label: 'Signup',           pill: 'bg-fuchsia-100 text-fuchsia-700' },
};
const kindMeta = (k) => KIND_META[k] || { label: k, pill: 'bg-slate-200 text-slate-700' };

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
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  // The reseller's storefront currency drives display of amounts (USD vs $).
  const currency = currentUser?.displayCurrency || 'USD';

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/reseller/purchases');
      setList(r.purchases || []);
      setTotals(r.totals || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    }
  };
  useEffect(() => { load(); }, []);

  // Falls back to demo purchases only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_PURCHASES);
  const effectiveTotals = list !== null && list.length === 0 && totals.length === 0 ? DEMO_TOTALS : totals;

  const filtered = useMemo(() => {
    if (!effectiveList) return [];
    const q = search.trim().toLowerCase();
    return effectiveList.filter((p) => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        (p.customer.email   || '').toLowerCase().includes(q) ||
        (p.customer.company || '').toLowerCase().includes(q) ||
        (p.customer.name    || '').toLowerCase().includes(q) ||
        (p.description      || '').toLowerCase().includes(q)
      );
    });
  }, [effectiveList, search, kindFilter]);

  // Roll-up of grand totals from the server-side aggregation.
  const sumAll  = effectiveTotals.reduce((a, t) => a + (t.sum || 0), 0);
  const countAll = effectiveTotals.reduce((a, t) => a + (t.count || 0), 0);
  const newPlanRow = effectiveTotals.find((t) => t.kind === 'new-number-plan');
  const topupRow   = effectiveTotals.find((t) => t.kind === 'topup');

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">💳 Plan purchases</h1>
          <p className="text-mute text-sm mt-1">
            Every plan buy, change, restart, and wallet top-up made by a customer
            in your portal.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>
        <button className="btn-ghost text-sm" onClick={load}>↻ Refresh</button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}

      {/* KPI strip */}
      <div className="mt-6 grid sm:grid-cols-4 gap-3">
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total transactions</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{effectiveList === null ? '—' : countAll}</div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total volume</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{fmtMoney(sumAll, currency)}</div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">New plans bought</div>
          <div className="mt-1 text-2xl font-bold text-primary">{newPlanRow?.count || 0}</div>
          <div className="text-xs text-mute mt-0.5">{fmtMoney(newPlanRow?.sum || 0, currency)}</div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Wallet top-ups</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{topupRow?.count || 0}</div>
          <div className="text-xs text-mute mt-0.5">{fmtMoney(topupRow?.sum || 0, currency)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <input
            type="search"
            className="input pl-9 text-sm"
            placeholder="Filter by customer email, name, or note"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none">🔍</span>
        </div>
        <select
          className="input text-sm py-1.5 max-w-[200px]"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
        >
          <option value="all">All transaction kinds</option>
          {effectiveTotals.map((t) => (
            <option key={t.kind} value={t.kind}>{kindMeta(t.kind).label} ({t.count})</option>
          ))}
        </select>
      </div>

      {/* Transactions table */}
      <div className="mt-4 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Action</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {effectiveList === null && (
              <tr><td colSpan={6} className="text-center text-mute py-6">Loading…</td></tr>
            )}
            {effectiveList && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-mute py-6">
                {effectiveList.length === 0
                  ? 'No purchases yet — they\'ll show up as soon as a customer signs up or upgrades.'
                  : 'No transactions match the current filter.'}
              </td></tr>
            )}
            {filtered.map((p) => {
              const meta = kindMeta(p.kind);
              const isCredit = p.amount > 0;
              return (
                <tr key={p.id}>
                  <td className="text-xs text-mute whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
                  <td>
                    <div className="text-sm font-medium">{p.customer.company || p.customer.name}</div>
                    <div className="text-xs text-mute">{p.customer.email}{p.customer.number ? ` · ${p.customer.number}` : ''}</div>
                  </td>
                  <td>
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${meta.pill}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="text-xs text-slate-700">{p.description || '—'}</td>
                  <td className={`text-right whitespace-nowrap font-semibold ${
                    isCredit ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {p.amount ? `${isCredit ? '+' : ''}${fmtMoney(p.amount, currency)}` : '—'}
                  </td>
                  <td>
                    <span className={`pill text-[10px] uppercase tracking-wider ${
                      p.status === 'succeeded' || p.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : p.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
