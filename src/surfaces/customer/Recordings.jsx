import { useState, useMemo } from 'react';
import { Phone, Search, Play, FileText } from 'lucide-react';

const DUMMY_RECORDINGS = [
  { id: 'rec_1', from: '+1 (555) 123-4567', direction: 'inbound', duration: 154, agent: 'Sales Agent', number: '+1 (555) 000-1234', date: new Date(Date.now() - 3600000).toISOString() },
  { id: 'rec_2', from: '+1 (555) 987-6543', direction: 'inbound', duration: 312, agent: 'Support Agent', number: '+1 (555) 000-5678', date: new Date(Date.now() - 7200000).toISOString() },
  { id: 'rec_3', from: '+1 (555) 456-7890', direction: 'inbound', duration: 105, agent: 'Sales Agent', number: '+1 (555) 000-1234', date: new Date(Date.now() - 10800000).toISOString() },
  { id: 'rec_4', from: '+1 (555) 654-3210', direction: 'inbound', duration: 89, agent: 'Support Agent', number: '+1 (555) 000-5678', date: new Date(Date.now() - 18000000).toISOString() },
  { id: 'rec_5', from: '+1 (555) 111-2222', direction: 'inbound', duration: 202, agent: 'Sales Agent', number: '+1 (555) 000-1234', date: new Date(Date.now() - 21600000).toISOString() },
];

const fmtDuration = (s) => {
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function Recordings() {
  const [search, setSearch] = useState('');
  const [filterNumber, setFilterNumber] = useState('all');
  const numbers = ['+1 (555) 000-1234', '+1 (555) 000-5678'];

  const filtered = useMemo(() => {
    return DUMMY_RECORDINGS.filter((r) => {
      if (filterNumber !== 'all' && r.number !== filterNumber) return false;
      if (search && !r.from.includes(search) && !r.agent.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filterNumber]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--body)]">
          <Phone size={14} className="text-[var(--primary)]" />
          {filtered.length} recordings
        </div>
        <div className="flex items-center gap-2">
          <select className="input py-2 text-xs w-auto" value={filterNumber} onChange={(e) => setFilterNumber(e.target.value)}>
            <option value="all">All numbers</option>
            {numbers.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input className="input pl-9 text-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">From</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Direction</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Duration</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Agent</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Number</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Actions</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                <td className="py-3 font-mono text-xs text-[var(--foreground)]">{r.from}</td>
                <td className="py-3">
                  <span className="text-xs font-medium text-green-400">↓ Inbound</span>
                </td>
                <td className="py-3 text-[var(--body)] text-xs">{fmtDuration(r.duration)}</td>
                <td className="py-3 text-[var(--body)] text-xs">{r.agent}</td>
                <td className="py-3 font-mono text-xs text-[var(--body)]">{r.number}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-[var(--primary)] hover:text-[var(--primary-hover)]"><Play size={14} /></button>
                    <button className="text-[var(--body)] hover:text-[var(--foreground)]"><FileText size={14} /></button>
                  </div>
                </td>
                <td className="py-3 text-[var(--body)] text-xs">{new Date(r.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}