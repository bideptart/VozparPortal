import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, UserPlus, TrendingUp, Phone, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
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

function StatCard({ title, value, icon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--body)]">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-[var(--accent)]">{value}</div>
      </CardContent>
    </Card>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total customers" value={effectiveUsers?.length ?? '—'} icon={<Users className="h-4 w-4 text-[var(--body)]" />} />
        <StatCard title="Last 24 hr" value={effectiveUsers ? last24h : '—'} icon={<UserPlus className="h-4 w-4 text-[var(--body)]" />} />
        <StatCard title="Last 7 days" value={effectiveUsers ? last7d : '—'} icon={<TrendingUp className="h-4 w-4 text-[var(--body)]" />} />
        <StatCard title="Live (with #)" value={effectiveUsers ? liveCount : '—'} icon={<Phone className="h-4 w-4 text-[var(--body)]" />} />
        <StatCard title="Plans sold" value={effectiveUsers ? totalDids : '—'} icon={<CreditCard className="h-4 w-4 text-[var(--body)]" />} />
      </div>

      <div className="form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Number</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Status</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {effectiveUsers === null && <tr><td colSpan={6} className="text-center text-mute py-6">Loading…</td></tr>}
            {effectiveUsers?.length === 0 && <tr><td colSpan={6} className="text-center text-mute py-6">No signups yet.</td></tr>}
            {(effectiveUsers || []).flatMap((u) => {
              const dids = didsFor(u);
              if (dids.length === 0) {
                return [(
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.company || u.name}</div>
                      <div className="text-xs text-mute">{u.email}</div>
                    </td>
                    <td colSpan={3} className="text-mute text-sm italic">— No DID provisioned —</td>
                    <td>
                      <span className="pill bg-amber-500/15 text-amber-400 text-[10px] uppercase tracking-wider font-semibold">
                        No number
                      </span>
                    </td>
                    <td className="text-xs text-mute">{fmtRelative(u.createdAt)}</td>
                  </tr>
                )];
              }
              return dids.map((d, i) => (
                <tr key={`${u.id}-${d.id}`}>
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="align-top">
                      <div className="font-medium">{u.company || u.name}</div>
                      <div className="text-xs text-mute">{u.email}</div>
                      {dids.length > 1 && (
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-lime-400 font-semibold">
                          {dids.length} plans
                        </div>
                      )}
                    </td>
                  ) : null}
                  <td className="font-mono text-sm">
                    <span>{d.value}</span>
                    {d.isPrimary && dids.length > 1 && (
                      <span className="ml-2 pill bg-lime-500/15 text-lime-400 text-[10px] uppercase tracking-wider font-semibold">
                        primary
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="text-sm font-semibold text-[var(--foreground)]">{d.plan?.label || '—'}</div>
                    <div className="text-xs text-mute">
                      {fmtUSD(d.plan?.amount)} · {d.plan?.min || 0} min
                    </div>
                  </td>
                  <td>
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${
                      d.planCycle === 'yearly'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-500/15 text-[var(--body)]'
                    }`}>
                      {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                  </td>
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="align-top">
                      <span className="pill bg-lime-500/15 text-lime-400 text-[10px] uppercase tracking-wider font-semibold">
                        Live
                      </span>
                    </td>
                  ) : null}
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="align-top text-xs text-mute">
                      {fmtRelative(u.createdAt)}
                    </td>
                  ) : null}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
