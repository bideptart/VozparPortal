import { useState, useMemo } from 'react';
import { FileText, Search, Phone, MessageSquare } from 'lucide-react';

const DUMMY_RECORDINGS = [
  { id: 'r1', from: '+1 (555) 123-4567', direction: 'inbound', duration: 154, agent: 'Sales Agent', date: new Date(Date.now() - 3600000).toISOString(), hasRecording: true },
  { id: 'r2', from: '+1 (555) 987-6543', direction: 'inbound', duration: 312, agent: 'Support Agent', date: new Date(Date.now() - 7200000).toISOString(), hasRecording: true },
  { id: 'r3', from: '+1 (555) 456-7890', direction: 'inbound', duration: 105, agent: 'Sales Agent', date: new Date(Date.now() - 10800000).toISOString(), hasRecording: true },
  { id: 'r4', from: '+1 (555) 321-0987', direction: 'outbound', duration: 202, agent: 'Booking Agent', date: new Date(Date.now() - 14400000).toISOString(), hasRecording: false },
  { id: 'r5', from: '+1 (555) 654-3210', direction: 'inbound', duration: 89, agent: 'Support Agent', date: new Date(Date.now() - 18000000).toISOString(), hasRecording: true },
];

const DUMMY_CHATS = [
  { id: 'ch1', from: 'Web Visitor', agent: 'Booking Agent', messages: 8, date: new Date(Date.now() - 5400000).toISOString() },
  { id: 'ch2', from: 'Web Visitor', agent: 'Support Agent', messages: 12, date: new Date(Date.now() - 9000000).toISOString() },
  { id: 'ch3', from: 'Web Visitor', agent: 'Sales Agent', messages: 5, date: new Date(Date.now() - 12600000).toISOString() },
];

const fmtDuration = (s) => {
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function Reports() {
  const [logsTab, setLogsTab] = useState('call');
  const [search, setSearch] = useState('');

  const filteredRecordings = useMemo(() => {
    return DUMMY_RECORDINGS.filter((r) => {
      if (search && !r.from.includes(search) && !r.agent.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search]);

  const filteredChats = useMemo(() => {
    return DUMMY_CHATS.filter((c) => {
      if (search && !c.from.toLowerCase().includes(search.toLowerCase()) && !c.agent.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search]);

  return (
    <div className="space-y-5 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Call and chat history with recordings and transcripts.</p>

      <div className="form-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setLogsTab('call')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${logsTab === 'call' ? 'btn-primary' : 'btn-ghost'}`}>
              <Phone size={14} /> Call Logs
            </button>
            <button onClick={() => setLogsTab('chat')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${logsTab === 'chat' ? 'btn-primary' : 'btn-ghost'}`}>
              <MessageSquare size={14} /> Chat Logs
            </button>
          </div>
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input className="input pl-9 text-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {logsTab === 'call' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">From</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Direction</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Duration</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Agent</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Recording</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordings.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer">
                    <td className="py-3 font-mono text-xs text-[var(--foreground)]">{r.from}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium ${r.direction === 'inbound' ? 'text-green-400' : 'text-[var(--primary)]'}`}>
                        {r.direction === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--body)] text-xs">{fmtDuration(r.duration)}</td>
                    <td className="py-3 text-[var(--body)] text-xs">{r.agent}</td>
                    <td className="py-3">
                      {r.hasRecording ? (
                        <button className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]">▶ Play</button>
                      ) : (
                        <span className="text-xs text-[var(--body)] opacity-50">—</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--body)] text-xs">{new Date(r.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--secondary)] to-[var(--link)] flex items-center justify-center">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{c.from}</div>
                    <div className="text-[11px] text-[var(--body)]">{c.agent} · {c.messages} messages</div>
                  </div>
                </div>
                <div className="text-xs text-[var(--body)]">{new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}