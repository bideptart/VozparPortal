import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  Phone,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { readCache, writeCache } from '../../utils/swrCache.js';
import AddCardForm from '../../components/AddCardForm.jsx';
import BillingUpgradePlans from '@/components/ui/billing-upgrade-plans';

const TABS = [
  { id: 'my-plans', label: 'My Plans' },
  { id: 'upgrade-plans', label: 'Upgrade Plans' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'auto-recharge', label: 'Auto-recharge' },
];

const FALLBACK_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 19,
    minutes: 250,
    agents: 1,
    description: 'For lean teams that need a clean AI front desk with one live line.',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 49,
    minutes: 750,
    agents: 2,
    description: 'For teams handling more inbound traffic, more reporting, and higher call load.',
    featured: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthly: 129,
    minutes: 2400,
    agents: 5,
    description: 'For larger teams that need multi-line coverage and more automation capacity.',
  },
];

const FALLBACK_WALLET_ACTIVITY = [
  { id: 'w_1', label: 'Wallet top-up', date: 'Jul 18, 2026', amount: '+$50.00' },
  { id: 'w_2', label: 'Growth plan renewal', date: 'Jul 12, 2026', amount: '-$49.00' },
  { id: 'w_3', label: 'Overflow minute charges', date: 'Jul 09, 2026', amount: '-$8.64' },
];

function money(amount, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function normalizeCard(card) {
  if (!card || !(card.last4 || card.brand || card.network)) return null;
  return {
    brand: card.brand || card.network || 'Card',
    last4: card.last4 || '••••',
    expMonth: card.expMonth ?? null,
    expYear: card.expYear ?? null,
    isDefault: Boolean(card.isDefault),
  };
}

function formatCardLabel(card) {
  if (!card) return 'No card saved';
  return `${card.brand || 'Card'} •••• ${card.last4 || '••••'}`;
}

function formatCardExpiry(card) {
  if (!card?.expMonth || !card?.expYear) return 'Not available';
  return `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`;
}

function transactionKindMeta(kind) {
  const key = String(kind || '').toLowerCase();
  if (key.includes('topup')) {
    return { label: 'Wallet Top-up', bucket: 'topups' };
  }
  if (key.includes('restart')) {
    return { label: 'Plan Restart', bucket: 'renewals' };
  }
  if (key.includes('change')) {
    return { label: 'Plan Change', bucket: 'renewals' };
  }
  if (key.includes('new-number-plan') || key.includes('plan')) {
    return { label: 'Plan Renewal', bucket: 'renewals' };
  }
  if (key.includes('overflow') || key.includes('usage')) {
    return { label: 'Usage Charge', bucket: 'usage' };
  }
  if (key.includes('refund')) {
    return { label: 'Refund', bucket: 'credits' };
  }
  if (key.includes('save-card')) {
    return { label: 'Card Setup', bucket: 'other' };
  }
  return { label: kind || 'Wallet Transaction', bucket: 'other' };
}

function transactionStatusMeta(status) {
  const key = String(status || 'completed').toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(key)) {
    return {
      label: 'Completed',
      key: 'completed',
      className: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    };
  }
  if (['pending', 'processing'].includes(key)) {
    return {
      label: 'Pending',
      key: 'pending',
      className: 'border border-amber-500/20 bg-amber-500/10 text-amber-200',
    };
  }
  return {
    label: 'Failed',
    key: 'failed',
    className: 'border border-red-500/20 bg-red-500/10 text-red-300',
  };
}

function WalletKpiCard({ label, value, tone }) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-300'
    : tone === 'negative'
      ? 'text-red-300'
      : 'text-[var(--foreground)]';

  return (
    <div className="form-card rounded-[20px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">{label}</div>
      <div className={`mt-3 text-[28px] leading-none font-extrabold ${toneClass}`}>{value}</div>
    </div>
  );
}

function WalletActionModal({ title, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{title}</div>
            <p className="mt-1 text-sm text-[var(--body)]">
              Securely connect or replace the payment method used for wallet top-ups and automatic recharges.
            </p>
          </div>
          <button type="button" className="btn-ghost text-sm px-3 py-1.5" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function normalizePlan(plan) {
  return {
    id: plan.id,
    name: plan.label || plan.name || 'Plan',
    monthly: Number(plan.amount ?? plan.monthly ?? 0),
    yearlyPrice: Number(plan.yearlyPrice ?? Math.max(0, Math.round(Number(plan.amount ?? plan.monthly ?? 0) * 0.8))),
    minutes: Number(plan.min ?? plan.minutes ?? 0),
    agents: Number(plan.agents ?? plan.numbers ?? 0),
    perks: Array.isArray(plan.perks) ? plan.perks : [],
    description: plan.sub || plan.description || 'Voice AI coverage with included minutes and team capacity.',
    featured: Boolean(plan.featured || plan.id === 'growth'),
    href: '/dashboard/numbers',
  };
}

function ActivePlanCard({ number }) {
  const daysLeft = daysUntil(number.nextRentalAt);
  const plan = number.plan || {};
  const isStarterPlan = String(plan.id || plan.label || '').toLowerCase() === 'starter';

  return (
    <div className="form-card rounded-[20px] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[18px] font-semibold text-[var(--foreground)]">
              {plan.label || 'Active plan'}
            </div>
            <span className="pill border border-[var(--border)] bg-[var(--muted)] text-[var(--body)]">
              ${Number(plan.amount || 0)}/mo
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--body)]">
            <span className="inline-flex items-center gap-2">
              <Phone size={14} className="text-[var(--accent)]" />
              {number.value || 'Assigned number'}
            </span>
            {number.label && (
              <span className="pill border border-[var(--border)] bg-[var(--muted)] text-[var(--body)]">
                {number.label}
              </span>
            )}
          </div>
        </div>

        {!isStarterPlan && (
          <Link to="/dashboard/numbers" className="btn-ghost text-sm inline-flex items-center justify-center self-start">
            Manage plan
          </Link>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Included minutes</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{Number(plan.min || 0)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Activated</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatDate(number.activatedAt)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Next renewal</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatDate(number.nextRentalAt)}</div>
          {daysLeft != null && (
            <div className="mt-1 text-xs text-[var(--body)]">
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  const { currentUser, demoMode } = useApp();
  const [tab, setTab] = useState('my-plans');
  const [wallet, setWallet] = useState(() => readCache('billing.wallet', currentUser?.id));
  const [walletTransactions, setWalletTransactions] = useState(() => readCache('billing.walletTransactions', currentUser?.id) ?? []);
  const [numbers, setNumbers] = useState(() => readCache('billing.numbers', currentUser?.id) ?? []);
  const [plans, setPlans] = useState(() => readCache('billing.plans', currentUser?.id) ?? []);
  const [cards, setCards] = useState(() => readCache('billing.cards', currentUser?.id) ?? []);
  const [loadErr, setLoadErr] = useState('');
  const [walletFilter, setWalletFilter] = useState('all');
  const [showCardSetup, setShowCardSetup] = useState(false);

  const user = currentUser || (demoMode ? { company: 'Vozper Demo', name: 'Demo User' } : {});
  const company = user?.company || user?.name || 'Your';

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    (async () => {
      const [walletRes, numbersRes, plansRes, cardsRes] = await Promise.all([
        api('/api/wallet').catch(() => null),
        api('/api/numbers').catch(() => null),
        api('/api/plans').catch(() => null),
        api('/api/payment-methods').catch(() => null),
      ]);

      if (cancelled) return;

      if (walletRes?.wallet) {
        setWallet(walletRes.wallet);
        writeCache('billing.wallet', currentUser.id, walletRes.wallet);
      }
      if (Array.isArray(walletRes?.transactions)) {
        setWalletTransactions(walletRes.transactions);
        writeCache('billing.walletTransactions', currentUser.id, walletRes.transactions);
      }
      if (Array.isArray(numbersRes?.numbers)) {
        setNumbers(numbersRes.numbers);
        writeCache('billing.numbers', currentUser.id, numbersRes.numbers);
      }
      if (Array.isArray(plansRes?.plans)) {
        const sortedPlans = plansRes.plans.slice().sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
        setPlans(sortedPlans);
        writeCache('billing.plans', currentUser.id, sortedPlans);
      }
      if (Array.isArray(cardsRes?.cards)) {
        setCards(cardsRes.cards);
        writeCache('billing.cards', currentUser.id, cardsRes.cards);
      }

      if (!walletRes && !numbersRes && !plansRes && !cardsRes) {
        setLoadErr('Live billing data is temporarily unavailable.');
      } else {
        setLoadErr('');
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const fallbackCurrentPlan = useMemo(() => {
    if (!currentUser?.plan) return null;
    return {
      id: 'current-user-plan',
      value: currentUser?.number?.value || 'Primary line',
      label: currentUser?.agentName || '',
      activatedAt: null,
      nextRentalAt: null,
      plan: currentUser.plan,
    };
  }, [currentUser]);

  const activePlans = useMemo(() => {
    const livePlans = numbers.filter((number) => number?.plan?.id || number?.plan?.label || number?.plan?.amount);
    if (livePlans.length) return livePlans;
    return fallbackCurrentPlan ? [fallbackCurrentPlan] : [];
  }, [numbers, fallbackCurrentPlan]);

  const normalizedPlans = useMemo(() => {
    const source = plans.length ? plans : FALLBACK_PLANS;
    return source.map(normalizePlan);
  }, [plans]);

  const walletBalance = wallet?.walletUsd ?? currentUser?.walletUsd ?? 0;
  const defaultPaymentMethod = useMemo(() => {
    const primaryCard = cards.find((card) => card.isDefault) || cards[0] || null;
    return normalizeCard(primaryCard || wallet?.paymentMethod);
  }, [cards, wallet?.paymentMethod]);
  const autoRechargeEnabled = Boolean(wallet?.autoTopupEnabled || activePlans.some((plan) => plan?.autoRechargeEnabled));
  const lowBalanceThreshold = Number(wallet?.lowBalanceThreshold ?? 5);
  const showLowBalanceWarning = Boolean(wallet?.isLow || walletBalance <= lowBalanceThreshold);

  const normalizedWalletTransactions = useMemo(() => {
    if (!walletTransactions.length) return [];
    return walletTransactions.map((item) => {
      const amount = Number(item.amountUsd || 0);
      const kindMeta = transactionKindMeta(item.kind);
      const statusMeta = transactionStatusMeta(item.status);
      const isCredit = amount > 0;
      const cardLabel = item.paymentMethodId ? formatCardLabel(defaultPaymentMethod) : '—';

      return {
        id: item.id,
        kind: item.kind,
        typeLabel: kindMeta.label,
        bucket: kindMeta.bucket,
        amount,
        isCredit,
        description: item.description || kindMeta.label,
        statusLabel: statusMeta.label,
        statusKey: statusMeta.key,
        statusClassName: statusMeta.className,
        createdAt: item.createdAt,
        dateLabel: formatDate(item.createdAt),
        dateTimeLabel: formatDateTime(item.createdAt),
        paymentMethodLabel: cardLabel,
        externalRef: item.externalRef || null,
      };
    });
  }, [defaultPaymentMethod, walletTransactions]);

  const filteredWalletTransactions = useMemo(() => {
    return normalizedWalletTransactions.filter((item) => {
      if (walletFilter === 'credits') return item.amount > 0;
      if (walletFilter === 'debits') return item.amount < 0;
      if (walletFilter === 'topups') return item.bucket === 'topups';
      if (walletFilter === 'renewals') return item.bucket === 'renewals';
      if (walletFilter === 'usage') return item.bucket === 'usage';
      return true;
    });
  }, [normalizedWalletTransactions, walletFilter]);

  const walletFilterOptions = useMemo(() => {
    const counts = {
      all: normalizedWalletTransactions.length,
      credits: normalizedWalletTransactions.filter((item) => item.amount > 0).length,
      debits: normalizedWalletTransactions.filter((item) => item.amount < 0).length,
      topups: normalizedWalletTransactions.filter((item) => item.bucket === 'topups').length,
      renewals: normalizedWalletTransactions.filter((item) => item.bucket === 'renewals').length,
      usage: normalizedWalletTransactions.filter((item) => item.bucket === 'usage').length,
    };

    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'credits', label: 'Credits', count: counts.credits },
      { id: 'debits', label: 'Debits', count: counts.debits },
      { id: 'topups', label: 'Top-ups', count: counts.topups },
      { id: 'renewals', label: 'Renewals', count: counts.renewals },
      { id: 'usage', label: 'Usage Charges', count: counts.usage },
    ];
  }, [normalizedWalletTransactions]);

  const successfulWalletTransactions = useMemo(
    () => normalizedWalletTransactions.filter((item) => item.statusKey === 'completed'),
    [normalizedWalletTransactions],
  );

  const walletMetrics = useMemo(() => {
    const totalAdded = successfulWalletTransactions
      .filter((item) => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
    const totalSpent = successfulWalletTransactions
      .filter((item) => item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const lastTopUp = successfulWalletTransactions.find((item) => item.bucket === 'topups' && item.amount > 0) || null;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRows = successfulWalletTransactions.filter((item) => new Date(item.createdAt).getTime() >= monthStart.getTime());

    const monthTopUps = monthRows
      .filter((item) => item.bucket === 'topups' && item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
    const monthRenewals = monthRows
      .filter((item) => item.bucket === 'renewals' && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const monthUsage = monthRows
      .filter((item) => item.bucket === 'usage' && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return {
      totalAdded,
      totalSpent,
      lastTopUp,
      monthTopUps,
      monthRenewals,
      monthUsage,
    };
  }, [successfulWalletTransactions]);

  const subscriptionSummary = useMemo(() => {
    if (!activePlans.length) {
      return {
        currentPlan: 'No active subscription',
        monthlySpend: 0,
        includedMinutes: 0,
        activeNumbers: 0,
        nextRenewal: null,
        nextRenewalNumber: null,
      };
    }

    const labels = [...new Set(activePlans.map((item) => item.plan?.label).filter(Boolean))];
    const renewalCandidates = activePlans
      .filter((item) => item.nextRentalAt)
      .sort((left, right) => new Date(left.nextRentalAt).getTime() - new Date(right.nextRentalAt).getTime());

    return {
      currentPlan: labels.length === 1 ? labels[0] : `${activePlans.length} active plans`,
      monthlySpend: activePlans.reduce((sum, item) => sum + Number(item.plan?.amount || 0), 0),
      includedMinutes: activePlans.reduce((sum, item) => sum + Number(item.plan?.min || 0), 0),
      activeNumbers: activePlans.length,
      nextRenewal: renewalCandidates[0]?.nextRentalAt || null,
      nextRenewalNumber: renewalCandidates[0]?.value || null,
    };
  }, [activePlans]);

  const subtitle = useMemo(
    () => `${company} Voice AI - plans per number, instant upgrades, shared wallet.`,
    [company],
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3 max-w-3xl">
          <p className="text-[15px] font-semibold text-[var(--body)]">
            {subtitle}
          </p>
        </div>

        <Link
          to="/dashboard/transactions"
          className="btn-ghost text-sm inline-flex items-center justify-center self-start"
        >
          Transaction history
        </Link>
      </div>

      <div className="border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`pb-3 text-[15px] font-medium border-b-2 transition-colors ${
                tab === item.id
                  ? 'border-[var(--primary)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--body)] hover:text-[var(--foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loadErr && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadErr}
        </div>
      )}

      {tab === 'my-plans' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="space-y-4 lg:w-[260px] lg:flex-none xl:w-[296px]">
              <div className="form-card gradient-border w-full max-w-[260px] rounded-[20px] p-5 lg:max-w-[260px] xl:max-w-[296px]">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">
                  <Wallet size={14} className="text-[var(--primary)]" />
                  Shared Wallet Balance
                </div>

                <div className="mt-4 text-[52px] leading-none font-extrabold text-[var(--foreground)] xl:text-[56px]">
                  {money(walletBalance)}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <Link to="/dashboard/billing" className="btn-primary text-sm inline-flex w-full items-center justify-center px-3">+ Add funds</Link>
                  <button type="button" className="btn-ghost text-sm inline-flex w-full items-center justify-center px-3" onClick={() => setTab('auto-recharge')}>Auto-recharge</button>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:min-w-0 lg:flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Active plans</h2>
              </div>

              {activePlans.length ? (
                <div className="space-y-4">
                  {activePlans.map((number) => (
                    <ActivePlanCard key={number.id || number.value} number={number} />
                  ))}
                </div>
              ) : (
                <div className="form-card rounded-[20px] min-h-[220px] flex items-center justify-center text-center">
                  <div className="max-w-sm">
                    <div className="w-14 h-14 rounded-full bg-[var(--glow)] border border-[var(--primary)] text-[var(--primary)] flex items-center justify-center mx-auto">
                      <Sparkles size={24} />
                    </div>
                    <div className="mt-5 text-[17px] font-medium text-[var(--body)]">No active plan yet.</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                      Choose your first plan to start tracking usage, subscriptions, and billing renewals here.
                    </p>
                    <button type="button" className="btn-ghost text-sm mt-5" onClick={() => setTab('upgrade-plans')}>
                      Browse upgrade plans
                    </button>
                  </div>
                </div>
              )}
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
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Current plan</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{subscriptionSummary.currentPlan}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Monthly spend</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{money(subscriptionSummary.monthlySpend)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Included minutes</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{subscriptionSummary.includedMinutes}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Numbers on plan</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{subscriptionSummary.activeNumbers} active</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--body)]">
                This section reflects your live plan allocation, included usage, and current monthly subscription footprint.
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
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{formatDate(subscriptionSummary.nextRenewal)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Renewal line</div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">{subscriptionSummary.nextRenewalNumber || 'No renewal scheduled'}</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--body)]">
                Renewal dates and upcoming refresh timing come directly from your active number plans, so this area updates when your live subscription changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'upgrade-plans' && (
        <BillingUpgradePlans
          plans={normalizedPlans}
          hasActivePlans={activePlans.length > 0}
          helperMessage={
            activePlans.length
              ? ''
              : 'Pick the plan that best matches your expected call volume and we will guide you into your first active setup.'
          }
        />
      )}

      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WalletKpiCard label="Available Balance" value={money(walletBalance, 2)} />
            <WalletKpiCard label="Total Added" value={money(walletMetrics.totalAdded, 2)} tone="positive" />
            <WalletKpiCard label="Total Spent" value={money(walletMetrics.totalSpent, 2)} tone="negative" />
            <WalletKpiCard label="Last Top-up" value={walletMetrics.lastTopUp ? formatDate(walletMetrics.lastTopUp.createdAt) : '—'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,_1fr)]">
            <div className="space-y-5">
              <div className="form-card gradient-border rounded-[20px]">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Current Balance</div>
                <div className="mt-4 text-[48px] leading-none font-extrabold text-[var(--foreground)]">
                  {money(walletBalance, 2)}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--body)]">
                  Shared across plan renewals, restarts, and overflow charges on active numbers.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/dashboard/billing" className="btn-primary text-sm inline-flex items-center justify-center">+ Add funds</Link>
                  <button type="button" className="btn-ghost text-sm" onClick={() => setTab('auto-recharge')}>Auto-recharge</button>
                </div>
              </div>

              <div className="form-card rounded-[20px]">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">
                  <CreditCard size={14} className="text-[var(--accent)]" />
                  Default Payment Method
                </div>

                {defaultPaymentMethod ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Card</div>
                        <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">{defaultPaymentMethod.brand}</div>
                        <div className="mt-1 text-xs text-[var(--body)]">•••• {defaultPaymentMethod.last4}</div>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Expires</div>
                        <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">{formatCardExpiry(defaultPaymentMethod)}</div>
                        <div className="mt-1 text-xs text-[var(--body)]">Default payment method</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--body)] font-semibold">Auto Recharge</div>
                      <div className="mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                        <span className={autoRechargeEnabled ? 'text-emerald-300' : 'text-[var(--body)]'}>
                          {autoRechargeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="btn-ghost text-sm" onClick={() => setShowCardSetup(true)}>Change Card</button>
                      <button type="button" className="btn-primary text-sm" onClick={() => setShowCardSetup(true)}>Add New Card</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)] px-5 py-6 text-center">
                    <div className="text-sm font-semibold text-[var(--foreground)]">No payment method configured</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                      Add a card to make wallet top-ups faster and to support auto recharge when your balance gets low.
                    </p>
                    <button type="button" className="btn-primary text-sm mt-4" onClick={() => setShowCardSetup(true)}>Add New Card</button>
                  </div>
                )}
              </div>

            </div>

            <div className="form-card rounded-[20px] p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-[var(--foreground)]">Wallet History</div>
                    <p className="mt-1 text-sm text-[var(--body)]">
                      Real wallet transactions, including top-ups, renewals, and usage charges.
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-[0.12em] text-[var(--body)] font-semibold">
                    {filteredWalletTransactions.length} visible
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {walletFilterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setWalletFilter(option.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        walletFilter === option.id
                          ? 'border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]'
                          : 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {option.label} ({option.count})
                    </button>
                  ))}
                </div>
              </div>

              {normalizedWalletTransactions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--glow)] text-[var(--primary)]">
                    <CreditCard size={26} />
                  </div>
                  <div className="mt-5 text-lg font-semibold text-[var(--foreground)]">Your Wallet is Empty</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                    Add funds to purchase plans or cover overflow minutes. Once wallet activity starts, transactions will appear here automatically.
                  </p>
                  <Link to="/dashboard/billing" className="btn-primary text-sm mt-5 inline-flex items-center justify-center">Add Funds</Link>
                </div>
              ) : filteredWalletTransactions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="text-lg font-semibold text-[var(--foreground)]">No transactions match this filter</div>
                  <p className="mt-2 text-sm text-[var(--body)]">
                    Try another transaction type to see more wallet activity.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--body)]">
                        <th className="px-6 py-4 font-semibold">Transaction</th>
                        <th className="px-4 py-4 font-semibold">Amount</th>
                        <th className="px-4 py-4 font-semibold">Status</th>
                        <th className="px-4 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWalletTransactions.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/60 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <div className="font-semibold text-[var(--foreground)]">{item.typeLabel}</div>
                            <div className="mt-1 text-xs leading-5 text-[var(--body)]">{item.description}</div>
                          </td>
                          <td className={`px-4 py-4 align-top font-semibold ${item.isCredit ? 'text-emerald-300' : 'text-red-300'}`}>
                            {item.isCredit ? '+' : '−'}{money(Math.abs(item.amount), 2)}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.statusClassName}`}>
                              {item.statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-[var(--body)]">
                            <div>{item.dateLabel}</div>
                            <div className="mt-1 text-xs">{item.dateTimeLabel}</div>
                          </td>
                          <td className="px-6 py-4 align-top text-[var(--body)]">
                            <div>{item.paymentMethodLabel}</div>
                            {item.externalRef && <div className="mt-1 text-xs">Ref: {item.externalRef}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'auto-recharge' && (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,_1fr)]">
          <div className="form-card rounded-[20px]">
            <div className="text-lg font-semibold text-[var(--foreground)]">Auto-recharge</div>
            <p className="mt-2 text-sm text-[var(--body)]">
              Keep the wallet ready before renewals and overflow usage hit.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">Recharge when wallet drops below</label>
                <input className="input" value="$20" readOnly />
              </div>
              <div>
                <label className="field-label">Top-up amount</label>
                <input className="input" value="$50" readOnly />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn-primary text-sm">Enable auto-recharge</button>
              <button type="button" className="btn-ghost text-sm">Change card</button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="form-card rounded-[20px]">
              <div className="text-lg font-semibold text-[var(--foreground)]">How it works</div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--glow)] border border-[var(--primary)] text-[var(--primary)] flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-[var(--foreground)]">Watch balance</div>
                  <div className="mt-2 text-xs leading-5 text-[var(--body)]">Monitor the shared wallet before a renewal or usage event fails.</div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--glow)] border border-[var(--primary)] text-[var(--primary)] flex items-center justify-center">
                    <CreditCard size={18} />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-[var(--foreground)]">Charge card</div>
                  <div className="mt-2 text-xs leading-5 text-[var(--body)]">Use your saved payment method to top up the wallet automatically.</div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--glow)] border border-[var(--primary)] text-[var(--primary)] flex items-center justify-center">
                    <RefreshCw size={18} />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-[var(--foreground)]">Stay live</div>
                  <div className="mt-2 text-xs leading-5 text-[var(--body)]">Keep plans and overflow usage moving without manual wallet top-ups.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCardSetup && (
        <WalletActionModal title={defaultPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'} onClose={() => setShowCardSetup(false)}>
          <AddCardForm onCancel={() => setShowCardSetup(false)} />
        </WalletActionModal>
      )}
    </div>
  );
}
