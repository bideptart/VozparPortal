import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
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
      plan: u.plan ? { ...u.plan, id: u.plan.label?.toLowerCase() || 'unknown' } : null,
    }];
  }
  return [];
};

const monthlyFor = (did) => {
  const a = Number(did?.plan?.amount) || 0;
  return did?.planCycle === 'yearly' ? a / 12 : a;
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks. Deliberately spans every risk reason so the redesigned page
// has something of each severity to show.
const DEMO_USERS = [
  // Over limit (critical) — used more than the plan includes.
  { id: 'demo-1', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(20), minutesUsed: 612,
    number: '+1 312 555 0177', twilioSid: 'CA4d5e6f7g8h9i0j1k2l3m',
    numbers: [{ id: 'd1', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  // Never activated (critical) — signed up, no DID at all.
  { id: 'demo-2', company: 'Cobalt Freight', name: 'Alex Kim', email: 'alex@cobalt.example', createdAt: daysAgo(15), minutesUsed: 0, numbers: [] },
  // Provisioning failed (critical) — has a number but no Twilio SID.
  { id: 'demo-3', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: daysAgo(10), minutesUsed: 0,
    number: '+1 512 555 0184', twilioSid: null,
    numbers: [{ id: 'd3', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  // Near plan limit (warning).
  { id: 'demo-4', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(18), minutesUsed: 88,
    number: '+1 212 555 0198', twilioSid: 'CA2b3c4d5e6f7g8h9i0j1k',
    numbers: [{ id: 'd4', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  // Dormant (warning) — provisioned, paying, zero usage in a week+.
  { id: 'demo-5', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: daysAgo(25), minutesUsed: 0,
    number: '+1 720 555 0129', twilioSid: 'CA6f7g8h9i0j1k2l3m4n5o',
    numbers: [{ id: 'd5', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199, min: 1200 } }] },
  // Healthy — no risk reasons, excluded from the flagged list automatically.
  { id: 'demo-6', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13), minutesUsed: 210,
    number: '+1 415 555 0142', twilioSid: 'CA1a2b3c4d5e6f7g8h9i0j',
    numbers: [{ id: 'd6', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
];

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

  const severity = reasons.some((r) => REASONS[r].severity === 'critical') ? 'critical' : (reasons.length ? 'warning' : null);
  const score = reasons.reduce((a, r) => a + (REASONS[r].severity === 'critical' ? 2 : 1), 0);
  return { dids, totalMin, usedMin, usagePct, mrr, reasons, severity, score };
}

function ReasonPill({ id }) {
  const r = REASONS[id];
  if (!r) return null;
  const cls = r.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400';
  const dot = r.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400';
  return (
    <span className={`pill text-[10px] uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 ${cls}`} title={r.hint}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {r.label}
    </span>
  );
}

function UsageBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500';
  return (
    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function CustomersAtRisk() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.customersRisk.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | critical | warning

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const u = await api('/api/admin/users');
      const next = u.users.filter((x) => x.role === 'customer');
      setUsers(next);
      writeCache('admin.customersRisk.users', currentUser?.id, next);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);

  const rows = useMemo(() => {
    if (!effectiveUsers) return null;
    return effectiveUsers
      .map((u) => ({ user: u, risk: assessRisk(u) }))
      .filter((r) => r.risk.reasons.length > 0)
      .sort((a, b) => b.risk.score - a.risk.score || b.risk.mrr - a.risk.mrr);
  }, [effectiveUsers]);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    if (filter === 'all') return rows;
    return rows.filter((r) => r.risk.severity === filter);
  }, [rows, filter]);

  const criticalCount = rows?.filter((r) => r.risk.severity === 'critical').length ?? 0;
  const warningCount = rows?.filter((r) => r.risk.severity === 'warning').length ?? 0;
  const mrrAtRisk = rows?.reduce((a, r) => a + r.risk.mrr, 0) ?? 0;
  const total = rows?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute">Signals for churn, overage, and failed provisioning — computed live from every customer's plan and usage.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh risk assessment" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {/* Plain stat tiles that double as filters — simple to scan at a
          glance, no extra chart/meter to interpret. */}
      <div className="grid sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`form-card text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${filter === 'all' ? 'ring-2 ring-[var(--primary)]' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Total at risk</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{total}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter('critical')}
          className={`form-card text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${filter === 'critical' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Critical</div>
          <div className="mt-1 text-2xl font-semibold text-red-400">{criticalCount}</div>
        </button>
        <button
          type="button"
          onClick={() => setFilter('warning')}
          className={`form-card text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${filter === 'warning' ? 'ring-2 ring-amber-500' : ''}`}
        >
          <div className="text-xs text-mute uppercase">Warning</div>
          <div className="mt-1 text-2xl font-semibold text-amber-400">{warningCount}</div>
        </button>
        <div className="form-card">
          <div className="text-xs text-mute uppercase">MRR at risk</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--accent)]">{fmtUSD(mrrAtRisk)}</div>
        </div>
      </div>

      <div className="form-card p-0 overflow-x-auto">
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
                {total === 0
                  ? '✓ No customers currently flagged — everyone is provisioned, within their plan, and active.'
                  : 'No customers match this filter.'}
              </td></tr>
            )}
            {(filteredRows || []).map(({ user: u, risk }, i) => (
              <tr
                key={u.id}
                className="group relative transition-colors hover:bg-white/[0.035] animate-fade-up"
                style={{
                  animationDelay: `${Math.min(i, 8) * 40}ms`,
                  boxShadow: `inset 3px 0 0 0 ${risk.severity === 'critical' ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.7)'}`,
                }}
              >
                <td>
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] flex items-center justify-center text-white text-[11px] font-bold">
                      {initials(u.company || u.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.company || u.name}</div>
                      <div className="text-xs text-mute truncate">{u.email}</div>
                    </div>
                  </div>
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
                <td className="text-right font-semibold text-[var(--accent)] transition-transform group-hover:scale-105 origin-right">{fmtUSD(risk.mrr)}</td>
                <td className="text-xs text-mute whitespace-nowrap"><Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
