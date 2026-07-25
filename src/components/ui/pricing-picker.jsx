"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const defaultPlans = [
  {
    name: "Starter",
    price: "29",
    yearlyPrice: "24",
    period: "per month",
    features: [
      "1 production AI voice agent",
      "250 voice minutes included",
      "1 phone number included",
      "Basic analytics and call logs",
      "Email support",
    ],
    description: "Best for small teams getting their first AI call workflow live.",
    buttonText: "Choose Starter",
    href: "/dashboard/billing",
    isPopular: false,
  },
  {
    name: "Professional",
    price: "79",
    yearlyPrice: "64",
    period: "per month",
    features: [
      "3 AI voice agents",
      "750 voice minutes included",
      "2 live phone numbers",
      "Advanced analytics and automations",
      "Priority support",
      "Shared wallet and plan controls",
    ],
    description: "A strong fit for growing teams that want cleaner AI call operations.",
    buttonText: "Choose Professional",
    href: "/dashboard/billing",
    isPopular: true,
  },
  {
    name: "Enterprise",
    price: "199",
    yearlyPrice: "169",
    period: "per month",
    features: [
      "10 AI voice agents",
      "2,500 voice minutes included",
      "Multiple numbers and routing",
      "Team-level reporting",
      "Priority onboarding support",
      "Custom rollout planning",
    ],
    description: "For larger teams that need more volume, more control, and more support.",
    buttonText: "Talk to Sales",
    href: "/dashboard/account",
    isPopular: false,
  },
];

export default function PricingPicker({
  plans = defaultPlans,
  title = "Choose a plan",
  description = "Pick the plan that fits your call volume.",
  className,
  onPlanSelect,
}) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleToggle = (checked) => {
    setIsMonthly(!checked);
  };

  return (
    <div className={cn("py-1", className)}>
      <div className="space-y-7">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto max-w-3xl whitespace-pre-line text-sm leading-5 text-[var(--body)]">
            {description}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5">
            <Label className="cursor-pointer">
              <Switch
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </Label>
            <span className="text-xs font-semibold text-[var(--foreground)] sm:text-sm">
              Annual billing <span className="text-[var(--accent)]">(Save 20%)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
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
                "relative flex h-full flex-col rounded-[24px] border p-4 text-left shadow-[0_18px_50px_-30px_rgba(4,107,210,0.4)]",
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
                  <span className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
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

                <ul className="mt-4 flex flex-col gap-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-xs leading-5 text-[var(--body)]">
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(4,107,210,0.14)]">
                        <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="my-4 border-[var(--border)]" />

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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
