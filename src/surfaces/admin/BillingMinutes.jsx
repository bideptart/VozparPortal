import { useEffect, useMemo, useState } from 'react';
import {
  Clock, Phone, AlertTriangle, CheckCircle2, RefreshCw,
  Download, Tag, ArrowRightLeft, Users, FileBarChart2,
} from 'lucide-react';
import { FinancialDashboard } from '../../components/ui/financial-dashboard.jsx';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { useNavigate } from 'react-router-dom';
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
  if (pct >= 100) return { key: 'over', label: 'Over limit', cls: 'text-red-400' };
  if (pct >= 80) return { key: 'near', label: 'Near limit', cls: 'text-amber-400' };
  return { key: 'ok', label: 'OK', cls: 'text-lime-400' };
}

function downloadRowsCsv(rows) {
  const header = ['Customer', 'Email', 'Plan(s)', 'Minutes used', 'Minutes included', 'Status', 'Rental / mo'];
  const lines = rows.map((r) => [
    r.customer,
    r.email || '',
    r.dids.map((d) => d.plan?.label).filter(Boolean).join(' + ') || '—',
    r.used,
    r.included,
    r.status.label,
    r.rentalCost.toFixed(2),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `minute-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BillingMinutes() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState(() => readCache('admin.billingMinutes.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.customer.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q));
  }, [rows, search]);

  const quickActions = [
    {
      icon: RefreshCw,
      title: 'Refresh',
      description: loading ? 'Updating…' : 'Update usage data',
      iconClassName: loading ? 'animate-spin' : '',
      onClick: load,
    },
    {
      icon: Download,
      title: 'Export',
      description: 'Download as CSV',
      onClick: rows.length ? () => downloadRowsCsv(filteredRows) : undefined,
    },
    {
      icon: AlertTriangle,
      title: 'Near limit',
      description: `${totals.nearCount} customer${totals.nearCount === 1 ? '' : 's'}`,
      iconClassName: 'text-amber-400',
    },
    {
      icon: AlertTriangle,
      title: 'Over limit',
      description: `${totals.overCount} customer${totals.overCount === 1 ? '' : 's'}`,
      iconClassName: 'text-red-400',
    },
  ];

  const recentActivity = filteredRows.map((r) => ({
    id: r.id,
    icon: r.status.key === 'ok' ? CheckCircle2 : AlertTriangle,
    iconClassName: r.status.cls,
    title: r.customer,
    time: `${r.dids.map((d) => d.plan?.label).filter(Boolean).join(' + ') || 'No plan'} · ${fmtMin(r.used)} / ${r.included > 0 ? fmtMin(r.included) : '—'} (${r.status.label})`,
    amountLabel: `+${fmtUSD(r.rentalCost)}/mo`,
    tone: 'positive',
  }));

  const financialServices = [
    { icon: Tag, title: 'Plans & pricing', description: 'Manage plan tiers and minute allowances', hasAction: true, onClick: () => navigate('/admin/pricing') },
    { icon: ArrowRightLeft, title: 'Transactions', description: 'Payments, refunds and invoices', hasAction: true, onClick: () => navigate('/admin/transactions') },
    { icon: Users, title: 'Customers at risk', description: 'Accounts nearing or over their limit', hasAction: true, onClick: () => navigate('/admin/customers-risk') },
    { icon: FileBarChart2, title: 'Reports', description: 'Call and usage reporting', hasAction: true, onClick: () => navigate('/admin/reports') },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-base font-semibold tracking-wide text-[var(--foreground)]">
            Minute usage against plan allowance — one row per customer, across every DID they hold.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--body)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {fmtMin(totals.used)} / {fmtMin(totals.included)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone size={14} /> {totals.pct.toFixed(0)}% utilization
          </span>
        </div>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <FinancialDashboard
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers by name or email…"
        quickActions={quickActions}
        activityLabel={`Per-customer minutes${filteredRows.length !== rows.length ? ` (${filteredRows.length} of ${rows.length})` : ''}`}
        recentActivity={recentActivity}
        servicesLabel="Related tools"
        financialServices={financialServices}
      />

      {effectiveUsers === null && (
        <div className="text-center text-mute py-6">Loading…</div>
      )}
      {effectiveUsers !== null && rows.length === 0 && (
        <div className="text-center text-mute py-6">No customers yet.</div>
      )}
      {effectiveUsers !== null && rows.length > 0 && filteredRows.length === 0 && (
        <div className="text-center text-mute py-6">No customers match "{search}".</div>
      )}
    </div>
  );
}
