import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtCurrency = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

// Same fallback logic as Signups: prefer `user.numbers[]` (per-DID plan
// tiers) and fall back to the legacy primary fields for old rows.
const didsFor = (u) => {
  if (Array.isArray(u.numbers) && u.numbers.length) return u.numbers;
  if (u.number) {
    return [{
      id: `legacy-${u.id}`,
      value: u.number,
      isPrimary: true,
      planCycle: 'monthly',
      plan: u.plan
        ? { ...u.plan, id: u.plan.label?.toLowerCase() || 'unknown' }
        : null,
    }];
  }
  return [];
};

// Per-month recurring for a single DID. Yearly plans get divided by 12
// so the per-customer "/mo" total is apples-to-apples.
const monthlyFor = (did) => {
  const a = Number(did?.plan?.amount) || 0;
  return did?.planCycle === 'yearly' ? a / 12 : a;
};

export default function Payments() {
  const { currentUser } = useApp();
  const [stats, setStats] = useState(() => readCache('admin.payments.stats', currentUser?.id) ?? null);
  const [users, setUsers] = useState(() => readCache('admin.payments.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [s, u] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/users'),
      ]);
      const nextUsers = u.users.filter((x) => x.role === 'customer');
      setStats(s);
      setUsers(nextUsers);
      writeCache('admin.payments.stats', currentUser?.id, s);
      writeCache('admin.payments.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  // Locally re-derive MRR from the per-DID plan tiers so the table totals
  // match the per-customer rows below (the legacy /api/admin/stats `mrr`
  // value only counted users.plan_amount once per customer).
  const localMrr = useMemo(() => {
    if (!users) return null;
    let plans = 0, numbers = 0;
    for (const u of users) {
      const dids = didsFor(u);
      for (const d of dids) plans += monthlyFor(d);
      if (u.number) numbers += Number(u.numberPrice) || 0;
    }
    return { plans, numbers, total: plans + numbers };
  }, [users]);

  return (
    <div>
      {/* Icon + "Billing & minutes" title now live in the sticky top bar instead of here. */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold tracking-wide animate-fade-up" style={{ color: 'var(--ink-2)' }}>Recurring revenue across every plan a customer is on — one row per DID.</p>
        <button className="btn-teal text-sm transition duration-200 ease-out hover:scale-105 active:scale-95 flex items-center gap-2" onClick={load}>
          ↻ <span className="pill pill-primary">Refresh</span>
        </button>
      </div>

      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className="mt-6 grid sm:grid-cols-4 gap-4">
        <div className="form-card"><div className="text-sm text-mute">MRR (total)</div><div className="mt-1 text-2xl font-semibold text-lime-400">{localMrr ? fmtCurrency(localMrr.total) : '—'}</div></div>
        <div className="form-card"><div className="text-sm text-mute">From plans</div><div className="mt-1 text-2xl font-semibold">{localMrr ? fmtCurrency(localMrr.plans) : '—'}</div></div>
        <div className="form-card"><div className="text-sm text-mute">From number rentals</div><div className="mt-1 text-2xl font-semibold">{localMrr ? fmtCurrency(localMrr.numbers) : '—'}</div></div>
        <div className="form-card"><div className="text-sm text-mute">Active subscriptions</div><div className="mt-1 text-2xl font-semibold">{stats?.customers ?? '—'}</div></div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Per-customer recurring</h2>
      <div className="mt-3 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Number</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th className="text-right">/ mo</th>
            </tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={5} className="text-center text-mute py-6">Loading…</td></tr>}
            {users?.length === 0 && <tr><td colSpan={5} className="text-center text-mute py-6">No paying customers yet.</td></tr>}
            {(users || []).flatMap((u) => {
              const dids = didsFor(u);
              if (dids.length === 0) {
                return [(
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.company || u.name}</div>
                      <div className="text-xs text-mute">{u.email}</div>
                    </td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-right text-mute">—</td>
                  </tr>
                )];
              }
              const total = dids.reduce((a, d) => a + monthlyFor(d), 0);
              return dids.map((d, i) => (
                <tr key={`${u.id}-${d.id}`}>
                  {i === 0 ? (
                    <td rowSpan={dids.length + 1} className="align-top">
                      <div className="font-medium">{u.company || u.name}</div>
                      <div className="text-xs text-mute">{u.email}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-wider text-mute">{dids.length} plan{dids.length > 1 ? 's' : ''}</div>
                    </td>
                  ) : null}
                  <td className="font-mono text-sm">
                    {d.value}
                    {d.isPrimary && (
                      <span className="ml-2 pill bg-lime-500/15 text-lime-700 text-[10px] uppercase tracking-wider font-semibold">primary</span>
                    )}
                  </td>
                  <td>{d.plan ? `${fmtCurrency(d.plan.amount)} · ${d.plan.label}` : '—'}</td>
                  <td className="text-xs">
                    <span className={`pill text-[10px] uppercase tracking-wider ${
                      d.planCycle === 'yearly' ? 'bg-emerald-500/15 text-emerald-700 font-semibold' : 'bg-slate-500/15 text-slate-700 font-semibold'
                    }`}>
                      {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                  </td>
                  <td className="text-right text-lime-400">{fmtCurrency(monthlyFor(d))}</td>
                </tr>
              )).concat([(
                <tr key={`${u.id}-total`} className="bg-slate-500/5">
                  <td className="text-xs uppercase tracking-wider text-mute">Total</td>
                  <td />
                  <td />
                  <td className="text-right font-semibold text-lime-400">{fmtCurrency(total)}</td>
                </tr>
              )]);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
