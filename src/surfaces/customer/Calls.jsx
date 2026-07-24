import { useState, useMemo } from 'react';
import { Phone, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const DUMMY_CALLS = [
  { id: 'c1', from: '+1 (555) 123-4567', to: '+1 (555) 000-1234', direction: 'inbound', status: 'completed', duration: 154, agent: 'Sales Agent', date: new Date(Date.now() - 3600000).toISOString() },
  { id: 'c2', from: '+1 (555) 987-6543', to: '+1 (555) 000-5678', direction: 'inbound', status: 'completed', duration: 312, agent: 'Support Agent', date: new Date(Date.now() - 7200000).toISOString() },
  { id: 'c3', from: '+1 (555) 456-7890', to: '+1 (555) 000-1234', direction: 'inbound', status: 'completed', duration: 105, agent: 'Sales Agent', date: new Date(Date.now() - 10800000).toISOString() },
  { id: 'c4', from: '+1 (555) 000-1234', to: '+1 (555) 321-0987', direction: 'outbound', status: 'completed', duration: 202, agent: 'Booking Agent', date: new Date(Date.now() - 14400000).toISOString() },
  { id: 'c5', from: '+1 (555) 654-3210', to: '+1 (555) 000-5678', direction: 'inbound', status: 'no-answer', duration: 0, agent: 'Support Agent', date: new Date(Date.now() - 18000000).toISOString() },
  { id: 'c6', from: '+1 (555) 111-2222', to: '+1 (555) 000-1234', direction: 'inbound', status: 'completed', duration: 89, agent: 'Sales Agent', date: new Date(Date.now() - 21600000).toISOString() },
  { id: 'c7', from: '+1 (555) 000-5678', to: '+1 (555) 777-8888', direction: 'outbound', status: 'completed', duration: 445, agent: 'Support Agent', date: new Date(Date.now() - 25200000).toISOString() },
  { id: 'c8', from: '+1 (555) 333-4444', to: '+1 (555) 000-1234', direction: 'inbound', status: 'completed', duration: 67, agent: 'Sales Agent', date: new Date(Date.now() - 28800000).toISOString() },
];

const STATUS_PILL = {
  completed: 'bg-green-500/15 text-green-400',
  'no-answer': 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
};

const fmtDuration = (s) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function Calls() {
  const { currentUser, demoMode } = useApp();
  const [filterNumber, setFilterNumber] = useState('all');

  const numbers = ['+1 (555) 000-1234', '+1 (555) 000-5678'];
  const filtered = useMemo(() => {
    if (filterNumber === 'all') return DUMMY_CALLS;
    return DUMMY_CALLS.filter((c) => c.to === filterNumber || c.from === filterNumber);
  }, [filterNumber]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            className="input py-2 text-xs w-auto"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
          >
            <option value="all">All numbers</option>
            {numbers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--body)]">
          <Phone size={14} className="text-[var(--primary)]" />
          {filtered.length} calls
        </div>
      </div>

      <div className="form-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Direction</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">From</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">To</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Status</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Duration</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Agent</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((call) => (
              <tr key={call.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer">
                <td className="py-3">
                  {call.direction === 'inbound'
                    ? <ArrowDownLeft size={14} className="text-green-400" />
                    : <ArrowUpRight size={14} className="text-[var(--primary)]" />
                  }
                </td>
                <td className="py-3 font-mono text-xs text-[var(--foreground)]">{call.from}</td>
                <td className="py-3 font-mono text-xs text-[var(--body)]">{call.to}</td>
                <td className="py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_PILL[call.status] || 'bg-[var(--muted)] text-[var(--body)]'}`}>
                    {call.status}
                  </span>
                </td>
                <td className="py-3 text-[var(--body)] text-xs">{fmtDuration(call.duration)}</td>
                <td className="py-3 text-[var(--body)] text-xs">{call.agent}</td>
                <td className="py-3 text-[var(--body)] text-xs">{new Date(call.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}