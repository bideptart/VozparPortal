import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  Phone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { readCache, writeCache } from '../../utils/swrCache.js';
import AddCardForm from '../../components/AddCardForm.jsx';
import BillingUpgradePlans from '@/components/ui/billing-upgrade-plans';
import { DEFAULT_PUBLIC_PLANS } from '@/lib/public-plan-catalog';
import { AddNumberModal } from './Numbers.jsx';
import { Switch } from '@/components/ui/switch';

const TABS = [
  { id: 'my-plans', label: 'My Plans' },
  { id: 'upgrade-plans', label: 'Upgrade Plans' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'auto-recharge', label: 'Auto-recharge' },
];

const FALLBACK_PLANS = DEFAULT_PUBLIC_PLANS;

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

function WalletActionModal({ title, onClose, children, subtitle }) {
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

  if (typeof document === 'undefined') return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ top: 0, left: 0, width: '100vw', height: '100vh', position: 'fixed' }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <div
        className="absolute w-full max-w-md p-4"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
          style={{ position: 'relative' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--foreground)]">{title}</div>
              {subtitle ? (
                <p className="mt-1 text-sm text-[var(--body)]">{subtitle}</p>
              ) : null}
            </div>
            <button type="button" className="btn-ghost text-sm px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

let razorpayLoader;
function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is unavailable'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Could not load Razorpay'));
    document.head.appendChild(script);
  });

  return razorpayLoader;
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
  const [packs, setPacks] = useState(() => readCache('billing.packs', currentUser?.id) ?? []);
  const [loadErr, setLoadErr] = useState('');
  const [walletFilter, setWalletFilter] = useState('all');
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [walletThresholdDraft, setWalletThresholdDraft] = useState(20);
  const [walletThresholdBusy, setWalletThresholdBusy] = useState(false);
  const [walletThresholdNotice, setWalletThresholdNotice] = useState('');
  const [selectedTopupAmount, setSelectedTopupAmount] = useState(10);
  const [customTopupAmount, setCustomTopupAmount] = useState('10');
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupErr, setTopupErr] = useState('');
  const [autoRechargeSavingIds, setAutoRechargeSavingIds] = useState({});
  const [autoRechargePlanNotice, setAutoRechargePlanNotice] = useState('');
  const [autoTopupDraftEnabled, setAutoTopupDraftEnabled] = useState(false);
  const [autoTopupThresholdDraft, setAutoTopupThresholdDraft] = useState(20);
  const [autoTopupAmountDraft, setAutoTopupAmountDraft] = useState(50);
  const [autoTopupSaving, setAutoTopupSaving] = useState(false);
  const [autoTopupNotice, setAutoTopupNotice] = useState({ type: '', text: '' });
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [selectedUpgradePlanId, setSelectedUpgradePlanId] = useState(null);

  const user = currentUser || (demoMode ? { company: 'Vozper Demo', name: 'Demo User' } : {});
  const company = user?.company || user?.name || 'Your';

  const loadBillingData = async (userId) => {
    const [walletRes, numbersRes, plansRes, cardsRes, packsRes] = await Promise.all([
      api('/api/wallet').catch(() => null),
      api('/api/numbers').catch(() => null),
      api('/api/plans').catch(() => null),
      api('/api/payment-methods').catch(() => null),
      api('/api/wallet/packs').catch(() => null),
    ]);

    if (walletRes?.wallet) {
      setWallet(walletRes.wallet);
      writeCache('billing.wallet', userId, walletRes.wallet);
    }
    if (Array.isArray(walletRes?.transactions)) {
      setWalletTransactions(walletRes.transactions);
      writeCache('billing.walletTransactions', userId, walletRes.transactions);
    }
    if (Array.isArray(numbersRes?.numbers)) {
      setNumbers(numbersRes.numbers);
      writeCache('billing.numbers', userId, numbersRes.numbers);
    }
    if (Array.isArray(plansRes?.plans)) {
      const sortedPlans = plansRes.plans.slice().sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
      setPlans(sortedPlans);
      writeCache('billing.plans', userId, sortedPlans);
    }
    if (Array.isArray(cardsRes?.cards)) {
      setCards(cardsRes.cards);
      writeCache('billing.cards', userId, cardsRes.cards);
    }
    if (Array.isArray(packsRes?.packs)) {
      setPacks(packsRes.packs);
      writeCache('billing.packs', userId, packsRes.packs);
    }

    if (!walletRes && !numbersRes && !plansRes && !cardsRes && !packsRes) {
      setLoadErr('Live billing data is temporarily unavailable.');
    } else {
      setLoadErr('');
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    (async () => {
      await loadBillingData(currentUser.id);
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
  const walletAutoRechargeEnabled = Boolean(wallet?.autoTopupEnabled);
  const autoRechargeEnabled = Boolean(walletAutoRechargeEnabled || activePlans.some((plan) => plan?.autoRechargeEnabled));
  const lowBalanceThreshold = Number(wallet?.lowBalanceThreshold ?? 20);
  const configuredAutoTopupAmount = Number(wallet?.autoTopupPackUsd ?? 50);
  const showLowBalanceWarning = Boolean(wallet?.isLow || walletBalance <= lowBalanceThreshold);

  useEffect(() => {
    setAutoTopupDraftEnabled(walletAutoRechargeEnabled);
    setAutoTopupThresholdDraft(lowBalanceThreshold);
    setAutoTopupAmountDraft(configuredAutoTopupAmount);
  }, [configuredAutoTopupAmount, lowBalanceThreshold, walletAutoRechargeEnabled]);

  useEffect(() => {
    setWalletThresholdDraft(lowBalanceThreshold);
  }, [lowBalanceThreshold]);

  const walletPresetAmounts = [5, 10, 20, 50];

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
        minutesDelta: Number(item.minutesDelta ?? item.minutes_delta ?? 0),
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

  const autoRechargePlans = useMemo(() => {
    return activePlans.map((number) => ({
      ...number,
      displayName: number.agentName || number.label || `${number.plan?.label || 'Starter'} Agent`,
      statusLabel: number.autoRechargeEnabled ? 'ON' : 'OFF',
    }));
  }, [activePlans]);

  const autoRechargeOffCount = autoRechargePlans.filter((plan) => !plan.autoRechargeEnabled).length;

  const togglePlanAutoRecharge = async (number, enabled) => {
    if (enabled && !defaultPaymentMethod) {
      setAutoRechargePlanNotice('Add a saved card before turning auto-recharge on.');
      setShowCardSetup(true);
      return;
    }

    setAutoRechargePlanNotice('');
    setAutoRechargeSavingIds((current) => ({ ...current, [number.id]: true }));

    try {
      const response = await api(`/api/numbers/${number.id}`, {
        method: 'PATCH',
        body: { autoRechargeEnabled: enabled },
      });
      const nextNumber = response?.number;
      if (nextNumber) {
        setNumbers((current) => current.map((item) => (String(item.id) === String(number.id) ? nextNumber : item)));
      } else {
        setNumbers((current) => current.map((item) => (
          String(item.id) === String(number.id) ? { ...item, autoRechargeEnabled: enabled } : item
        )));
      }
    } catch (error) {
      setAutoRechargePlanNotice(error.message || 'Could not update auto-recharge for this plan.');
    } finally {
      setAutoRechargeSavingIds((current) => {
        const next = { ...current };
        delete next[number.id];
        return next;
      });
    }
  };

  const customTopupAmountInt = Math.max(0, Math.floor(Number(customTopupAmount) || 0));
  const finalTopupAmount = customTopupAmountInt > 0 ? customTopupAmountInt : Number(selectedTopupAmount || 0);

  const saveWalletThreshold = async () => {
    setWalletThresholdBusy(true);
    setWalletThresholdNotice('');

    try {
      await api('/api/wallet/preferences', {
        method: 'PATCH',
        body: { lowBalanceThreshold: Number(walletThresholdDraft) || 0 },
      });

      const nextWallet = {
        ...(wallet || {}),
        lowBalanceThreshold: Number(walletThresholdDraft) || 0,
      };
      setWallet(nextWallet);
      if (currentUser?.id) writeCache('billing.wallet', currentUser.id, nextWallet);
      setAutoTopupThresholdDraft(Number(walletThresholdDraft) || 0);
      setWalletThresholdNotice('Saved');
    } catch (error) {
      setWalletThresholdNotice(error.message || 'Could not save');
    } finally {
      setWalletThresholdBusy(false);
    }
  };

  const addWalletFunds = async (opts = {}) => {
    if (!finalTopupAmount) return;

    setTopupBusy(true);
    setTopupErr('');

    try {
      const body = { customAmount: finalTopupAmount };
      const order = await api('/api/razorpay/order/topup', { method: 'POST', body });
      const Razorpay = await loadRazorpay();

      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Vozper',
        description: `Wallet top-up · ${money(order.pack.amount, 0)}`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#046BD2' },
        handler: async (response) => {
          try {
            await api('/api/razorpay/verify/topup', {
              method: 'POST',
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packId: order.pack.id,
              },
            });
            setCustomTopupAmount('');
            if (opts?.closeOnSuccess !== false) setShowAddFunds(false);
            if (currentUser?.id) await loadBillingData(currentUser.id);
          } catch (error) {
            setTopupErr(error.message || 'Payment succeeded but the wallet could not be updated.');
          } finally {
            setTopupBusy(false);
          }
        },
        modal: { ondismiss: () => setTopupBusy(false) },
      });

      rzp.on('payment.failed', (response) => {
        setTopupErr(response.error?.description || 'Payment failed');
        setTopupBusy(false);
      });

      rzp.open();
    } catch (error) {
      setTopupErr(error.message || 'Could not open Razorpay');
      setTopupBusy(false);
    }
  };

  const sanitizedAutoTopupThreshold = Math.max(0, Number(autoTopupThresholdDraft) || 0);
  const sanitizedAutoTopupAmount = Math.max(0, Number(autoTopupAmountDraft) || 0);
  const previewWillRecharge = autoTopupDraftEnabled && sanitizedAutoTopupAmount > 0 && Number(walletBalance) < sanitizedAutoTopupThreshold;
  const previewNewBalance = Number(walletBalance || 0) + sanitizedAutoTopupAmount;
  const autoTopupStatusText = autoTopupDraftEnabled ? 'Enabled' : 'Disabled';
  const autoTopupStatusTone = autoTopupDraftEnabled ? 'text-emerald-300' : 'text-[var(--body)]';
  const autoTopupStatusExplanation = autoTopupDraftEnabled
    ? `Automatically tops up your wallet whenever the balance drops below ${money(sanitizedAutoTopupThreshold, 0)}.`
    : 'Auto Recharge is currently off, so wallet top-ups will need to be added manually.';
  const autoTopupSaveLabel = walletAutoRechargeEnabled || !autoTopupDraftEnabled
    ? 'Save Changes'
    : 'Save & Enable Auto Recharge';

  const resetAutoTopupDraft = () => {
    setAutoTopupDraftEnabled(walletAutoRechargeEnabled);
    setAutoTopupThresholdDraft(lowBalanceThreshold);
    setAutoTopupAmountDraft(configuredAutoTopupAmount);
    setAutoTopupNotice({ type: '', text: '' });
  };

  const saveAutoTopupPreferences = async () => {
    if (autoTopupDraftEnabled && !defaultPaymentMethod) {
      setAutoTopupNotice({ type: 'error', text: 'Add a payment method before enabling Auto Recharge.' });
      return;
    }

    setAutoTopupSaving(true);
    setAutoTopupNotice({ type: '', text: '' });

    try {
      const body = {
        lowBalanceThreshold: sanitizedAutoTopupThreshold,
        autoTopupEnabled: autoTopupDraftEnabled,
        autoTopupPackUsd: sanitizedAutoTopupAmount,
      };

      if (wallet?.autoTopupPackMin !== undefined) {
        body.autoTopupPackMin = Number(wallet.autoTopupPackMin) || 0;
      }

      await api('/api/wallet/preferences', { method: 'PATCH', body });

      const nextWallet = {
        ...(wallet || {}),
        lowBalanceThreshold: sanitizedAutoTopupThreshold,
        autoTopupEnabled: autoTopupDraftEnabled,
        autoTopupPackUsd: sanitizedAutoTopupAmount,
      };

      setWallet(nextWallet);
      if (currentUser?.id) writeCache('billing.wallet', currentUser.id, nextWallet);
      setAutoTopupNotice({ type: 'success', text: autoTopupDraftEnabled ? 'Auto Recharge settings saved.' : 'Auto Recharge has been updated.' });
    } catch (error) {
      setAutoTopupNotice({ type: 'error', text: error.message || 'Could not save Auto Recharge settings.' });
    } finally {
      setAutoTopupSaving(false);
    }
  };

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
          className="btn-ghost text-sm inline-flex items-center justify-center self-start hover:!border-[rgba(4,107,210,0.28)] hover:!bg-[var(--primary)] hover:!text-white hover:!shadow-[0_12px_28px_-18px_var(--glow-strong)]"
        >
          Transaction history
        </Link>
      </div>

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

      {loadErr && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadErr}
        </div>
      )}

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
                    className="text-sm inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-3 font-semibold transition-all border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.28)] hover:bg-[var(--primary)] hover:text-white hover:shadow-[0_12px_28px_-18px_var(--glow-strong)]"
                    onClick={() => setShowAddFunds(true)}
                  >
                    + Add funds
                  </button>
                  <button
                    type="button"
                    className={`text-sm inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-3 font-semibold transition-all ${
                      tab === 'auto-recharge'
                        ? 'border border-[rgba(4,107,210,0.28)] bg-[var(--primary)] text-white shadow-[0_12px_28px_-18px_var(--glow-strong)]'
                        : 'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.28)] hover:bg-[var(--primary)] hover:text-white hover:shadow-[0_12px_28px_-18px_var(--glow-strong)]'
                    }`}
                    onClick={() => setTab('auto-recharge')}
                  >
                    Auto-recharge
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:min-w-0 lg:flex-1">
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
          onPlanSelect={(plan) => {
            setSelectedUpgradePlanId(plan.id || null);
            setShowAddPlan(true);
          }}
        />
      )}

      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,_1fr)]">
            <div className="space-y-5">
              <div className="form-card gradient-border flex min-h-[156px] flex-col justify-between rounded-[20px] bg-[linear-gradient(180deg,rgba(4,107,210,0.24),rgba(4,107,210,0.08))]">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--body)] font-semibold">Current Balance</div>
                  <div className="mt-4 text-[44px] leading-none font-extrabold text-[var(--foreground)]">
                    {money(walletBalance)}
                  </div>
                </div>
                <p className="mt-3 max-w-[220px] text-sm leading-6 text-[var(--body)]">
                  Used as backup when a number&apos;s plan minutes run out.
                </p>
              </div>

              <div className="form-card min-h-[152px] rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Low-minutes alert</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  We&apos;ll warn you on the dashboard and by email when your remaining minutes drop to this level.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[110px]">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input w-full pr-3 text-center"
                      value={walletThresholdDraft}
                      onChange={(event) => setWalletThresholdDraft(event.target.value)}
                      disabled={walletThresholdBusy}
                    />
                  </div>
                  <span className="text-sm text-[var(--body)]">minutes left</span>
                  <button
                    type="button"
                    className="btn-primary text-sm sm:ml-auto"
                    onClick={saveWalletThreshold}
                    disabled={walletThresholdBusy}
                  >
                    {walletThresholdBusy ? 'Saving…' : 'Save'}
                  </button>
                </div>

                {walletThresholdNotice && (
                  <div className="mt-3 text-xs text-[var(--body)]">{walletThresholdNotice}</div>
                )}
              </div>

              <div className="form-card rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Add funds</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  Pay-per-minute backup for when plan minutes run out.
                </p>

                <div className="mt-5 grid grid-cols-4 gap-2.5">
                  {walletPresetAmounts.map((amount) => {
                    const isSelected = customTopupAmountInt === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => { setSelectedTopupAmount(amount); setCustomTopupAmount(String(amount)); }}
                        disabled={topupBusy}
                        className={`flex h-14 w-full items-center justify-center rounded-2xl border px-2 text-center transition ${
                          isSelected
                            ? 'border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[var(--primary)]'
                        }`}
                      >
                        <div className="text-[15px] font-semibold tabular-nums sm:text-lg">{money(amount, 0)}</div>
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
                    value={customTopupAmount}
                    onChange={(event) => setCustomTopupAmount(event.target.value)}
                    disabled={topupBusy}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold"
                  onClick={addWalletFunds}
                  disabled={topupBusy || !finalTopupAmount}
                >
                  {topupBusy ? 'Opening Razorpay…' : `Add ${money(finalTopupAmount, 0)} to wallet`}
                </button>

                {topupErr && (
                  <div className="mt-3 text-xs text-red-300">{topupErr}</div>
                )}

                <div className="mt-3 text-xs text-[var(--body)]">
                  Wallet funds never expire and are shared across all your numbers.
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="form-card min-h-[156px] rounded-[20px]">
                <div className="text-lg font-semibold text-[var(--foreground)]">Payment method</div>

                {defaultPaymentMethod ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--foreground)]">{formatCardLabel(defaultPaymentMethod)}</div>
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                            Verified
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-[var(--body)]">Expires {formatCardExpiry(defaultPaymentMethod)}</div>
                      </div>

                      <button type="button" className="btn-ghost text-sm self-start" onClick={() => setShowCardSetup(true)}>
                        Change Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)] px-5 py-6 text-center">
                    <p className="max-w-[420px] text-sm leading-6 text-[var(--body)]">
                      No card on file yet. Save one to enable auto-recharge.
                    </p>
                    <button type="button" className="btn-primary text-sm mt-4" onClick={() => setShowCardSetup(true)}>+ Add payment method</button>
                  </div>
                )}
              </div>

              <div className="form-card min-h-[296px] rounded-[20px] p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--border)]">
                  <div className="text-lg font-semibold text-[var(--foreground)]">Wallet history</div>
                </div>

                {normalizedWalletTransactions.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="text-lg font-semibold text-[var(--foreground)]">No wallet transactions yet</div>
                    <p className="mt-2 text-sm text-[var(--body)]">
                      Top-ups, renewals, and usage charges will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--body)]">
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-4 py-4 font-semibold">Description</th>
                          <th className="px-4 py-4 font-semibold">Minutes</th>
                          <th className="px-6 py-4 font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedWalletTransactions.map((item) => (
                          <tr key={item.id} className="border-t border-[var(--border)]">
                            <td className="px-6 py-4 align-top text-[var(--body)]">
                              <div>{item.dateLabel}</div>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="font-semibold text-[var(--foreground)]">{item.description}</div>
                            </td>
                            <td className="px-4 py-4 align-top text-[var(--body)]">
                              {item.minutesDelta ? `${item.minutesDelta > 0 ? '+' : ''}${item.minutesDelta}` : '—'}
                            </td>
                            <td className={`px-6 py-4 align-top font-semibold ${item.isCredit ? 'text-emerald-300' : 'text-red-300'}`}>
                              {item.isCredit ? '+' : '−'}{money(Math.abs(item.amount), 2)}
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
                    Turn auto-recharge on for the plans you want topped up automatically. We&apos;ll use your saved card before interruptions hit your calls.
                  </p>
                </div>
                <span className="pill border border-[var(--border)] bg-[var(--muted)] text-[var(--body)]">
                  {autoRechargeOffCount} OFF
                </span>
              </div>

              {autoRechargePlanNotice && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {autoRechargePlanNotice}
                </div>
              )}

              <div className="mt-6 space-y-4 xl:max-w-[760px]">
                {autoRechargePlans.length === 0 ? (
                  <div className="form-card rounded-[20px] text-center">
                    <div className="text-lg font-semibold text-[var(--foreground)]">No plans yet</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                      Add your first plan before enabling auto-recharge.
                    </p>
                  </div>
                ) : (
                  autoRechargePlans.map((number) => {
                    const isSaving = Boolean(autoRechargeSavingIds[number.id]);
                    return (
                      <div key={number.id} className="form-card rounded-[20px]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/18 text-base font-bold text-[var(--primary)]">
                              {String(number.displayName || number.plan?.label || 'A').charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold text-[var(--foreground)]">{number.displayName}</div>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                  number.autoRechargeEnabled
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]'
                                }`}>
                                  {number.statusLabel}
                                </span>
                              </div>

                              <div className="mt-1 inline-flex items-center gap-2 text-sm text-[var(--primary)]">
                                <Phone size={14} />
                                <span>{number.value || 'Primary line'}</span>
                              </div>

                              <div className="mt-2 text-sm text-[var(--body)]">
                                {money(number.plan?.amount || 0)}/mo · {number.plan?.label || 'Starter'} plan
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-start md:pl-4">
                            <Switch
                              checked={Boolean(number.autoRechargeEnabled)}
                              onCheckedChange={(checked) => togglePlanAutoRecharge(number, checked)}
                              disabled={isSaving}
                            />
                            <span className="min-w-[28px] text-sm font-semibold text-[var(--foreground)]">
                              {number.autoRechargeEnabled ? 'On' : 'Off'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--body)]">
                          {number.autoRechargeEnabled
                            ? `This plan will recharge automatically using ${defaultPaymentMethod ? formatCardLabel(defaultPaymentMethod) : 'your saved card'}.`
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

                {defaultPaymentMethod ? (
                  <>
                    <div className="mt-4 text-lg font-semibold text-[var(--foreground)]">{formatCardLabel(defaultPaymentMethod)}</div>
                    <div className="mt-2 text-sm text-[var(--body)]">Expires {formatCardExpiry(defaultPaymentMethod)}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--body)]">
                      Auto-recharge uses this saved card so the wallet can top up without interrupting calls.
                    </div>
                    <button type="button" className="btn-primary text-sm mt-5 inline-flex w-full items-center justify-center" onClick={() => setShowCardSetup(true)}>
                      Change card
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mt-4 text-sm leading-7 text-[var(--foreground)]">
                      No card on file. Auto-recharge needs a saved card so we can top up without interrupting calls.
                    </div>
                    <button type="button" className="btn-primary text-sm mt-5 inline-flex w-full items-center justify-center" onClick={() => setShowCardSetup(true)}>
                      + Save a card
                    </button>
                  </>
                )}
              </div>

              <div className="form-card rounded-[20px] border-[var(--primary)]/25">
                <div className="text-lg font-semibold text-[var(--foreground)]">How it works</div>
                <p className="mt-3 text-sm leading-6 text-[var(--body)]">
                  When a plan you&apos;ve enabled runs out of minutes, we use the saved card for that plan&apos;s recharge flow so calls keep going without manual intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCardSetup && (
        <WalletActionModal
          title={defaultPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
          subtitle="Securely connect or replace the payment method used for wallet top-ups and automatic recharges."
          onClose={() => setShowCardSetup(false)}
        >
          <AddCardForm onCancel={() => setShowCardSetup(false)} />
        </WalletActionModal>
      )}

      {showAddFunds && (
        <WalletActionModal
          title="Add funds to wallet"
          subtitle="Pay-per-minute backup for when plan minutes run out. Wallet funds never expire and are shared across all your numbers."
          onClose={() => setShowAddFunds(false)}
        >
          <div className="grid grid-cols-4 gap-2.5">
            {walletPresetAmounts.map((amount) => {
              const isSelected = customTopupAmountInt === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => { setSelectedTopupAmount(amount); setCustomTopupAmount(String(amount)); }}
                  disabled={topupBusy}
                  className={`flex h-14 w-full items-center justify-center rounded-2xl border px-2 text-center transition ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--glow)] text-[var(--foreground)]'
                      : 'border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  <div className="text-[15px] font-semibold tabular-nums sm:text-lg">{money(amount, 0)}</div>
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
              value={customTopupAmount}
              onChange={(event) => setCustomTopupAmount(event.target.value)}
              disabled={topupBusy}
            />
          </div>

          <button
            type="button"
            className="btn-primary mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold"
            onClick={() => addWalletFunds({ closeOnSuccess: true })}
            disabled={topupBusy || !finalTopupAmount}
          >
            {topupBusy ? 'Opening Razorpay…' : `Add ${money(finalTopupAmount, 0)} to wallet`}
          </button>

          {topupErr && (
            <div className="mt-3 text-xs text-red-300">{topupErr}</div>
          )}

          <div className="mt-3 text-xs text-[var(--body)]">
            Wallet funds never expire and are shared across all your numbers.
          </div>
        </WalletActionModal>
      )}

      {showAddPlan && (
        <AddNumberModal
          currentUser={currentUser}
          initialPlanId={selectedUpgradePlanId}
          onClose={() => {
            setShowAddPlan(false);
            setSelectedUpgradePlanId(null);
          }}
          onAdded={() => {
            setShowAddPlan(false);
            setSelectedUpgradePlanId(null);
          }}
        />
      )}
    </div>
  );
}
