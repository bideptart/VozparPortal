import { useState, useMemo } from 'react';
import { Receipt, Wallet, ArrowUpRight, ArrowDownLeft, Download, RefreshCw, Search } from 'lucide-react';

const DUMMY_TXNS = [
  { id: 'tx_001', type: 'charge', amount: 29.00, description: 'Growth Plan - Monthly', date: new Date(Date.now() - 86400000).toISOString(), status: 'completed' },
  { id: 'tx_002', type: 'topup', amount: 50.00, description: 'Wallet top-up via Stripe', date: new Date(Date.now() - 172800000).toISOString(), status: 'completed' },
  { id: 'tx_003', type: 'usage', amount: -4.32, description: 'Voice minutes - 48 min @ $0.09/min', date: new Date(Date.now() - 259200000).toISOString(), status: 'completed' },
  { id: 'tx_004', type: 'usage', amount: -2.16, description: 'Voice minutes - 24 min @ $0.09/min', date: new Date(Date.now() - 345600000).toISOString(), status: 'completed' },
  { id: 'tx_005', type: 'charge', amount: 29.00, description: 'Growth Plan - Monthly', date: new Date(Date.now() - 432000000).toISOString(), status: 'completed' },
  { id: 'tx_006', type: 'refund', amount: 9.00, description: 'Overage refund', date: new Date(Date.now() - 518400000).toISOString(), status: 'completed' },
  { id: 'tx_007', type: 'topup', amount: 25.00, description: 'Wallet top-up via Stripe', date: new Date(Date.now() - 604800000).toISOString(), status: 'completed' },
  { id: 'tx_008', type: 'usage', amount: -6.48, description: 'Voice minutes - 72 min @ $0.09/min', date: new Date(Date.now() - 691200000).toISOString(), status: 'completed' },
  { id: 'tx_009', type: 'charge', amount: 9.00, description: 'Number rental - +1 (555) 000-1234', date: new Date(Date.now() - 777600000).toISOString(), status: 'completed' },
  { id: 'tx_010', type: 'charge', amount: 9.00, description: 'Number rental - +1 (555) 000-5678', date: new Date(Date.now() - 777600000).toISOString(), status: 'completed' },
];

const TYPE_META = {
  charge: { icon: ArrowUpRight, color: '#EF4444', label: 'Charge' },
  topup: { icon: ArrowDownLeft, color: '#16A34A', label: 'Top-up' },
  usage: { icon: ArrowUpRight, color: '#F59E0B', label: 'Usage' },
  refund: { icon: ArrowDownLeft, color: 'var(--primary)', label: 'Refund' },
};

const money = (n) => `$${Math.abs(n).toFixed(2)}`;

export default function Transactions() {
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return DUMMY_TXNS.filter((t) => {
      if (kind !== 'all' && t.type !== kind) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [kind, search]);

  const totalPaid = DUMMY_TXNS.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalUsage = Math.abs(DUMMY_TXNS.filter((t) => t.type === 'usage').reduce((s, t) => s + t.amount, 0));

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="form-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--primary)]"><Receipt size={18} className="text-white" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Transactions</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{DUMMY_TXNS.length}</div>
          </div>
        </div>
        <div className="form-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--secondary)]"><Wallet size={18} className="text-white" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Total Paid</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{money(totalPaid)}</div>
          </div>
        </div>
        <div className="form-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--accent)]"><ArrowUpRight size={18} className="text-white" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Total Usage</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{money(totalUsage)}</div>
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'charge', 'topup', 'usage', 'refund'].map((t) => (
              <button key={t} onClick={() => setKind(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${kind === t ? 'btn-primary' : 'btn-ghost'}`}>
                {t === 'all' ? 'All' : TYPE_META[t]?.label || t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input className="input pl-9 text-xs" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Type</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Description</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Amount</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Date</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn) => {
                const meta = TYPE_META[txn.type] || TYPE_META.charge;
                const Icon = meta.icon;
                return (
                  <tr key={txn.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${meta.color}20` }}>
                          <Icon size={14} style={{ color: meta.color }} />
                        </div>
                        <span className="text-xs font-medium text-[var(--foreground)]">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[var(--body)] text-xs">{txn.description}</td>
                    <td className="py-3 font-mono text-xs font-semibold" style={{ color: txn.amount > 0 ? '#EF4444' : '#16A34A' }}>
                      {txn.amount > 0 ? '-' : '+'}{money(txn.amount)}
                    </td>
                    <td className="py-3 text-[var(--body)] text-xs">{new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                    <td className="py-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{txn.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}