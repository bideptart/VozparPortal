import { useMemo, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Check,
  Phone,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Zap,
} from 'lucide-react';
import VerticalCutReveal from '@/components/ui/vertical-cut-reveal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_PUBLIC_PLANS } from '@/lib/public-plan-catalog';

const PLANS = DEFAULT_PUBLIC_PLANS.map((plan) => ({
  id: plan.id,
  name: plan.label,
  monthly: plan.amount,
  yearly: plan.yearlyAmount,
  minutes: plan.min,
  numbers: plan.dids,
  agents: plan.agents,
  responseTime: plan.support,
  description: plan.sub,
  eyebrow: plan.eyebrow,
  popular: Boolean(plan.featured),
  features: plan.perks,
}));

const ENTERPRISE_POINTS = [
  'Volume-based pricing for high call throughput',
  'Dedicated onboarding and rollout planning',
  'Custom routing, CRM, and reporting requirements',
];

function formatSavings(plan) {
  return plan.monthly * 12 - plan.yearly;
}

export default function PricingSection({ onSelectPlan }) {
  const [cycle, setCycle] = useState('monthly');

  const highlightedStats = useMemo(() => {
    const growthPlan = PLANS.find((plan) => plan.id === 'growth');
    return [
      {
        label: 'Monthly spend',
        value: cycle === 'monthly' ? growthPlan.monthly : growthPlan.yearly,
        prefix: '$',
        suffix: cycle === 'monthly' ? '/mo' : '/yr',
        icon: Tag,
      },
      {
        label: 'Included minutes',
        value: cycle === 'monthly' ? growthPlan.minutes : growthPlan.minutes * 12,
        suffix: cycle === 'monthly' ? '/mo' : '/yr',
        icon: Phone,
      },
      {
        label: 'AI agents',
        value: growthPlan.agents,
        icon: Bot,
      },
      {
        label: 'Annual savings',
        value: formatSavings(growthPlan),
        prefix: '$',
        suffix: cycle === 'yearly' ? ' saved' : '',
        icon: TrendingUp,
      },
    ];
  }, [cycle]);

  const comparisonRows = useMemo(() => ([
    { label: 'Included minutes', values: PLANS.map((plan) => `${plan.minutes.toLocaleString('en-US')} / month`) },
    { label: 'Phone numbers', values: PLANS.map((plan) => String(plan.numbers)) },
    { label: 'AI agents', values: PLANS.map((plan) => (plan.agents >= 999 ? 'Unlimited' : String(plan.agents))) },
    { label: 'Voice stack', values: ['Standard', 'Standard + premium', 'Realtime + premium'] },
    { label: 'Billing', values: ['Per-second', 'Per-second', 'Per-second'] },
    { label: 'Support', values: PLANS.map((plan) => plan.responseTime) },
  ]), []);

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,27,45,0.98),rgba(11,18,32,0.96))] p-6 sm:p-8 lg:p-10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(4,107,210,0.24),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(0,134,249,0.12),transparent_35%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(4,107,210,0.35)] bg-[rgba(4,107,210,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              <Sparkles size={14} />
              Voice plans built for operators
            </div>

            <VerticalCutReveal
              as="h2"
              text="Professional pricing for teams that want AI calls handled cleanly."
              splitBy="words"
              once
              className="max-w-3xl text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl"
              containerClassName="max-w-3xl"
            />

            <p className="max-w-2xl text-sm leading-6 text-[var(--body)] sm:text-base">
              Every plan includes production-ready voice agents, live number provisioning, and a dashboard your team can actually run day to day.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--body)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5">
                <ShieldCheck size={14} className="text-[var(--accent)]" />
                Clear plan limits
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5">
                <Zap size={14} className="text-[var(--accent)]" />
                Fast setup
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5">
                <Phone size={14} className="text-[var(--accent)]" />
                Phone numbers included
              </span>
            </div>
          </div>

          <Card className="border-[rgba(4,107,210,0.32)] bg-[rgba(255,255,255,0.04)] shadow-[0_18px_60px_-30px_rgba(4,107,210,0.85)]">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--body)]">
                    Billing cadence
                  </div>
                  <CardTitle className="mt-2 text-xl text-[var(--foreground)]">Choose your plan cycle</CardTitle>
                </div>
                <span className="rounded-full bg-green-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-400">
                  Save 20% yearly
                </span>
              </div>

              <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-1">
                {['monthly', 'yearly'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCycle(value)}
                    className={`rounded-[12px] px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      cycle === value
                        ? 'bg-[var(--primary)] text-white shadow-[0_10px_25px_-16px_rgba(4,107,210,1)]'
                        : 'text-[var(--body)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-2">
              {highlightedStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--body)]">
                      {item.label}
                    </span>
                    <item.icon size={15} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex items-end gap-1 text-[var(--foreground)]">
                    {item.prefix ? <span className="pb-1 text-lg font-semibold">{item.prefix}</span> : null}
                    <span className="text-3xl font-semibold leading-none">
                      <NumberFlow value={item.value} />
                    </span>
                    {item.suffix ? <span className="pb-1 text-xs text-[var(--body)]">{item.suffix}</span> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {PLANS.map((plan, index) => {
          const displayPrice = cycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12);
          const billedLabel = cycle === 'monthly' ? 'Billed monthly' : `$${plan.yearly} billed annually`;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: index * 0.06 }}
            >
              <Card
                className={`relative h-full rounded-[24px] border p-0 ${
                  plan.popular
                    ? 'border-[var(--primary)] bg-[linear-gradient(180deg,rgba(4,107,210,0.16),rgba(255,255,255,0.04))] shadow-[0_20px_65px_-32px_rgba(4,107,210,1)]'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <CardHeader className="space-y-4 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        {plan.eyebrow}
                      </div>
                      <CardTitle className="mt-2 text-2xl text-[var(--foreground)]">{plan.name}</CardTitle>
                    </div>
                    {plan.popular ? (
                      <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        Best value
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-[var(--body)]">{plan.description}</p>

                  <div className="pt-1 flex items-end gap-1 text-[var(--foreground)]">
                    <span className="pb-1 text-xl font-semibold">$</span>
                    <span className="text-5xl font-semibold leading-none">
                      <NumberFlow value={displayPrice} />
                    </span>
                    <span className="pb-1 text-sm text-[var(--body)]">/month</span>
                  </div>
                  <p className="text-xs text-[var(--body)]">{billedLabel}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[var(--body)]">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(4,107,210,0.14)]">
                          <Check size={13} className="text-[var(--accent)]" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => onSelectPlan?.(plan)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                        : 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--accent)]'
                    }`}
                  >
                    {plan.popular ? 'Start with Growth' : `Choose ${plan.name}`}
                    <ArrowRight size={16} />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="min-w-0 rounded-[24px] border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              <Tag size={14} />
              Detailed comparison
            </div>
            <CardTitle className="text-2xl text-[var(--foreground)]">See what changes as you move up plan tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {PLANS.map((plan) => (
                      <th key={plan.id} className="text-center">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="text-[var(--body)]">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${index}`} className="text-center text-[var(--foreground)]">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-[rgba(4,107,210,0.28)] bg-[linear-gradient(180deg,rgba(4,107,210,0.12),rgba(255,255,255,0.04))]">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(4,107,210,0.32)] bg-[rgba(4,107,210,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              <ShieldCheck size={14} />
              Enterprise
            </div>
            <CardTitle className="text-2xl text-[var(--foreground)]">Need a custom rollout?</CardTitle>
            <p className="text-sm leading-6 text-[var(--body)]">
              For teams with multiple sites, higher call volumes, or custom compliance needs, we can shape a dedicated commercial package.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-3">
              {ENTERPRISE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-6 text-[var(--body)]">
                  <Check size={16} className="mt-1 shrink-0 text-[var(--accent)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-[var(--border)] bg-[rgba(11,18,32,0.38)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--body)]">Typical fit</div>
              <div className="mt-2 text-sm text-[var(--foreground)]">
                Multi-location businesses, contact centers, and teams replacing a manual front desk.
              </div>
            </div>

            <a
              href="mailto:sales@vozper.com?subject=Enterprise%20plan%20inquiry"
              className="btn-primary w-full text-center"
            >
              Talk to Sales
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
