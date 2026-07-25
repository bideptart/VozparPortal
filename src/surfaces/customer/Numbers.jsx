import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { readCache, writeCache } from '../../utils/swrCache.js';

// Stripe Checkout loader — duplicated from Billing.jsx so the per-number
// plan-change dropdown can open the same payment modal without forcing the
// customer to navigate elsewhere. The module-level _rzpLoad cache keeps a
// single <script> injection across both pages within a session.
let _rzpLoad;
function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (_rzpLoad) return _rzpLoad;
  _rzpLoad = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.stripe.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(window.Stripe);
    s.onerror = () => reject(new Error('Could not load Stripe'));
    document.head.appendChild(s);
  });
  return _rzpLoad;
}

const inr = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

// Light polling while any number is mid-provisioning — flips ready/failed in
// the UI without a full reload.
const POLL_INTERVAL_MS = 4000;

// Per-number plan tiers — kept in sync with server/plans.js. The plan id
// drives backend validation; the pill gives each tier a distinct accent.
const PLAN_OPTIONS = [
  { id: 'starter', label: 'Starter', pill: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  { id: 'growth',  label: 'Growth',  pill: 'bg-lime-100 text-lime-700 dark:bg-lime-500/30 dark:text-lime-200' },
  { id: 'scale',   label: 'Scale',   pill: 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200' },
];
const FALLBACK_ADD_NUMBER_PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    amount: 29,
    min: 250,
    rate: 12,
    agents: 2,
    sub: 'For lean teams starting with one live AI line.',
    perks: [
      '2 AI voice agents',
      '250 included minutes',
      '$12/min effective rate',
      'Inbound calling',
      'Per-second billing',
      'Standard voice stack',
      'Call recording',
      'Real-time transcription',
      'Email support',
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    amount: 79,
    min: 800,
    rate: 11,
    agents: 10,
    sub: 'For teams that need more coverage and more automation.',
    perks: [
      '10 AI voice agents',
      '800 included minutes',
      '$11/min effective rate',
      'Inbound calling',
      'Per-second billing',
      'Standard + premium voices',
      'Call recording',
      'Real-time transcription',
      'Priority support',
    ],
  },
  {
    id: 'scale',
    label: 'Scale',
    amount: 199,
    min: 3000,
    rate: 10,
    agents: 999,
    sub: 'For high-volume teams that need scale and priority help.',
    perks: [
      'Unlimited AI voice agents',
      '3,000 included minutes',
      '$10/min effective rate',
      'Inbound calling',
      'Per-second billing',
      'Realtime + premium voices',
      'Call recording',
      'Real-time transcription',
      'Dedicated success manager + SLA',
    ],
  },
];
const planPillClass = (id) => (PLAN_OPTIONS.find((p) => p.id === id) || PLAN_OPTIONS[0]).pill;

// Plan-card header band — green like the "+ Add plan / number" button
const planHeaderClass = () =>
  'bg-lime-600';

const StatusBadge = ({ status }) => {
  const map = {
    ready:       { cls: 'bg-lime-100 text-lime-700',     label: '● Live' },
    in_progress: { cls: 'bg-amber-500/20 text-amber-600', label: '⏳ Provisioning' },
    failed:      { cls: 'bg-red-500/20 text-red-600',     label: '✗ Failed' },
  };
  const s = map[status] || { cls: 'bg-slate-300/40 text-slate-600', label: status || 'unprovisioned' };
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
};

export default function Numbers() {
  const { currentUser } = useApp();
  const [data, setData] = useState(() => readCache('numbers.list', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [changePlanFor, setChangePlanFor] = useState(null);   // number row being upgraded

  const load = async () => {
    try {
      const r = await api('/api/numbers');
      setData(r);
      writeCache('numbers.list', currentUser?.id, r);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!data?.numbers?.some((n) => n.status === 'in_progress')) return;
    const t = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [data]);

  const deleteNumber = async (n) => {
    if (!confirm(`Release ${n.value}? Calls to this number will stop immediately.`)) return;
    try {
      await api(`/api/numbers/${n.id}`, { method: 'DELETE' });
      setActionMsg(`✓ ${n.value} released`);
      await load();
    } catch (e) {
      setActionMsg(`✗ ${e.message}`);
    }
  };

  if (!currentUser) return null;
  if (err) {
    return (
      <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-500">
        Couldn't load numbers: {err}
      </div>
    );
  }
  if (!data) return <div className="text-mute">Loading…</div>;

  const { numbers } = data;

  return (
    <div>
      {/* "Plan and Numbers" title now lives in the sticky top bar instead of here. */}
      {actionMsg && (
        <div className="mt-3 text-xs text-mute">{actionMsg}</div>
      )}

      <div className="mt-6 space-y-3">
        {numbers.length === 0 && (
          <div className="form-card text-center text-mute">
            No plans yet — click "Add plan" to buy your first plan + number.
          </div>
        )}
        {numbers.map((n) => (
          <div key={n.id} className="form-card overflow-hidden p-0">
            {/* ===== Plan-name header band ============================
                Plan tier is the first thing the customer sees on the
                card, with a brand colour stripe matching the tier. */}
            <div className={`px-5 py-3 ${planHeaderClass()} flex items-center justify-between gap-3 flex-wrap`}>
              <div className="flex items-center gap-2 flex-wrap text-white">
                <span className="text-base sm:text-lg font-bold">⭐ {n.plan?.label || 'Starter'} plan</span>
                <span className="text-sm opacity-90">· {inr(n.plan?.amount || 0)}/mo</span>
              </div>
              <button
                onClick={() => setChangePlanFor(n)}
                className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold transition shadow-sm"
              >
                Change plan
              </button>
            </div>

            {/* ===== Body ============================================ */}
            <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-mono text-lg text-slate-900">{n.value}</div>
                  {n.label && (
                    <span className="pill bg-lime-100 text-lime-700 text-xs">
                      🏷 {n.label}
                    </span>
                  )}
                  <StatusBadge status={n.status} />
                </div>
                {n.error && (
                  <div className="text-xs text-red-500 mt-1">⚠ {n.error}</div>
                )}
                <NumberRentalLine n={n} />
              </div>

              <div className="flex flex-col items-end gap-2">
                <Link to={`/dashboard/agent-detail?n=${n.id}`} className="btn-ghost text-xs">
                  🧠 Edit agent
                </Link>
                {!n.isPrimary && (
                  <button className="btn-ghost text-xs text-red-500" onClick={() => deleteNumber(n)}>
                    Release
                  </button>
                )}
                {n.isPrimary && (
                  <span className="text-xs text-mute">Cannot release primary</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {changePlanFor && (
        <ChangePlanModal
          number={changePlanFor}
          currentUser={currentUser}
          onClose={() => setChangePlanFor(null)}
          onApplied={async (msg) => {
            setActionMsg(msg);
            setChangePlanFor(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// Per-number rental line — shows activation date + next rental anchor.
// The rental cycle is independent of the user's plan; each DID is metered
// on its own 30-day window from activatedAt.
function NumberRentalLine({ n }) {
  if (!n.activatedAt) return null;
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const next = n.nextRentalAt ? new Date(n.nextRentalAt) : null;
  const days = next ? Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const tone =
      n.rentStatus === 'overdue' || (days != null && days < 0) ? 'text-red-600'
    : days != null && days <= 5                                ? 'text-amber-600'
    :                                                            'text-mute';
  return (
    <div className={`text-xs mt-1 ${tone}`}>
      📅 Activated <strong>{fmt(n.activatedAt)}</strong>
      {next && (
        <>
          {' · '}
          renews <strong>{fmt(next)}</strong>
          {days != null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})`}
        </>
      )}
    </div>
  );
}

// =============================================================================
// PlanCard — rich plan tile shared by ChangePlanModal and AddNumberModal.
// Mirrors the marketing pricing page: label + sub + price, a quick-stats
// line, then the full ✓ perks checklist. Badges call out current/featured
// status; the whole card is one button.
// =============================================================================
function PlanCard({ plan, isSelected, isCurrent, isFeatured, disabled, onClick }) {
  const agentsLabel = plan.agents >= 999 ? 'Unlimited agents' : `${plan.agents} agent${plan.agents === 1 ? '' : 's'}`;
  const subline = `${plan.min} included min · $${plan.rate}/min eff. · ${agentsLabel}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-full flex flex-col overflow-visible rounded-[20px] border text-left transition ${
        isCurrent
          ? 'cursor-not-allowed border-[var(--border)] bg-[var(--muted)]/80'
          : isFeatured
            ? 'border-[var(--primary)] bg-[var(--card)] shadow-[0_0_0_1px_rgba(0,149,255,0.12)]'
            : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--surface-tint)]'
      } ${isSelected && !isCurrent ? 'ring-2 ring-[var(--primary)]/40 shadow-[0_0_30px_rgba(0,149,255,0.14)]' : ''}`}
    >
      {isFeatured && !isCurrent && (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold text-[var(--foreground)] shadow-lg shadow-black/20">
          <Star className="w-3 h-3 fill-current" /> Most Popular
        </span>
      )}

      <div className="rounded-xl overflow-hidden flex flex-col flex-1">
        <div className={`border-b px-5 py-4 ${
          isCurrent
            ? 'border-[var(--border)] bg-[var(--muted)]'
            : isFeatured
              ? 'border-[var(--primary)]/30 bg-[var(--surface-tint)]'
              : 'border-[var(--border)] bg-[var(--muted)]/40'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-semibold text-[var(--foreground)]">{plan.label}</div>
            {isCurrent && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--body)]">
                Current plan
              </span>
            )}
          </div>
          {plan.sub && <div className="mt-0.5 text-xs text-[var(--body)]">{plan.sub}</div>}
          <div className="mt-3 flex items-end gap-1">
            <span className="text-4xl font-semibold text-[var(--foreground)]">${Number(plan.amount).toLocaleString('en-US')}</span>
            <span className="text-[var(--body)]">/mo</span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 flex flex-col flex-1">
          <div className="mb-3 text-[11px] leading-snug text-[var(--body)]">{subline}</div>
          <ul className="space-y-2.5 flex-1">
            {(plan.perks || []).map((perk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--body)]">
                <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)] text-[9px] font-bold">✓</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>

          {isSelected && !isCurrent && (
            <div className="mt-3 border-t border-[var(--border)] pt-3 text-center text-xs font-semibold text-[var(--primary)]">
              ✓ Selected
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// ChangePlanModal — opens when the customer clicks "Change plan" on a number
// card. Shows the three plan cards, fetches a server-side pro-rata quote for
// the highlighted tier (credit for unused days on the current plan), and
// opens Stripe for the discounted amount.
// =============================================================================
export function ChangePlanModal({ number, currentUser, onClose, onApplied, defaultPlanId }) {
  const [plans, setPlans]       = useState([]);
  // Honour an explicit defaultPlanId when the modal is opened from the
  // Plans-catalog tab on Billing (so "Pick this plan" pre-selects the card
  // the customer just clicked). Falls back to the next-tier-up below.
  const [selectedId, setSelectedId] = useState(defaultPlanId || null);
  const [quote, setQuote]       = useState(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);

  // Lock body scroll + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Fetch the plan catalog (drives the 3 plan cards).
  useEffect(() => {
    (async () => {
      try {
        const r = await api('/api/plans');
        const list = (r.plans || []).slice().sort((a, b) => (a.amount || 0) - (b.amount || 0));
        setPlans(list.length ? list : FALLBACK_ADD_NUMBER_PLANS);
      } catch (e) {
        setPlans(FALLBACK_ADD_NUMBER_PLANS);
      }
    })();
  }, []);

  // Pre-select the next-tier-up by default (or whichever isn't current).
  useEffect(() => {
    if (!plans.length || selectedId) return;
    const current = number?.plan?.id;
    const alt = plans.find((p) => p.id !== current) || plans[0];
    setSelectedId(alt.id);
  }, [plans, number, selectedId]);

  // Fetch the pro-rata quote whenever the customer highlights a different plan.
  useEffect(() => {
    if (!selectedId || !number?.id) return;
    let cancelled = false;
    setQuote(null); setQuoteErr('');
    (async () => {
      try {
        const r = await api(`/api/numbers/${number.id}/change-plan-quote?planId=${selectedId}`);
        if (!cancelled) setQuote(r.quote || null);
      } catch (e) {
        if (!cancelled) setQuoteErr(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, number?.id]);

  const fmtInr  = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const purchase = async () => {
    if (!selectedId || !quote) return;
    setBusy(true); setErr('');
    try {
      
      const order = await api('/api/stripe/checkout-session/number-plan', {
        method: 'POST', body: { numberId: Number(number.id), planId: selectedId },
      });
      if (order.url) { window.location.href = order.url; return; }
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl mt-12 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* === Header ============================================== */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-mute uppercase tracking-wider">Change plan</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {number?.value}
              {number?.label && <span className="text-sm text-mute font-normal ml-2">· {number.label}</span>}
            </div>
            <div className="mt-0.5 text-xs text-mute">
              Currently on <strong>{number?.plan?.label}</strong> · {fmtInr(number?.plan?.amount)}/mo
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl text-mute hover:text-slate-900">×</button>
        </div>

        {err && (
          <div className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {err}</div>
        )}

        {/* === Plan cards ========================================== */}
        <div className="p-6 grid md:grid-cols-3 gap-4">
          {plans.length === 0 && <div className="text-mute md:col-span-3">Loading plans…</div>}
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={number?.plan?.id === p.id}
              isSelected={selectedId === p.id}
              isFeatured={p.id === 'growth'}
              disabled={number?.plan?.id === p.id || busy}
              onClick={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        {/* === Pro-rata quote panel =============================== */}
        {selectedId && number?.plan?.id !== selectedId && (
          <div className="mx-6 mb-4 rounded-xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface-tint)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>You pay today</div>
            {quoteErr && <div className="mt-2 text-sm text-red-600">⚠ {quoteErr}</div>}
            {!quote && !quoteErr && <div className="mt-2 text-sm text-mute">Calculating…</div>}
            {quote && (
              <>
                <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--line-2)' }}>
                    <span className="text-mute">{quote.targetPlan.label} plan</span>
                    <span className="font-semibold text-slate-900">{fmtInr(quote.targetPlan.amount)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--line-2)' }}>
                    <span className="text-mute">
                      Credit for {quote.daysRemaining.toFixed(0)} unused day{quote.daysRemaining === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold text-emerald-600">− {fmtInr(quote.creditInr)}</span>
                  </div>
                  <div className="flex justify-between sm:col-span-2 pt-1">
                    <span className="font-semibold text-slate-900">Total today</span>
                    <span className="text-2xl font-extrabold text-slate-900">{fmtInr(quote.amountInr)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t grid sm:grid-cols-2 gap-2 text-xs" style={{ borderColor: 'var(--line-2)' }}>
                  <div>
                    <div className="text-mute uppercase tracking-wider font-semibold">New plan starts</div>
                    <div className="mt-0.5 text-slate-900 font-semibold">{fmtDate(quote.newActivatedAt)}</div>
                  </div>
                  <div>
                    <div className="text-mute uppercase tracking-wider font-semibold">Renews on</div>
                    <div className="mt-0.5 text-slate-900 font-semibold">{fmtDate(quote.newExpiresAt)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* === Footer / CTA ======================================== */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button
            onClick={purchase}
            disabled={!quote || busy || number?.plan?.id === selectedId}
            className="btn-teal text-sm px-6"
          >
            {busy ? 'Opening Stripe…' : (quote ? `Pay ${fmtInr(quote.amountInr)} →` : 'Pick a plan')}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AddNumberModal — single-step "buy a plan, get a number" flow:
//   1. Customer picks a plan tier (Starter / Growth / Scale)
//   2. Backend auto-assigns the next available DID + opens Stripe
//   3. Confirmation card shows the assigned number + activation dates
// =============================================================================
export function AddNumberModal({ currentUser, onClose, onAdded, initialPlanId = null }) {
  const [plans, setPlans]               = useState(FALLBACK_ADD_NUMBER_PLANS);
  const [selectedPlan, setSelectedPlan] = useState(null);   // plan catalog entry
  const [preview, setPreview]           = useState(null);   // server's auto-assigned DID + dates
  const [busy, setBusy]                 = useState(false);
  const [err, setErr]                   = useState('');

  // Lock body scroll + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Fetch plan catalog on mount.
  useEffect(() => {
    (async () => {
      try {
        const r = await api('/api/plans');
        const list = (r.plans || []).slice().sort((a, b) => (a.amount || 0) - (b.amount || 0));
        setPlans(list.length ? list : FALLBACK_ADD_NUMBER_PLANS);
        setErr('');
      } catch (e) {
        setPlans(FALLBACK_ADD_NUMBER_PLANS);
        setErr('');
      }
    })();
  }, []);

  useEffect(() => {
    if (!initialPlanId || !plans.length) return;
    const matchedPlan = plans.find((plan) => plan.id === initialPlanId);
    if (matchedPlan) setSelectedPlan(matchedPlan);
  }, [initialPlanId, plans]);

  const fmtInr  = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  // Buy: open Stripe for the chosen plan. The backend auto-assigns the DID
  // and bakes the assignment into the order id, so we don't need to send a
  // phoneNumber from the client.
  const purchase = async () => {
    if (!selectedPlan) return;
    setBusy(true); setErr('');
    try {
      
      const order = await api('/api/stripe/checkout-session/new-number-plan', {
        method: 'POST', body: { planId: selectedPlan.id },
      });
      // Capture the auto-assigned DID + activation dates from the order so we
      // can show the confirmation panel even before the Stripe handler runs.
      setPreview(order);

      if (order.url) { window.location.href = order.url; return; }
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const content = (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div
        className="absolute left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 p-4"
      >
        <div
        className="relative max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-5">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Add a plan</div>
            <div className="mt-1 text-lg font-bold text-[var(--foreground)]">Pick a plan — we'll assign your phone number</div>
            <div className="mt-0.5 text-xs text-[var(--body)]">
              Each plan comes with one new phone number, included minutes, and its own 30-day cycle.
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl text-[var(--body)] hover:text-[var(--foreground)]">×</button>
        </div>

        {err && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">⚠ {err}</div>
        )}

        {/* === Plan cards ========================================== */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {plans.length === 0 && <div className="md:col-span-3 py-10 text-center text-sm text-[var(--body)]">Loading plans…</div>}
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={false}
              isSelected={selectedPlan?.id === p.id}
              isFeatured={p.id === 'growth'}
              disabled={busy}
              onClick={() => setSelectedPlan(p)}
            />
          ))}
        </div>

        {/* === Confirmation panel ================================= */}
        {selectedPlan && (
          <div className="mx-6 mb-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface-tint)] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Order summary</div>
            <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-[var(--body)]">{selectedPlan.label} plan</span>
                <span className="font-semibold text-[var(--foreground)]">{fmtInr(selectedPlan.amount)}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-[var(--body)]">Phone number</span>
                <span className="font-mono text-[var(--foreground)]">
                  {preview?.number?.value || '— assigned at checkout —'}
                </span>
              </div>
              <div className="flex justify-between sm:col-span-2 pt-1">
                <span className="font-semibold text-[var(--foreground)]">Total today</span>
                <span className="text-2xl font-extrabold text-[var(--foreground)]">{fmtInr(selectedPlan.amount)}</span>
              </div>
            </div>
            <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 text-xs sm:grid-cols-2">
              <div>
                <div className="font-semibold uppercase tracking-wider text-[var(--body)]">Plan starts</div>
                <div className="mt-0.5 font-semibold text-[var(--foreground)]">
                  {preview?.activatesAt ? fmtDate(preview.activatesAt) : 'Today, on payment'}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-[var(--body)]">Renews on</div>
                <div className="mt-0.5 font-semibold text-[var(--foreground)]">
                  {preview?.expiresAt
                    ? fmtDate(preview.expiresAt)
                    : fmtDate(new Date(Date.now() + 30 * 86400 * 1000).toISOString())
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === Footer / CTA ======================================== */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            className="btn-ghost text-sm"
          >
            Cancel
          </button>
          <button
            onClick={purchase}
            disabled={!selectedPlan || busy}
            className="btn-teal text-sm px-6"
          >
            {busy
              ? 'Opening Stripe…'
              : (selectedPlan ? `Pay ${fmtInr(selectedPlan.amount)} →` : 'Pick a plan')
            }
          </button>
        </div>
      </div>
    </div>
    </div>
  );

  return createPortal(content, document.body);
}
