import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Same fallback logic as Signups/Payments: prefer `user.numbers[]` (per-DID
// plan tiers) and fall back to the legacy primary fields for old rows.
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

const monthlyFor = (did) => {
  const a = Number(did?.plan?.amount) || 0;
  return did?.planCycle === 'yearly' ? a / 12 : a;
};

// There's no dedicated "churn risk" backend signal yet, so risk is derived
// client-side from the same /api/admin/users payload every other admin page
// already loads — no new endpoint needed for a first cut of this screen.
const REASONS = {
  'no-number':            { label: 'Never activated',    severity: 'critical', hint: 'Signed up but no DID was ever provisioned.' },
  'provisioning-failed':  { label: 'Provisioning failed', severity: 'critical', hint: 'Has a number but no Twilio SID — provisioning likely errored.' },
  'over-limit':           { label: 'Over plan minutes',   severity: 'critical', hint: 'Used 100%+ of the plan’s included minutes.' },
  'near-limit':           { label: 'Near plan limit',     severity: 'warning',  hint: 'Used 80%+ of the plan’s included minutes.' },
  'dormant':              { label: 'Dormant',             severity: 'warning',  hint: 'Paying, provisioned, but zero minutes used in a week+.' },
};

function assessRisk(u) {
  const dids = didsFor(u);
  const totalMin = dids.reduce((a, d) => a + (Number(d.plan?.min) || 0), 0);
  const usedMin = Number(u.minutesUsed) || 0;
  const usagePct = totalMin > 0 ? (usedMin / totalMin) * 100 : 0;
  const daysSinceSignup = u.createdAt ? (Date.now() - new Date(u.createdAt).getTime()) / 86400000 : 0;
  const mrr = dids.reduce((a, d) => a + monthlyFor(d), 0);

  const reasons = [];
  if (dids.length === 0) reasons.push('no-number');
  if (u.number && !u.twilioSid) reasons.push('provisioning-failed');
  if (totalMin > 0 && usagePct >= 100) reasons.push('over-limit');
  else if (totalMin > 0 && usagePct >= 80) reasons.push('near-limit');
  if (dids.length > 0 && usedMin === 0 && daysSinceSignup >= 7) reasons.push('dormant');

  const score = reasons.reduce((a, r) => a + (REASONS[r].severity === 'critical' ? 2 : 1), 0);
  return { dids, totalMin, usedMin, usagePct, mrr, reasons, score };
}

function ReasonPill({ id }) {
  const r = REASONS[id];
  if (!r) return null;
  const cls = r.severity === 'critical'
    ? 'bg-red-500/15 text-red-700'
    : 'bg-amber-500/15 text-amber-700';
  return (
    <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${cls}`} title={r.hint}>
      {r.label}
    </span>
  );
}

function UsageBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500';
  return (
    <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function CustomersAtRisk() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.customersRisk.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all'); // all | critical | warning

  const load = async () => {
    setErr('');
    try {
      const u = await api('/api/admin/users');
      const next = u.users.filter((x) => x.role === 'customer');
      setUsers(next);
      writeCache('admin.customersRisk.users', currentUser?.id, next);
    } catch (e) {
      setErr(e.message);
      setUsers([]);
    }
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!users) return null;
    return users
      .map((u) => ({ user: u, risk: assessRisk(u) }))
      .filter((r) => r.risk.reasons.length > 0)
      .sort((a, b) => b.risk.score - a.risk.score || b.risk.mrr - a.risk.mrr);
  }, [users]);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    if (filter === 'all') return rows;
    return rows.filter((r) => r.risk.reasons.some((id) => REASONS[id].severity === filter));
  }, [rows, filter]);

  const criticalCount = rows?.filter((r) => r.risk.reasons.some((id) => REASONS[id].severity === 'critical')).length ?? 0;
  const warningCount = rows?.filter((r) => r.risk.reasons.every((id) => REASONS[id].severity !== 'critical')).length ?? 0;
  const mrrAtRisk = rows?.reduce((a, r) => a + r.risk.mrr, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-mute">Signals for churn, overage, and failed provisioning — computed live from every customer's plan and usage.</p>
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh risk assessment">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {err && <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className="mt-6 grid sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`form-card text-left transition ${filter === 'all' ? 'ring-2 ring-[var(--primary)]' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Total at risk</div>
          <div className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{rows?.length ?? '—'}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter('critical')}
          className={`form-card text-left transition ${filter === 'critical' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Critical</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{criticalCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter('warning')}
          className={`form-card text-left transition ${filter === 'warning' ? 'ring-2 ring-amber-500' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Warning</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{warningCount}</div>
        </button>
        <div className="form-card">
          <div className="text-xs text-mute uppercase">MRR at risk</div>
          <div className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{fmtUSD(mrrAtRisk)}</div>
        </div>
      </div>

      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Risk signals</th>
              <th>Usage</th>
              <th>Plan</th>
              <th className="text-right">MRR</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows === null && <tr><td colSpan={6} className="text-center text-mute py-6">Loading…</td></tr>}
            {filteredRows?.length === 0 && (
              <tr><td colSpan={6} className="text-center text-mute py-10">
                {rows?.length === 0
                  ? '✓ No customers currently flagged — everyone is provisioned, within their plan, and active.'
                  : 'No customers match this filter.'}
              </td></tr>
            )}
            {(filteredRows || []).map(({ user: u, risk }) => (
              <tr key={u.id}>
                <td>
                  <div className="font-medium">{u.company || u.name}</div>
                  <div className="text-xs text-mute">{u.email}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {risk.reasons.map((id) => <ReasonPill key={id} id={id} />)}
                  </div>
                </td>
                <td>
                  {risk.totalMin > 0 ? (
                    <div className="flex items-center gap-2">
                      <UsageBar pct={risk.usagePct} />
                      <span className="text-xs text-mute whitespace-nowrap">
                        {risk.usedMin.toFixed(1)} / {risk.totalMin} min
                      </span>
                    </div>
                  ) : (
                    <span className="text-mute text-xs italic">no plan minutes</span>
                  )}
                </td>
                <td className="text-sm">
                  {risk.dids.length > 0
                    ? risk.dids.map((d) => d.plan?.label).filter(Boolean).join(', ') || '—'
                    : <span className="text-mute italic">none</span>}
                </td>
                <td className="text-right font-semibold" style={{ color: 'var(--accent)' }}>{fmtUSD(risk.mrr)}</td>
                <td className="text-xs text-mute">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
