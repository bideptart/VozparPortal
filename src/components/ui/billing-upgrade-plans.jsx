"use client";

import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { Check, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

function defaultFeatures(plan) {
  const minutes = Number(plan.minutes ?? 0);
  const agents = Number(plan.agents ?? 0);
  const agentLabel = agents === 1 ? "AI voice agent" : "AI voice agents";

  return [
    minutes ? `${minutes} voice minutes included` : "Included voice minute bundle",
    agents ? `${agents} ${agentLabel}` : "Multi-agent support",
    "Number provisioning included",
    "Shared wallet backup support",
  ];
}

function normalizePlan(plan, hasActivePlans) {
  const monthly = Number(plan.monthly ?? plan.amount ?? plan.price ?? 0);
  const yearly = Number(plan.yearlyPrice ?? Math.max(0, Math.round(monthly * 0.8)));
  const name = plan.name || plan.label || "Plan";
  const features = Array.isArray(plan.features) && plan.features.length
    ? plan.features
    : Array.isArray(plan.perks) && plan.perks.length
      ? plan.perks
      : defaultFeatures(plan);

  return {
    ...plan,
    name,
    price: String(monthly),
    yearlyPrice: String(yearly),
    period: plan.period || "per month",
    features,
    description: plan.description || "Voice AI coverage with included minutes and team capacity.",
    buttonText: plan.buttonText || (hasActivePlans ? `Switch to ${name}` : `Choose ${name}`),
    href: plan.href || "/dashboard/numbers",
    isPopular: Boolean(plan.isPopular ?? plan.featured ?? String(plan.id || "").toLowerCase() === "growth"),
  };
}

export default function BillingUpgradePlans({
  plans = [],
  helperMessage,
  className,
  hasActivePlans = false,
  onPlanSelect,
}) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const normalizedPlans = useMemo(
    () => plans.map((plan) => normalizePlan(plan, hasActivePlans)),
    [hasActivePlans, plans],
  );

  const handleToggle = (checked) => {
    setIsMonthly(!checked);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {helperMessage && (
        <div className="form-card rounded-[24px] border border-[var(--primary)]/20 bg-[linear-gradient(180deg,rgba(4,107,210,0.12),rgba(255,255,255,0.02))]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--primary)]/30 bg-[var(--glow)] text-[var(--primary)]">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-base font-semibold text-[var(--foreground)]">Get your first plan live</div>
              <p className="mt-1 text-sm leading-6 text-[var(--body)]">{helperMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={!isMonthly}
            aria-label="Toggle annual billing"
            onClick={() => handleToggle(isMonthly)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[var(--input)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              !isMonthly && "bg-[var(--primary)]",
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                !isMonthly ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
          <span className="text-xs font-semibold text-[var(--foreground)] sm:text-sm">
            Annual billing <span className="text-[var(--accent)]">(Save 20%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {normalizedPlans.map((plan, index) => (
          <motion.div
            key={plan.id || plan.name}
            initial={{ y: 30, opacity: 0 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -12 : 0,
                    opacity: 1,
                    x: index === 0 ? 18 : index === 2 ? -18 : 0,
                    scale: index === 0 || index === 2 ? 0.97 : 1,
                  }
                : { y: 0, opacity: 1 }
            }
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.8,
              type: "spring",
              stiffness: 110,
              damping: 18,
              delay: index * 0.08,
            }}
            className={cn(
              "relative flex h-full flex-col rounded-[24px] border p-5 text-left shadow-[0_18px_50px_-30px_rgba(4,107,210,0.4)]",
              plan.isPopular
                ? "border-[var(--primary)] bg-[linear-gradient(180deg,rgba(4,107,210,0.16),rgba(255,255,255,0.04))]"
                : "border-[var(--border)] bg-[var(--card)]",
              !plan.isPopular && "md:mt-6",
            )}
          >
            {plan.isPopular && (
              <div className="absolute right-0 top-0 flex items-center rounded-bl-2xl rounded-tr-[23px] bg-[var(--primary)] px-3 py-1.5">
                <Star className="h-4 w-4 fill-current text-white" />
                <span className="ml-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  Popular
                </span>
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {plan.name}
              </p>

              <div className="mt-4 flex items-end gap-x-2">
                <span className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                  <NumberFlow
                    value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                    format={{
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                  />
                </span>
                {plan.period !== "Next 3 months" && (
                  <span className="pb-1 text-sm font-medium text-[var(--body)]">
                    / {plan.period}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-xs uppercase tracking-[0.12em] text-[var(--body)]">
                {isMonthly ? "billed monthly" : "billed annually"}
              </p>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[var(--body)]">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(4,107,210,0.14)]">
                      <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className="my-5 border-[var(--border)]" />

              {onPlanSelect ? (
                <button
                  type="button"
                  onClick={() => onPlanSelect(plan)}
                  className={cn(
                    buttonVariants({ variant: plan.isPopular ? "default" : "outline" }),
                    "w-full text-sm font-semibold",
                  )}
                >
                  {plan.buttonText}
                </button>
              ) : (
                <Link
                  to={plan.href}
                  className={cn(
                    buttonVariants({ variant: plan.isPopular ? "default" : "outline" }),
                    "w-full text-sm font-semibold",
                  )}
                >
                  {plan.buttonText}
                </Link>
              )}

              <p className="mt-5 text-xs leading-6 text-[var(--body)]">
                {plan.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
