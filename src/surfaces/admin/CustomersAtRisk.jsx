import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Search, ChevronDown, Calendar, OctagonAlert,
  ShieldAlert, DollarSign, Users,
} from 'lucide-react';
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
// fallbacks. Deliberately spans every alert reason so the page has
// something of each severity to show.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(20), minutesUsed: 612,
    number: '+1 312 555 0177', twilioSid: 'CA4d5e6f7g8h9i0j1k2l3m',
    numbers: [{ id: 'd1', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-2', company: 'Cobalt Freight', name: 'Alex Kim', email: 'alex@cobalt.example', createdAt: daysAgo(15), minutesUsed: 0, numbers: [] },
  { id: 'demo-3', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: daysAgo(10), minutesUsed: 0,
    number: '+1 512 555 0184', twilioSid: null,
    numbers: [{ id: 'd3', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-4', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(18), minutesUsed: 88,
    number: '+1 212 555 0198', twilioSid: 'CA2b3c4d5e6f7g8h9i0j1k',
    numbers: [{ id: 'd4', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-5', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: daysAgo(25), minutesUsed: 0,
    number: '+1 720 555 0129', twilioSid: 'CA6f7g8h9i0j1k2l3m4n5o',
    numbers: [{ id: 'd5', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199, min: 1200 } }] },
  { id: 'demo-6', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13), minutesUsed: 210,
    number: '+1 415 555 0142', twilioSid: 'CA1a2b3c4d5e6f7g8h9i0j',
    numbers: [{ id: 'd6', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
];

// There's no dedicated "churn risk" backend signal yet, so each alert is
// derived client-side from the same /api/admin/users payload every other
// admin page already loads — no new endpoint needed for a first cut of
// this screen.
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

function StatTile({ icon: Icon, label, value, tone }) {
  const toneCls = {
    red: 'bg-red-500/12 text-red-400 border-red-500/25',
    amber: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
    blue: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
    neutral: 'bg-[var(--muted)] text-[var(--body)] border-[var(--border)]',
  }[tone];
  return (
    <div className="form-card tap-shadow flex items-center gap-3 py-4 cursor-pointer">
      <span className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${toneCls}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[var(--foreground)] leading-none">{value}</div>
        <div className="text-xs text-mute mt-1">{label}</div>
      </div>
    </div>
  );
}

function UsageBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// Alert feed row — a colored left rail signals severity at a glance (like a
// notification/timeline feed), collapsed to one line with reason chips and
// MRR; expands for the usage/plan/signed-up breakdown. A deliberately
// different shape from both the old accordion table and the dashboard-card
// layout this page has had before.
function AlertRow({ user: u, risk, expanded, onToggle, i }) {
  const isCritical = risk.severity === 'critical';
  const railColor = isCritical ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div
      className="form-card p-0 overflow-hidden flex animate-fade-up"
      style={{ animationDelay: `${i * 35}ms` }}
    >
      <span className={`w-1 shrink-0 ${railColor}`} />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
          aria-expanded={expanded}
        >
          <span className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] flex items-center justify-center text-white text-xs font-bold">
            {initials(u.company || u.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--foreground)] truncate">{u.company || u.name}</span>
              {risk.reasons.map((id) => (
                <span
                  key={id}
                  className={`pill text-[9px] uppercase tracking-wider font-semibold ${
                    REASONS[id].severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                  title={REASONS[id].hint}
                >
                  {REASONS[id].label}
                </span>
              ))}
            </div>
            <div className="text-xs text-mute truncate mt-0.5">{u.email}</div>
          </div>
          <span className="text-sm font-bold text-[var(--foreground)] shrink-0">{fmtUSD(risk.mrr)}<span className="text-[10px] font-normal text-mute">/mo</span></span>
          <ChevronDown className={`w-4 h-4 text-mute shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-0.5 border-t border-[var(--border)] animate-fade-up grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mb-1.5">Usage</div>
              {risk.totalMin > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <UsageBar pct={risk.usagePct} />
                  <span className="text-xs text-mute">{risk.usedMin.toFixed(1)} / {risk.totalMin} min</span>
                </div>
              ) : <span className="text-mute text-xs italic">no plan minutes</span>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mb-1.5">Plan</div>
              <div className="text-sm">
                {risk.dids.length > 0
                  ? risk.dids.map((d) => d.plan?.label).filter(Boolean).join(', ') || '—'
                  : <span className="text-mute italic">none</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mb-1.5">Signed up</div>
              <div className="text-xs text-mute flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(u.createdAt)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersAtRisk() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.customersRisk.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | critical | warning
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => filter === 'all' || r.risk.severity === filter)
      .filter((r) => !q || (r.user.company || r.user.name || '').toLowerCase().includes(q) || (r.user.email || '').toLowerCase().includes(q));
  }, [rows, filter, search]);

  const criticalCount = rows?.filter((r) => r.risk.severity === 'critical').length ?? 0;
  const warningCount = rows?.filter((r) => r.risk.severity === 'warning').length ?? 0;
  const mrrAtRisk = rows?.reduce((a, r) => a + r.risk.mrr, 0) ?? 0;
  const total = rows?.length ?? 0;

  const TABS = [
    { key: 'all', label: 'All', count: total },
    { key: 'critical', label: 'Critical', count: criticalCount },
    { key: 'warning', label: 'Warning', count: warningCount },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute">Signals for churn, overage, and failed provisioning — computed live from every customer's plan and usage.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh alert data" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={OctagonAlert} label="Critical alerts" value={criticalCount} tone="red" />
        <StatTile icon={ShieldAlert} label="Warning alerts" value={warningCount} tone="amber" />
        <StatTile icon={DollarSign} label="MRR at risk" value={fmtUSD(mrrAtRisk)} tone="blue" />
        <StatTile icon={Users} label="Flagged customers" value={total} tone="neutral" />
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`rounded-[12px] px-4 py-2 text-sm font-medium transition-colors ${
                filter === t.key
                  ? t.key === 'critical' ? 'bg-red-500 text-white' : t.key === 'warning' ? 'bg-amber-500 text-white' : 'bg-[var(--primary)] text-white'
                  : 'text-[var(--body)] hover:text-[var(--foreground)]'
              }`}
            >
              {t.label} <span className="opacity-75">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)] pointer-events-none" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredRows === null && <div className="form-card text-center text-mute py-10">Loading…</div>}
      {filteredRows?.length === 0 && (
        <div className="form-card text-center text-mute py-10">
          {total === 0
            ? '✓ No customers currently flagged — everyone is provisioned, within their plan, and active.'
            : 'No customers match this filter.'}
        </div>
      )}
      {filteredRows && filteredRows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filteredRows.map((r, i) => (
            <AlertRow
              key={r.user.id}
              i={i}
              user={r.user}
              risk={r.risk}
              expanded={expandedId === r.user.id}
              onToggle={() => setExpandedId((cur) => (cur === r.user.id ? null : r.user.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
