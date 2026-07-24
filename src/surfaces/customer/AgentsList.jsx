import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Phone, MessageCircle, TrendingUp, Search, Zap } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const DUMMY_AGENTS = [
  { id: 'ag_001', name: 'Sales Agent', type: 'voice', number: '+1 (555) 000-1234', status: 'active', lastActive: new Date(Date.now() - 3600000).toISOString(), callsToday: 24, sentiment: 92 },
  { id: 'ag_002', name: 'Support Agent', type: 'voice', number: '+1 (555) 000-5678', status: 'active', lastActive: new Date(Date.now() - 7200000).toISOString(), callsToday: 18, sentiment: 87 },
  { id: 'ag_003', name: 'Booking Agent', type: 'chat', number: null, status: 'active', lastActive: new Date(Date.now() - 1800000).toISOString(), callsToday: 35, sentiment: 95 },
  { id: 'ag_004', name: 'Intake Agent', type: 'voice', number: '+1 (555) 000-9012', status: 'active', lastActive: new Date(Date.now() - 86400000).toISOString(), callsToday: 12, sentiment: 78 },
  { id: 'ag_005', name: 'FAQ Bot', type: 'chat', number: null, status: 'inactive', lastActive: new Date(Date.now() - 259200000).toISOString(), callsToday: 0, sentiment: 0 },
];

const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
    status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-[var(--muted)] text-[var(--body)]'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-[var(--body)]'}`}></span>
    {status}
  </span>
);

export default function AgentsList() {
  const { currentUser, demoMode } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const agents = DUMMY_AGENTS;
  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, typeFilter]);

  const stats = useMemo(() => ({
    active: agents.filter((a) => a.status === 'active').length,
    voice: agents.filter((a) => a.type === 'voice').length,
    chat: agents.filter((a) => a.type === 'chat').length,
    callsToday: agents.reduce((sum, a) => sum + a.callsToday, 0),
  }), []);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)]" />
          <input
            className="input pl-9"
            placeholder="Search agents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'voice', 'chat'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents', value: stats.active, icon: Bot, color: 'var(--primary)' },
          { label: 'Voice Agents', value: stats.voice, icon: Phone, color: 'var(--accent)' },
          { label: 'Chat Agents', value: stats.chat, icon: MessageCircle, color: 'var(--secondary)' },
          { label: 'Calls Today', value: stats.callsToday, icon: Zap, color: '#16A34A' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="form-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color }}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">{label}</div>
              <div className="text-xl font-bold text-[var(--foreground)]">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="form-card flex items-center gap-4 cursor-pointer hover:border-[var(--primary)] transition-colors"
            onClick={() => navigate(`/dashboard/agent-detail?id=${agent.id}`)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
              agent.type === 'voice' ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]' : 'bg-gradient-to-br from-[var(--secondary)] to-[var(--link)]'
            }`}>
              {agent.type === 'voice' ? <Phone size={18} /> : <MessageCircle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)] truncate">{agent.name}</span>
                <StatusPill status={agent.status} />
              </div>
              <div className="text-xs text-[var(--body)] mt-0.5 font-mono">{agent.number || 'Web widget'}</div>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-right">
              <div>
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold">Calls</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{agent.callsToday}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--body)] font-semibold">Sentiment</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{agent.sentiment ? `${agent.sentiment}%` : '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}