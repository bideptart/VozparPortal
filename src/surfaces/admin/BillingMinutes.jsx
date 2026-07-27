import { useEffect, useMemo, useState } from 'react';
import { Clock, Phone, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtMin = (n) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} min`;
const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Same fallback logic used across the other admin billing/revenue pages:
// prefer `user.numbers[]` (per-DID plan tiers), fall back to the legacy
// primary fields for old rows.
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

const CHART_COLORS = {
  grid: '#1A2638',
  axis: '#CCD6DF',
  tooltipBg: '#111B2D',
  tooltipBorder: '#1A2638',
  tooltipText: '#FFFFFF',
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as Price & Revenue's demo fallback.
// minutesUsed values are deliberately spread across ok / near-limit / over
// so the page demonstrates every status state.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13), minutesUsed: 210,
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(11), minutesUsed: 95,
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9), minutesUsed: 1180,
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true, planCycle: 'yearly', plan: { label: 'Scale', amount: 1990, min: 1200 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } },
    ] },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(7), minutesUsed: 502,
    numbers: [{ id: 'd4', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-5', company: 'Amberlight Cafe', name: 'Sara Lund', email: 'sara@amberlight.example', createdAt: daysAgo(5), minutesUsed: 12,
    numbers: [{ id: 'd5', value: '+1 305 555 0163', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-6', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: daysAgo(3), minutesUsed: 178,
    numbers: [{ id: 'd6', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199, min: 1200 } }] },
  { id: 'demo-7', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: daysAgo(1), minutesUsed: 421,
    numbers: [{ id: 'd7', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
];

function statusFor(pct) {
  if (pct >= 100) return { key: 'over', label: 'Over limit', cls: 'bg-red-500/15 text-red-400' };
  if (pct >= 80) return { key: 'near', label: 'Near limit', cls: 'bg-amber-500/15 text-amber-400' };
  return { key: 'ok', label: 'OK', cls: 'bg-lime-500/15 text-lime-400' };
}

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

function UsageBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500';
  return (
    <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function BillingMinutes() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.billingMinutes.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const u = await api('/api/admin/users');
      const nextUsers = u.users.filter((x) => x.role === 'customer');
      setUsers(nextUsers);
      writeCache('admin.billingMinutes.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);

  // Per-customer minute usage — total minutes used vs. total minutes
  // included across every DID/plan a customer holds.
  const rows = useMemo(() => {
    if (!effectiveUsers) return [];
    return effectiveUsers.map((u) => {
      const dids = didsFor(u);
      const included = dids.reduce((a, d) => a + (Number(d.plan?.min) || 0), 0);
      const used = Number(u.minutesUsed) || 0;
      const pct = included > 0 ? (used / included) * 100 : 0;
      const rentalCost = dids.reduce((a, d) => {
        const amt = Number(d.plan?.amount) || 0;
        return a + (d.planCycle === 'yearly' ? amt / 12 : amt);
      }, 0);
      return {
        id: u.id,
        customer: u.company || u.name,
        email: u.email,
        dids,
        included,
        used,
        pct,
        rentalCost,
        status: statusFor(pct),
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [effectiveUsers]);

  const totals = useMemo(() => {
    const included = rows.reduce((a, r) => a + r.included, 0);
    const used = rows.reduce((a, r) => a + r.used, 0);
    const overCount = rows.filter((r) => r.status.key === 'over').length;
    const nearCount = rows.filter((r) => r.status.key === 'near').length;
    return { included, used, pct: included > 0 ? (used / included) * 100 : 0, overCount, nearCount };
  }, [rows]);

  const chartData = useMemo(
    () => rows.slice(0, 10).map((r) => ({ label: r.customer.length > 14 ? `${r.customer.slice(0, 13)}…` : r.customer, used: r.used, included: r.included, pct: r.pct })),
    [rows],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-base font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
            Minute usage against plan allowance — one row per customer, across every DID they hold.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh data" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Minutes used"
          value={fmtMin(totals.used)}
          icon={<Clock className="h-4 w-4 text-[var(--body)]" />}
          description={`of ${fmtMin(totals.included)} included`}
          valueClassName="text-[var(--primary)]"
        />
        <MetricCard
          title="Platform utilization"
          value={`${totals.pct.toFixed(0)}%`}
          icon={<Phone className="h-4 w-4 text-[var(--body)]" />}
          description="Used ÷ included, across all customers"
        />
        <MetricCard
          title="Near limit"
          value={totals.nearCount}
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          description="80%+ of included minutes used"
          valueClassName="text-amber-400"
        />
        <MetricCard
          title="Over limit"
          value={totals.overCount}
          icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
          description="Used more than their plan includes"
          valueClassName="text-red-400"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Minutes used vs. included — top 10 by usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} width={40} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder, borderRadius: '0.5rem' }}
                  itemStyle={{ color: CHART_COLORS.tooltipText }}
                  labelStyle={{ color: CHART_COLORS.axis }}
                  formatter={(value, name) => [fmtMin(value), name === 'used' ? 'Used' : 'Included']}
                />
                <Bar dataKey="included" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                <Bar dataKey="used" fill="#046BD2" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Per-customer minutes</h2>
        <div className="form-card p-0 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan(s)</th>
                <th>Usage</th>
                <th>Status</th>
                <th className="text-right">Number rental / mo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && effectiveUsers === null && (
                <tr><td colSpan={5} className="text-center text-mute py-6">Loading…</td></tr>
              )}
              {effectiveUsers !== null && rows.length === 0 && (
                <tr><td colSpan={5} className="text-center text-mute py-6">No customers yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium">{r.customer}</div>
                    <div className="text-xs text-mute">{r.email}</div>
                  </td>
                  <td className="text-sm">
                    {r.dids.length > 0
                      ? r.dids.map((d) => d.plan?.label).filter(Boolean).join(', ') || '—'
                      : <span className="text-mute italic">none</span>}
                  </td>
                  <td>
                    {r.included > 0 ? (
                      <div className="flex items-center gap-2">
                        <UsageBar pct={r.pct} />
                        <span className="text-xs text-mute whitespace-nowrap">{fmtMin(r.used)} / {fmtMin(r.included)}</span>
                      </div>
                    ) : (
                      <span className="text-mute text-xs italic">no plan minutes</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill text-[10px] uppercase tracking-wider font-semibold inline-flex items-center gap-1 ${r.status.cls}`}>
                      {r.status.key === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {r.status.label}
                    </span>
                  </td>
                  <td className="text-right font-semibold text-lime-400">{fmtUSD(r.rentalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
