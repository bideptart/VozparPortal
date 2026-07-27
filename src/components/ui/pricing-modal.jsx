"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Phone, X } from "lucide-react";

import { api } from "@/api.js";
import { DEFAULT_PUBLIC_PLANS } from "@/lib/public-plan-catalog";
import PricingPicker from "@/components/ui/pricing-picker";

const FALLBACK_PLANS = DEFAULT_PUBLIC_PLANS;

function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function normalizePlan(plan) {
  const amount = Number(plan.amount ?? plan.monthly ?? plan.price ?? 0);
  const agents = Number(plan.agents ?? 0);
  const minutes = Number(plan.min ?? plan.minutes ?? 0);
  const features = Array.isArray(plan.perks) && plan.perks.length
    ? plan.perks
    : [
        minutes ? `${minutes.toLocaleString("en-US")} included minutes` : "Included minute bundle",
        agents ? `${agents} AI voice agent${agents === 1 ? "" : "s"}` : "Multi-agent coverage",
        "Phone number provisioning included",
        "Shared wallet backup",
      ];

  return {
    ...plan,
    id: plan.id,
    name: plan.label || plan.name || "Plan",
    price: String(amount),
    yearlyPrice: String(plan.yearlyAmount ?? amount),
    period: "per month",
    features,
    description: plan.sub || "Voice AI plan with minutes, number provisioning, and billing controls.",
    buttonText: `Choose ${plan.label || plan.name || "Plan"}`,
    href: "/dashboard/billing",
    isPopular: Boolean(plan.featured ?? String(plan.id || "").toLowerCase() === "growth"),
  };
}

export default function PricingModal({ open, onClose }) {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setPlansLoading(true);
      setErr("");
      try {
        const response = await api("/api/plans");
        if (cancelled) return;
        const sourcePlans = Array.isArray(response?.plans) && response.plans.length
          ? response.plans
          : FALLBACK_PLANS;
        const nextPlans = sourcePlans
          .slice()
          .sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0))
          .map(normalizePlan);
        setPlans(nextPlans);
        if (!selectedPlanId && nextPlans[0]) setSelectedPlanId(nextPlans[0].id);
      } catch (error) {
        if (!cancelled) {
          const nextPlans = FALLBACK_PLANS.map(normalizePlan);
          setPlans(nextPlans);
          setSelectedPlanId((current) => current || nextPlans[0]?.id || "");
          setErr("");
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null,
    [plans, selectedPlanId],
  );

  const renewalDate = useMemo(
    () => new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    [],
  );

  const beginCheckout = async () => {
    if (!selectedPlan) return;

    setBusy(true);
    setErr("");

    try {
      const order = await api("/api/stripe/checkout-session/new-number-plan", {
        method: "POST",
        body: { planId: selectedPlan.id },
      });

      if (order?.url) {
        window.location.href = order.url;
        return;
      }

      throw new Error("Could not open checkout right now.");
    } catch (error) {
      setErr(error.message || "Could not start checkout.");
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/78 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 md:p-4">
        <div
          className="relative w-full max-w-6xl overflow-hidden rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,27,45,0.98),rgba(11,18,32,0.98))] shadow-[0_28px_90px_-28px_rgba(4,107,210,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[rgba(11,18,32,0.94)] px-4 py-3.5 backdrop-blur md:px-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Add plan / number
              </div>
              <div className="mt-1 text-base font-semibold text-[var(--foreground)] md:text-lg">
                Pick a plan and review the order summary
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--accent)]"
              aria-label="Close pricing modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[88vh] overflow-y-auto px-4 pb-4 pt-4 md:px-5 md:pb-5">
            {err && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            )}

            <PricingPicker
              plans={plans}
              title="Choose a plan"
              description="Select one of the plans below to see the order summary before checkout."
              onPlanSelect={(plan) => setSelectedPlanId(plan.id)}
              selectedPlanId={selectedPlanId}
              showBillingToggle={false}
              className={plansLoading ? "opacity-70" : ""}
            />

            {selectedPlan && (
              <div className="mt-6 rounded-[24px] border border-[var(--primary)]/25 bg-[linear-gradient(180deg,rgba(4,107,210,0.10),rgba(255,255,255,0.02))] p-5 md:p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Order Summary
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 md:gap-x-6">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-sm">
                    <span className="text-[var(--body)]">{selectedPlan.name} plan</span>
                    <span className="font-semibold text-[var(--foreground)]">{money(selectedPlan.price)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-sm">
                    <span className="text-[var(--body)]">Phone number</span>
                    <span className="font-mono text-[var(--foreground)]">— assigned at checkout —</span>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
                  <span className="text-lg font-semibold text-[var(--foreground)]">Total today</span>
                  <span className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                    {money(selectedPlan.price)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--body)]">
                      <CalendarDays size={14} />
                      Plan Starts
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">Today, on payment</div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--body)]">
                      <Phone size={14} />
                      Renews On
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                      {formatDate(renewalDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[rgba(11,18,32,0.94)] px-4 py-4 md:px-5">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>

            <button
              type="button"
              onClick={beginCheckout}
              disabled={!selectedPlan || busy || plansLoading}
              className="btn-teal text-sm px-6"
            >
              {busy
                ? "Opening checkout…"
                : selectedPlan
                  ? `Pay ${money(selectedPlan.price)} →`
                  : "Choose a plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
