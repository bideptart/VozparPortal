import { useState } from 'react';
import { Wallet, CreditCard, Phone, Star, Tag, Calendar } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const DUMMY_PLANS = [
  { id: 'plan_001', name: 'Growth', price: 29, cycle: 'monthly', minutes: 500, numbers: 1, agents: 3, status: 'active', startDate: new Date(Date.now() - 2592000000).toISOString() },
];

const DUMMY_WALLET = { balance: 43.52, currency: 'USD' };

const TABS = [
  { id: 'my-plans', label: 'My Plans', icon: Star },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
];

export default function Billing() {
  const { currentUser, demoMode } = useApp();
  const [tab, setTab] = useState('my-plans');

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--body)] hover:text-[var(--foreground)]'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'my-plans' && (
        <div className="space-y-4">
          <div className="form-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Active Plan</h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-[var(--muted)]">
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold mb-1">Plan</div>
                <div className="text-lg font-bold text-[var(--foreground)]">Growth</div>
                <div className="text-xs text-[var(--body)]">$29/mo</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--muted)]">
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold mb-1">Minutes</div>
                <div className="text-lg font-bold text-[var(--foreground)]">342 / 500</div>
                <div className="w-full h-1.5 rounded-full bg-[var(--border)] mt-2">
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: '68%' }}></div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--muted)]">
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold mb-1">Numbers</div>
                <div className="text-lg font-bold text-[var(--foreground)]">2</div>
                <div className="text-xs text-[var(--body)]">Included: 1</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--muted)]">
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold mb-1">Agents</div>
                <div className="text-lg font-bold text-[var(--foreground)]">5</div>
                <div className="text-xs text-[var(--body)]">Included: 3</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-3">
              <span className="text-xs text-[var(--body)]">Started: Jan 1, 2026</span>
              <span className="text-[var(--border)]">·</span>
              <span className="text-xs text-[var(--body)]">Next billing: Feb 1, 2026</span>
            </div>
          </div>

          <div className="form-card">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Phone Numbers</h3>
            <div className="space-y-2">
              {['+1 (555) 000-1234', '+1 (555) 000-5678'].map((n) => (
                <div key={n} className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]">
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-[var(--primary)]" />
                    <span className="font-mono text-xs text-[var(--foreground)]">{n}</span>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'wallet' && (
        <div className="space-y-4">
          <div className="form-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold mb-1">Balance</div>
                <div className="text-3xl font-bold text-[var(--foreground)]">${DUMMY_WALLET.balance.toFixed(2)}</div>
              </div>
              <button className="btn-primary text-sm px-4 py-2">+ Add Funds</button>
            </div>
          </div>

          <div className="form-card">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Wallet Activity</h3>
            <div className="space-y-2">
              {[
                { desc: 'Growth Plan charge', amount: -29.00, date: 'Jan 1' },
                { desc: 'Wallet top-up', amount: 50.00, date: 'Dec 28' },
                { desc: 'Voice usage', amount: -4.32, date: 'Dec 27' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]">
                  <div>
                    <div className="text-xs text-[var(--foreground)]">{tx.desc}</div>
                    <div className="text-[10px] text-[var(--body)]">{tx.date}</div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-[var(--foreground)]'}`}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}