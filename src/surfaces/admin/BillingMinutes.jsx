import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, CreditCard, Calendar, Phone, RefreshCw, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import BillingUpgradePlans from '@/components/ui/billing-upgrade-plans';
import { DEFAULT_PUBLIC_PLANS } from '@/lib/public-plan-catalog';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

// Same 4-tab shell as the customer-facing Billing page. Only "My Plans" is
// built out — matches the reference screenshot exactly, no extra sections.
const TABS = [
  { id: 'my-plans', label: 'My Plans' },
  { id: 'upgrade-plans', label: 'Upgrade Plans' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'auto-recharge', label: 'Auto-recharge' },
];

const fmtMin = (n) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} min`;
const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function BillingMinutes() {
  const { currentUser } = useApp();
  const [tab, setTab] = useState('my-plans');
  const [users, setUsers] = useState(() => readCache('admin.billingMinutes.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertMinutes, setAlertMinutes] = useState(20);
  const [alertSaved, setAlertSaved] = useState('');
  const [topupAmount, setTopupAmount] = useState(10);
  const [customTopup, setCustomTopup] = useState('10');
  const [paymentMethodErr, setPaymentMethodErr] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [topupMsg, setTopupMsg] = useState('');
  const [autoRechargeOn, setAutoRechargeOn] = useState({}); // { [numberId]: boolean }
  const [saveCardErr, setSaveCardErr] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [cardSaved, setCardSaved] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [modalTopupErr, setModalTopupErr] = useState('');

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

  const totals = useMemo(() => {
    if (!effectiveUsers) return { included: 0, rentalTotal: 0, numbersActive: 0, customers: 0, topPlan: null, topPlanAmount: 0, topPlanMin: 0 };
    let included = 0, rentalTotal = 0, numbersActive = 0;
    const planCounts = {};
    let topPlanAmount = 0;
    let topPlanMin = 0;
    effectiveUsers.forEach((u) => {
      const dids = didsFor(u);
      numbersActive += dids.length;
      dids.forEach((d) => {
        included += Number(d.plan?.min) || 0;
        const amt = Number(d.plan?.amount) || 0;
        rentalTotal += d.planCycle === 'yearly' ? amt / 12 : amt;
        const label = d.plan?.label;
        if (label) planCounts[label] = (planCounts[label] || 0) + 1;
      });
    });
    const topPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0] || null;
    if (topPlan) {
      effectiveUsers.forEach((u) => {
        didsFor(u).forEach((d) => {
          if (d.plan?.label === topPlan[0]) {
            topPlanAmount = Number(d.plan.amount) || topPlanAmount;
            topPlanMin += Number(d.plan.min) || 0;
          }
        });
      });
    }
    return { included, rentalTotal, numbersActive, customers: effectiveUsers.length, topPlan, topPlanAmount, topPlanMin };
  }, [effectiveUsers]);

  // Flat (customer, number) rows for the Auto-recharge tab — one card per
  // line, same as the customer page's one-card-per-number layout.
  const numberRows = useMemo(() => {
    if (!effectiveUsers) return [];
    const rows = [];
    effectiveUsers.forEach((u) => {
      didsFor(u).forEach((d) => {
        rows.push({
          key: d.id,
          displayName: u.company || u.name,
          value: d.value,
          plan: d.plan,
        });
      });
    });
    return rows;
  }, [effectiveUsers]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3 max-w-3xl">
          <p className="text-[15px] font-semibold text-[var(--body)]">
            Minute usage against plan allowance — one row per customer, across every DID they hold.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-ghost text-sm inline-flex items-center gap-2 justify-center self-start hover:!border-[rgba(4,107,210,0.28)] hover:!bg-[var(--primary)] hover:!text-white hover:!shadow-[0_12px_28px_-18px_var(--glow-strong)] disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>}

      <div className="border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`mb-2 inline-flex items-center rounded-full px-4 py-2 text-[15px] font-medium transition-all ${
                tab === item.id
                  ? 'bg-[var(--primary)] text-white shadow-[0_12px_28px_-18px_var(--glow-strong)]'
                  : 'text-[var(--body)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'my-plans' && (
        <div className="space-y-4 !mt-4">
          <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Active plans</h2>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="space-y-4 lg:w-[260px] lg:flex-none xl:w-[296px]">
              <div className="form-card gradient-border w-full max-w-[260px] rounded-[20px] p-5 lg:max-w-[260px] xl:max-w-[296px]">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">
                  <Wallet size={14} className="text-[var(--primary)]" />
                  Shared Wallet Balance
                </div>

                <div className="mt-4 text-[44px] leading-none font-extrabold text-[var(--foreground)] xl:text-[48px]">
                  {money(walletBalance)}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setModalTopupErr(''); setShowAddFundsModal(true); }}
                    className="text-sm inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-3 font-semibold transition-all border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.28)] hover:bg-[var(--primary)] hover:text-white"
                  >
                    + Add funds
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('auto-recharge')}
                    className="text-sm inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-3 font-semibold transition-all border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.28)] hover:bg-[var(--primary)] hover:text-white hover:shadow-[0_12px_28px_-18px_var(--glow-strong)]"
                  >
                    Auto-recharge
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:min-w-0 lg:flex-1">
              <div className="form-card rounded-[20px] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[18px] font-semibold text-[var(--foreground)]">
                        {totals.topPlan ? totals.topPlan[0] : 'No plans yet'}
                      </div>
                      {totals.topPlan && (
                        <span className="pill border border-[var(--border)] bg-[var(--muted)] text-[var(--body)]">
                          ${totals.topPlanAmount}/mo
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--body)]">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} className="text-[var(--accent)]" />
                        {totals.customers} customer{totals.customers === 1 ? '' : 's'} on {totals.numbersActive} number{totals.numbersActive === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Included minutes</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{totals.topPlanMin}</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Activated</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">—</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Next renewal</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">—</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="form-card rounded-[20px]">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">
                <CreditCard size={14} className="text-[var(--accent)]" />
                Current Subscription Details
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Customers</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{totals.customers}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Monthly spend</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{money(totals.rentalTotal)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Included minutes</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{fmtMin(totals.included)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Numbers on plan</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{totals.numbersActive} active</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--body)]">
                This section reflects live plan allocation, included usage, and current monthly subscription footprint across every customer.
              </p>
            </div>

            <div className="form-card rounded-[20px]">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">
                <Calendar size={14} className="text-[var(--accent)]" />
                Renewal Information
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Next renewal</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">—</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Renewal line</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">No renewal scheduled</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--body)]">
                Renewal dates and upcoming refresh timing come directly from each customer's active number plans.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'upgrade-plans' && (
        <div className="space-y-3">
          <BillingUpgradePlans
            plans={DEFAULT_PUBLIC_PLANS}
            hasActivePlans
            helperMessage="Reference catalog — the same plans customers see when they upgrade."
            onPlanSelect={(plan) => setUpgradeMsg(`To move a customer onto ${plan.name}, open their row on the Customers page and update their plan there.`)}
          />
          {upgradeMsg && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--body)]">
              {upgradeMsg}
            </div>
          )}
        </div>
      )}

      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,_1fr)]">
            <div className="space-y-5">
              <div className="form-card gradient-border flex min-h-[156px] flex-col justify-between rounded-[20px] bg-[linear-gradient(180deg,rgba(4,107,210,0.24),rgba(4,107,210,0.08))]">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Current Balance</div>
                  <div className="mt-4 text-[44px] leading-none font-extrabold text-[var(--foreground)]">{money(walletBalance)}</div>
                </div>
                <p className="mt-3 max-w-[220px] text-sm leading-6 text-[var(--body)]">
                  Used as backup when a number's plan minutes run out.
                </p>
              </div>

              <div className="form-card min-h-[152px] rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Low-minutes alert</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  We'll warn you on the dashboard and by email when your remaining minutes drop to this level.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[110px]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input w-full pr-3 text-center"
                      value={alertMinutes}
                      onChange={(e) => { setAlertMinutes(e.target.value); setAlertSaved(''); }}
                    />
                  </div>
                  <span className="text-sm text-[var(--body)]">minutes left</span>
                  <button
                    type="button"
                    className="btn-primary text-sm sm:ml-auto"
                    onClick={() => setAlertSaved('✓ Saved')}
                  >
                    Save
                  </button>
                </div>
                {alertSaved && <div className="mt-3 text-xs text-[var(--body)]">{alertSaved}</div>}
              </div>

              <div className="form-card rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Add funds</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  Pay-per-minute backup for when plan minutes run out.
                </p>

                <div className="mt-5 grid grid-cols-4 gap-2.5">
                  {[5, 10, 20, 50].map((amount) => {
                    const isSelected = Number(customTopup) === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => { setTopupAmount(amount); setCustomTopup(String(amount)); }}
                        className={`flex h-14 w-full items-center justify-center rounded-2xl border px-2 text-center transition ${
                          isSelected
                            ? 'border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[var(--primary)]'
                        }`}
                      >
                        <div className="text-[15px] font-semibold tabular-nums sm:text-lg">${amount}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input h-14 rounded-2xl px-4 text-base"
                    placeholder="Custom amount ($)"
                    value={customTopup}
                    onChange={(e) => setCustomTopup(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary text-sm mt-3 w-full"
                  onClick={() => setTopupMsg('Request failed (404)')}
                >
                  Add ${customTopup || topupAmount} to wallet
                </button>
                {topupMsg && <div className="mt-3 text-sm text-red-400">{topupMsg}</div>}

                <p className="mt-3 text-xs text-[var(--body)]">
                  Wallet funds never expire and are shared across all your numbers.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="form-card rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Payment method</div>
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-6 text-center text-sm text-[var(--body)]">
                  No card on file yet. Save one to enable auto-recharge.
                  <div className="mt-4">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => setPaymentMethodErr('404 — Not Found: this endpoint isn’t wired up yet.')}
                    >
                      + Add payment method
                    </button>
                  </div>
                </div>
                {paymentMethodErr && (
                  <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {paymentMethodErr}
                  </div>
                )}
              </div>

              <div className="form-card min-h-[296px] rounded-[20px] p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--border)]">
                  <div className="text-lg font-semibold text-[var(--foreground)]">Wallet history</div>
                </div>
                <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="text-lg font-semibold text-[var(--foreground)]">No wallet transactions yet</div>
                  <p className="mt-2 text-sm text-[var(--body)]">
                    Top-ups, renewals, and usage charges will appear here automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'auto-recharge' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,_1fr)_300px]">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[28px] font-semibold tracking-tight text-[var(--foreground)]">Auto-recharge per plan</div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--body)]">
                    Turn auto-recharge on for the plans you want topped up automatically. We'll use your saved card before interruptions hit your calls.
                  </p>
                </div>
                <span className="pill border border-[var(--border)] bg-[var(--muted)] text-[var(--body)]">
                  {numberRows.filter((n) => !autoRechargeOn[n.key]).length} OFF
                </span>
              </div>

              <div className="mt-6 space-y-4 xl:max-w-[760px]">
                {numberRows.length === 0 ? (
                  <div className="form-card rounded-[20px] text-center">
                    <div className="text-lg font-semibold text-[var(--foreground)]">No plans yet</div>
                  </div>
                ) : (
                  numberRows.map((n) => {
                    const isOn = Boolean(autoRechargeOn[n.key]);
                    return (
                    <div key={n.key} className="form-card rounded-[20px]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(4,107,210,0.18)] text-base font-bold text-[var(--primary)]">
                            {String(n.displayName || 'A').charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-[var(--foreground)]">{n.displayName}</div>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                isOn
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]'
                              }`}>
                                {isOn ? 'On' : 'Off'}
                              </span>
                            </div>

                            <div className="mt-1 inline-flex items-center gap-2 text-sm text-[var(--primary)]">
                              <Phone size={14} />
                              <span>{n.value || 'Primary line'}</span>
                            </div>

                            <div className="mt-2 text-sm text-[var(--body)]">
                              ${Number(n.plan?.amount || 0)}/mo · {n.plan?.label || 'Starter'} plan
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start md:pl-4">
                          <Switch
                            checked={isOn}
                            onCheckedChange={(checked) => setAutoRechargeOn((m) => ({ ...m, [n.key]: checked }))}
                          />
                          <span className="min-w-[28px] text-sm font-semibold text-[var(--foreground)]">{isOn ? 'On' : 'Off'}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[var(--border)] text-sm text-[var(--body)]">
                        {cardSaved
                          ? 'Card on file — flip the switch to keep this line running without manual top-ups.'
                          : 'Attach a card, then turn this on to keep this line running without manual top-ups.'}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="form-card rounded-[20px]">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Saved card</div>
                <p className="mt-3 text-sm leading-6 text-[var(--body)]">
                  {cardSaved
                    ? 'Visa •••• 4242 on file. Auto-recharge is ready to use on any line above.'
                    : 'No card on file. Auto-recharge needs a saved card so we can top up without interrupting calls.'}
                </p>
                {!cardSaved && (
                  <button type="button" className="btn-primary text-sm w-full mt-4" onClick={() => { setCardSaved(true); setSaveCardErr(''); }}>
                    + Save a card
                  </button>
                )}
                {saveCardErr && <div className="mt-3 text-sm text-red-300">{saveCardErr}</div>}
              </div>

              <div className="form-card rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">How it works</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  When a plan you've enabled runs out of minutes, we use the saved card for that plan's recharge flow so calls keep going without manual intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddFundsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setShowAddFundsModal(false)}>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div className="absolute w-full max-w-md p-4" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div
              className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-[var(--foreground)]">Add funds to wallet</div>
                  <p className="mt-1 text-sm text-[var(--body)]">
                    Pay-per-minute backup for when plan minutes run out. Wallet funds never expire and are shared across all your numbers.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-sm px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0"
                  onClick={() => setShowAddFundsModal(false)}
                >
                  <X size={14} /> Close
                </button>
              </div>

              <div className="mt-4">
                <div className="grid grid-cols-4 gap-2.5">
                  {[5, 10, 20, 50].map((amount) => {
                    const isSelected = Number(customTopup) === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => { setTopupAmount(amount); setCustomTopup(String(amount)); setModalTopupErr(''); }}
                        className={`flex h-14 w-full items-center justify-center rounded-2xl border px-2 text-center transition ${
                          isSelected
                            ? 'border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[var(--primary)]'
                        }`}
                      >
                        <div className="text-[15px] font-semibold tabular-nums sm:text-lg">${amount}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input h-14 rounded-2xl px-4 text-base"
                    placeholder="Custom amount ($)"
                    value={customTopup}
                    onChange={(e) => { setCustomTopup(e.target.value); setModalTopupErr(''); }}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold"
                  onClick={() => setModalTopupErr('Request failed (404)')}
                >
                  Add ${customTopup || topupAmount} to wallet
                </button>

                {modalTopupErr && (
                  <div className="mt-3 text-sm text-red-400">{modalTopupErr}</div>
                )}

                <p className="mt-3 text-xs text-[var(--body)]">
                  Wallet funds never expire and are shared across all your numbers.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
