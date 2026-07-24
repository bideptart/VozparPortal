import { useState } from 'react';
import { Star, Check, Tag, ArrowRight, Zap } from 'lucide-react';

const DUMMY_PLANS = [
  { id: 'starter', name: 'Starter', price: 9, yearlyPrice: 90, minutes: 100, numbers: 1, agents: 1, features: ['100 minutes/mo', '1 phone number', '1 AI agent', 'Basic analytics', 'Email support'] },
  { id: 'growth', name: 'Growth', price: 29, yearlyPrice: 290, minutes: 500, numbers: 2, agents: 3, features: ['500 minutes/mo', '2 phone numbers', '3 AI agents', 'Advanced analytics', 'Priority support', 'Knowledge base'], popular: true },
  { id: 'scale', name: 'Scale', price: 79, yearlyPrice: 790, minutes: 2000, numbers: 5, agents: 10, features: ['2,000 minutes/mo', '5 phone numbers', '10 AI agents', 'Full analytics suite', '24/7 support', 'Custom integrations', 'API access'] },
];

export default function Pricing() {
  const [cycle, setCycle] = useState('monthly');

  return (
    <div className="space-y-8 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Every plan provisions phone numbers and includes AI voice agents.</p>

      <div className="flex items-center justify-center gap-3">
        <button 
          onClick={() => setCycle('monthly')} 
          className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${cycle === 'monthly' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--glow)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--body)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'}`}
        >
          Monthly
        </button>
        <button 
          onClick={() => setCycle('yearly')} 
          className={`px-6 py-3 rounded-full text-sm font-semibold transition-all relative ${cycle === 'yearly' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--glow)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--body)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'}`}
        >
          Yearly 
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Save 17%</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {DUMMY_PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative rounded-3xl border p-8 transition-all duration-300 ${
              plan.popular 
                ? 'border-[var(--primary)] bg-[var(--card)] shadow-[0_0_40px_rgba(4,107,210,0.2)] transform scale-105' 
                : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] hover:shadow-[0_0_30px_rgba(4,107,210,0.1)]'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[var(--glow)] flex items-center gap-1.5">
                <Zap size={12} fill="currentColor" />
                Most Popular
              </div>
            )}
            <div className="text-center mb-8 pt-2">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-[var(--foreground)]">${cycle === 'monthly' ? plan.price : Math.round(plan.yearlyPrice / 12)}</span>
                <span className="text-base text-[var(--body)] font-medium">/mo</span>
              </div>
              {cycle === 'yearly' && (
                <div className="text-sm text-[var(--body)] mt-2">${plan.yearlyPrice} billed annually</div>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--body)]">
                  <div className="mt-0.5 p-1 rounded-full bg-[var(--glow)] text-[var(--primary)]">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button 
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                plan.popular 
                  ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-[var(--glow)] hover:shadow-xl hover:shadow-[var(--glow-strong)] hover:scale-[1.02]' 
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'
              }`}
            >
              {plan.popular ? 'Get Started' : 'Choose Plan'}
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
          <Tag size={20} className="text-[var(--primary)]" /> 
          Detailed Plan Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-4 text-xs uppercase tracking-widest text-[var(--body)] font-bold">Feature</th>
                {DUMMY_PLANS.map((p) => (
                  <th key={p.id} className="text-center py-4 text-xs uppercase tracking-widest text-[var(--body)] font-bold">{p.name}</th>
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
              ].map((row, idx) => (
                <tr key={row.label} className={`border-b border-[var(--border)] ${idx % 2 === 1 ? 'bg-[var(--muted)]' : ''}`}>
                  <td className="py-4 text-sm text-[var(--body)] font-medium">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-4 text-center text-sm text-[var(--foreground)]">
                      {v === '✓' ? <Check size={18} className="text-[var(--primary)] mx-auto" strokeWidth={3} /> : v}
                    </td>
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