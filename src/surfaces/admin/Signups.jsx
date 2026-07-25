import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, UserPlus, TrendingUp, Phone, CreditCard, Building2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtRelative = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleDateString();
};

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

// Build the canonical list of DIDs for a signup row. We prefer the
// `user.numbers[]` array (one row per provisioned DID, each with its own
// plan tier), and fall back to the legacy single-number shape for any
// row that pre-dates the user_numbers backfill.
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

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks. A couple of very recent signups so "Last 24 hr" / "Last 7
// days" aren't just zero.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13),
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(11),
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9),
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true, planCycle: 'yearly', plan: { label: 'Scale', amount: 1990, min: 1200 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } },
    ] },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(5),
    numbers: [{ id: 'd4', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-5', company: 'Amberlight Cafe', name: 'Sara Lund', email: 'sara@amberlight.example', createdAt: daysAgo(2),
    numbers: [{ id: 'd5', value: '+1 305 555 0163', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-6', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: hoursAgo(18),
    numbers: [{ id: 'd6', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199, min: 1200 } }] },
  { id: 'demo-7', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: hoursAgo(3),
    numbers: [{ id: 'd7', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  // No number yet — demonstrates the "No number" row state too.
  { id: 'demo-8', company: 'Cobalt Freight', name: 'Alex Kim', email: 'alex@cobalt.example', createdAt: hoursAgo(6), numbers: [] },
];

// A single horizontal strip with dividers, instead of a grid of separate
// cards — reads as one KPI readout rather than five disconnected tiles.
function KpiStrip({ items }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          {items.map((it) => (
            <div key={it.title} className="flex-1 flex items-center gap-3 px-5 py-4">
              <span className="flex w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] items-center justify-center text-white shrink-0">
                <it.icon className="w-4 h-4" />
              </span>
              <div>
                <div className="text-2xl font-bold leading-none text-[var(--foreground)]">{it.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--body)] mt-1">{it.title}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanChip({ d }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.03] pl-2.5 pr-3 py-1 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${d.planCycle === 'yearly' ? 'bg-emerald-400' : 'bg-[var(--primary)]'}`} />
      <span className="font-semibold text-[var(--foreground)]">{d.plan?.label || '—'}</span>
      <span className="text-[var(--body)]">{fmtUSD(d.plan?.amount)} · {d.plan?.min || 0}m</span>
      <span className="font-mono text-[var(--body)]">{d.value}</span>
      {d.isPrimary && <span className="text-lime-400 font-semibold">★</span>}
    </span>
  );
}

// One entry per customer, newest first, connected by a vertical rail —
// "Signups" is inherently a chronological feed of events, which reads
// more naturally as a timeline than as a flattened table.
function SignupTimeline({ users }) {
  const sorted = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [users],
  );

  if (sorted.length === 0) {
    return <div className="form-card text-center text-mute py-10">No signups yet.</div>;
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--border)]" aria-hidden="true" />
      <div className="flex flex-col gap-5">
        {sorted.map((u) => {
          const dids = didsFor(u);
          const isLive = dids.length > 0;
          return (
            <div key={u.id} className="relative pl-10">
              <span
                className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-[var(--popover)] ${
                  isLive ? 'bg-lime-500/20 text-lime-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <div className="form-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">{u.company || u.name}</div>
                    <div className="text-xs text-mute">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-mute">{fmtRelative(u.createdAt)}</span>
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${
                      isLive ? 'bg-lime-500/15 text-lime-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {isLive ? 'Live' : 'No number'}
                    </span>
                  </div>
                </div>
                {dids.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dids.map((d) => <PlanChip key={d.id} d={d} />)}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-mute italic">— No DID provisioned —</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Signups() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.signups.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const u = await api('/api/admin/users');
      const nextUsers = u.users.filter((x) => x.role === 'customer');
      setUsers(nextUsers);
      writeCache('admin.signups.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data. Every stat below is
  // derived from this same list, so cards and table always agree
  // (previously "Total customers"/"Last 24 hr"/"Last 7 days" came from a
  // separate /api/admin/stats call that could fail independently of the
  // user list, e.g. exactly the "Cannot read properties of undefined
  // (reading 'filter')" state this page used to get stuck in).
  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);

  const liveCount = (effectiveUsers || []).filter((u) => didsFor(u).length > 0).length;
  const totalDids = useMemo(
    () => (effectiveUsers || []).reduce((a, u) => a + didsFor(u).length, 0),
    [effectiveUsers],
  );
  const last24h = useMemo(
    () => (effectiveUsers || []).filter((u) => u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 86400000).length,
    [effectiveUsers],
  );
  const last7d = useMemo(
    () => (effectiveUsers || []).filter((u) => u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000).length,
    [effectiveUsers],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute">Every customer who completed signup — with every DID + plan they bought.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh signups" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <KpiStrip items={[
        { title: 'Total customers', value: effectiveUsers?.length ?? '—', icon: Users },
        { title: 'Last 24 hr', value: effectiveUsers ? last24h : '—', icon: UserPlus },
        { title: 'Last 7 days', value: effectiveUsers ? last7d : '—', icon: TrendingUp },
        { title: 'Live (with #)', value: effectiveUsers ? liveCount : '—', icon: Phone },
        { title: 'Plans sold', value: effectiveUsers ? totalDids : '—', icon: CreditCard },
      ]} />

      {effectiveUsers === null ? (
        <div className="form-card text-center text-mute py-10">Loading…</div>
      ) : (
        <SignupTimeline users={effectiveUsers} />
      )}
    </div>
  );
}

