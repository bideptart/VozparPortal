import { useState, useMemo } from 'react';
import { Search, Clock, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const DUMMY_TICKETS = [
  { id: 't1', subject: 'Caller reported dropped call', status: 'open', priority: 'high', category: 'Technical', caller: '+1 (555) 123-4567', agent: 'Sales Agent', created: new Date(Date.now() - 3600000).toISOString(), updated: new Date(Date.now() - 1800000).toISOString() },
  { id: 't2', subject: 'Wrong information given about pricing', status: 'in-progress', priority: 'medium', category: 'Content', caller: '+1 (555) 987-6543', agent: 'Support Agent', created: new Date(Date.now() - 7200000).toISOString(), updated: new Date(Date.now() - 3600000).toISOString() },
  { id: 't3', subject: 'Booking agent not available', status: 'resolved', priority: 'low', category: 'Availability', caller: 'Web Visitor', agent: 'Booking Agent', created: new Date(Date.now() - 86400000).toISOString(), updated: new Date(Date.now() - 43200000).toISOString() },
  { id: 't4', subject: 'Greeting sounds unnatural', status: 'open', priority: 'medium', category: 'Voice', caller: null, agent: 'Sales Agent', created: new Date(Date.now() - 259200000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
  { id: 't5', subject: 'Customer asked for human agent', status: 'closed', priority: 'low', category: 'Escalation', caller: '+1 (555) 456-7890', agent: 'Support Agent', created: new Date(Date.now() - 345600000).toISOString(), updated: new Date(Date.now() - 259200000).toISOString() },
];

const STATUS_META = {
  open: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Open' },
  'in-progress': { color: 'text-[var(--primary)]', bg: 'bg-[var(--glow)]', label: 'In Progress' },
  resolved: { color: 'text-green-400', bg: 'bg-green-500/15', label: 'Resolved' },
  closed: { color: 'text-[var(--body)]', bg: 'bg-[var(--muted)]', label: 'Closed' },
};

const PRIORITY_META = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-[var(--body)]',
};

export default function Tickets() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return DUMMY_TICKETS.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (search && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  const counts = useMemo(() => {
    const c = { all: DUMMY_TICKETS.length, open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    DUMMY_TICKETS.forEach((t) => { if (c[t.status] !== undefined) c[t.status]++; });
    return c;
  }, []);

  return (
    <div className="space-y-5 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Issues your AI agent captured during calls. SLA: 3h</p>

      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'in-progress', 'resolved', 'closed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === 'all' ? 'All' : STATUS_META[s]?.label || s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <div className="form-card">
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
          <input className="input pl-9 text-xs" placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-2">
          {filtered.map((ticket) => {
            const status = STATUS_META[ticket.status] || STATUS_META.open;
            return (
              <div key={ticket.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate">{ticket.subject}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--body)]">
                    <span className={`font-medium ${PRIORITY_META[ticket.priority]}`}>{ticket.priority}</span>
                    <span>·</span>
                    <span>{ticket.category}</span>
                    {ticket.caller && <><span>·</span><span className="font-mono">{ticket.caller}</span></>}
                    <span>·</span>
                    <span>{ticket.agent}</span>
                  </div>
                </div>
                <div className="text-[10px] text-[var(--body)] shrink-0">
                  {new Date(ticket.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}