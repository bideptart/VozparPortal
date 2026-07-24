import { useState } from 'react';
import { Star, Check, Tag } from 'lucide-react';

const DUMMY_PLANS = [
  { id: 'starter', name: 'Starter', price: 9, yearlyPrice: 90, minutes: 100, numbers: 1, agents: 1, features: ['100 minutes/mo', '1 phone number', '1 AI agent', 'Basic analytics', 'Email support'] },
  { id: 'growth', name: 'Growth', price: 29, yearlyPrice: 290, minutes: 500, numbers: 2, agents: 3, features: ['500 minutes/mo', '2 phone numbers', '3 AI agents', 'Advanced analytics', 'Priority support', 'Knowledge base'], popular: true },
  { id: 'scale', name: 'Scale', price: 79, yearlyPrice: 790, minutes: 2000, numbers: 5, agents: 10, features: ['2,000 minutes/mo', '5 phone numbers', '10 AI agents', 'Full analytics suite', '24/7 support', 'Custom integrations', 'API access'] },
];

export default function Pricing() {
  const [cycle, setCycle] = useState('monthly');

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Every plan provisions phone numbers and includes AI voice agents.</p>

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setCycle('monthly')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${cycle === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}>
          Monthly
        </button>
        <button onClick={() => setCycle('yearly')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${cycle === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}>
          Yearly <span className="text-[10px] text-green-400 ml-1">Save 17%</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {DUMMY_PLANS.map((plan) => (
          <div key={plan.id} className={`form-card relative ${plan.popular ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-semibold uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="text-center mb-6 pt-2">
              <h3 className="text-lg font-bold text-[var(--foreground)]">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold text-[var(--foreground)]">${cycle === 'monthly' ? plan.price : Math.round(plan.yearlyPrice / 12)}</span>
                <span className="text-sm text-[var(--body)]">/mo</span>
              </div>
              {cycle === 'yearly' && <div className="text-xs text-[var(--body)] mt-1">${plan.yearlyPrice}/year</div>}
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--body)]">
                  <Check size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-3 rounded-full font-semibold text-sm transition-colors ${plan.popular ? 'btn-primary' : 'btn-ghost hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]'}`}>
              {plan.popular ? 'Get Started →' : 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>

      <div className="form-card">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Tag size={16} className="text-[var(--primary)]" /> Plan Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Feature</th>
                {DUMMY_PLANS.map((p) => (
                  <th key={p.id} className="text-center py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Minutes/mo', values: ['100', '500', '2,000'] },
                { label: 'Phone Numbers', values: ['1', '2', '5'] },
                { label: 'AI Agents', values: ['1', '3', '10'] },
                { label: 'Knowledge Base', values: ['—', '✓', '✓'] },
                { label: 'API Access', values: ['—', '—', '✓'] },
                { label: 'Custom Integrations', values: ['—', '—', '✓'] },
              ].map((row) => (
                <tr key={row.label} className="border-b border-[var(--border)]">
                  <td className="py-2.5 text-xs text-[var(--body)]">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-2.5 text-center text-xs text-[var(--foreground)]">{v === '✓' ? <Check size={14} className="text-[var(--primary)] mx-auto" /> : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}