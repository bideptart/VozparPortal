import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Repeat2, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtCurrency = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real customer list comes back empty (no DB in this
// sandbox, or genuinely zero customers yet) — never overrides real data,
// same rule the rest of the app follows for its DEMO_* fallbacks. Spread
// across the last 14 days so the charts below have something to plot.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13), planActivated: daysAgo(13),
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79 } }] },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(11), planActivated: daysAgo(11),
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29 } }] },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9), planActivated: daysAgo(9),
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true, planCycle: 'yearly', plan: { label: 'Scale', amount: 1990 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 29 } },
    ] },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(7), planActivated: daysAgo(7),
    numbers: [{ id: 'd4', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79 } }] },
  { id: 'demo-5', company: 'Amberlight Cafe', name: 'Sara Lund', email: 'sara@amberlight.example', createdAt: daysAgo(5), planActivated: daysAgo(5),
    numbers: [{ id: 'd5', value: '+1 305 555 0163', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29 } }] },
  { id: 'demo-6', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: daysAgo(3), planActivated: daysAgo(3),
    numbers: [{ id: 'd6', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199 } }] },
  { id: 'demo-7', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: daysAgo(1), planActivated: daysAgo(1),
    numbers: [{ id: 'd7', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79 } }] },
];

function MetricCard({ title, value, icon, description, valueClassName }) {
  return (
    <Card className="flex-1 min-w-[220px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[var(--body)]">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ''}`}>{value}</div>
        {description && <p className="text-xs text-[var(--body)] mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = {
  grid: '#1A2638',
  axis: '#CCD6DF',
  tooltipBg: '#111B2D',
  tooltipBorder: '#1A2638',
  tooltipText: '#FFFFFF',
  legend: '#CCD6DF',
};

function RevenueChart({ data, title, dataKey, lineColor, legendName }) {
  return (
    <Card className="flex-1 min-w-[300px]">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} tick={{ fontSize: 10 }} />
              <YAxis stroke={CHART_COLORS.axis} fontSize={11} tickFormatter={(v) => `$${v}`} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.tooltipBg,
                  borderColor: CHART_COLORS.tooltipBorder,
                  borderRadius: '0.5rem',
                }}
                itemStyle={{ color: CHART_COLORS.tooltipText }}
                labelStyle={{ color: CHART_COLORS.legend }}
                formatter={(value) => [fmtCurrency(value), legendName]}
              />
              <Legend wrapperStyle={{ color: CHART_COLORS.legend, fontSize: 12 }} />
              <Line type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={2} dot={false} name={legendName} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Payments() {
  const { currentUser } = useApp();
  const [stats, setStats] = useState(() => readCache('admin.payments.stats', currentUser?.id) ?? null);
  const [users, setUsers] = useState(() => readCache('admin.payments.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastLoaded, setLastLoaded] = useState(null);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const [s, u] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/users'),
      ]);
      const nextUsers = u.users.filter((x) => x.role === 'customer');
      setStats(s);
      setUsers(nextUsers);
      setLastLoaded(new Date().toISOString());
      writeCache('admin.payments.stats', currentUser?.id, s);
      writeCache('admin.payments.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty (no backend in this sandbox, or zero customers so far)
  // — never overrides real data, and every derived number below flows
  // through this single switch so cards/charts/table/activity all agree.
  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);

  // Locally re-derive MRR from the per-DID plan tiers so every number on
  // this page (cards, charts, table) agrees with each other — the legacy
  // /api/admin/stats `mrr` value only counted users.plan_amount once per
  // customer, not once per DID.
  const localMrr = useMemo(() => {
    if (!effectiveUsers) return null;
    let plans = 0, numbers = 0;
    for (const u of effectiveUsers) {
      const dids = didsFor(u);
      for (const d of dids) plans += monthlyFor(d);
      if (u.number) numbers += Number(u.numberPrice) || 0;
    }
    return { plans, numbers, total: plans + numbers };
  }, [effectiveUsers]);

  // Flat list of every DID activation across every customer, newest first —
  // the real-data equivalent of the "Latest Payments" feed: each DID's plan
  // purchase is the closest thing this app has to a discrete "payment" event.
  const activations = useMemo(() => {
    if (!effectiveUsers) return [];
    const rows = [];
    for (const u of effectiveUsers) {
      for (const d of didsFor(u)) {
        if (!d.plan) continue;
        rows.push({
          id: `${u.id}-${d.id}`,
          customer: u.company || u.name,
          number: d.value,
          amount: monthlyFor(d),
          planLabel: d.plan.label,
          cycle: d.planCycle,
          at: u.planActivated || u.createdAt,
        });
      }
    }
    return rows.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 10);
  }, [effectiveUsers]);

  // Daily new-MRR added (last 14 days) and cumulative MRR growth, both
  // bucketed from real signup/activation dates — no simulated data.
  const { dailyData, cumulativeData } = useMemo(() => {
    if (!effectiveUsers) return { dailyData: [], cumulativeData: [] };
    const events = [];
    for (const u of effectiveUsers) {
      for (const d of didsFor(u)) {
        const at = u.planActivated || u.createdAt;
        if (!at || !d.plan) continue;
        events.push({ at: new Date(at), amount: monthlyFor(d) });
      }
    }
    events.sort((a, b) => a.at - b.at);

    const ymd = (d) => d.toISOString().slice(0, 10);
    const dayLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Last 14 calendar days, zero-filled.
    const days = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ key: ymd(d), label: dayLabel(d), amount: 0 });
    }
    const byDay = new Map(days.map((d) => [d.key, d]));
    for (const e of events) {
      const key = ymd(e.at);
      const bucket = byDay.get(key);
      if (bucket) bucket.amount += e.amount;
    }

    let running = 0;
    const cumulative = events.map((e, i) => {
      running += e.amount;
      return { label: e.at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), total: running, key: i };
    });

    return { dailyData: days, cumulativeData: cumulative };
  }, [effectiveUsers]);

  const activeCount = usingDemo ? DEMO_USERS.length : (stats?.customers ?? users?.length ?? 0);
  const avgPerCustomer = localMrr && activeCount > 0 ? localMrr.total / activeCount : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-base font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
            Recurring revenue across every plan a customer is on — one row per DID.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh data" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="MRR (total)"
          value={localMrr ? fmtCurrency(localMrr.total) : '—'}
          icon={<DollarSign className="h-4 w-4 text-[var(--body)]" />}
          description="From plans + number rentals"
          valueClassName="text-emerald-400"
        />
        <MetricCard
          title="Active subscriptions"
          value={activeCount}
          icon={<Repeat2 className="h-4 w-4 text-[var(--body)]" />}
          description="Paying customers"
        />
        <MetricCard
          title="Average / customer"
          value={fmtCurrency(avgPerCustomer)}
          icon={<TrendingUp className="h-4 w-4 text-[var(--body)]" />}
          description="MRR ÷ active subscriptions"
          valueClassName="text-[var(--accent)]"
        />
        <MetricCard
          title="Data freshness"
          value={loading ? 'Refreshing…' : 'Up to date'}
          icon={<Clock className={`h-4 w-4 text-[var(--body)] ${loading ? 'animate-pulse' : ''}`} />}
          description={lastLoaded ? `Last refreshed ${fmtRelative(lastLoaded)}` : 'Not loaded yet'}
        />
      </div>

      {/* Charts */}
      <div className="flex flex-wrap gap-4">
        <RevenueChart
          data={dailyData}
          title="New MRR — last 14 days"
          dataKey="amount"
          lineColor="#046BD2"
          legendName="New MRR"
        />
        <RevenueChart
          data={cumulativeData}
          title="Cumulative MRR growth"
          dataKey="total"
          lineColor="#22D3EE"
          legendName="Cumulative MRR"
        />
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[var(--primary)]" /> Recent plan activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--border)]">
            {activations.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--body)]">No plan activity yet.</p>
            ) : (
              activations.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{fmtCurrency(a.amount)} <span className="text-[var(--body)] font-normal">/ mo</span></span>
                    <span className="text-sm text-[var(--body)]">{a.planLabel} · {a.customer} · {a.number}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs text-[var(--body)]">{fmtRelative(a.at)}</span>
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${
                      a.cycle === 'yearly' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-[var(--body)]'
                    }`}>
                      {a.cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full per-customer breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Per-customer recurring</h2>
        <div className="form-card p-0 overflow-x-auto">
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
              {effectiveUsers === null && <tr><td colSpan={5} className="text-center text-mute py-6">Loading…</td></tr>}
              {(effectiveUsers || []).flatMap((u) => {
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
    </div>
  );
}
