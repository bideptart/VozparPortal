import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

const DUMMY_AGENTS = [
  {
    id: '1e0e75ae-3ff0-4027-9b1d-31a9cd6d430c',
    name: 'TKOS',
    type: 'voice',
    number: '+18173496752',
    status: 'live',
    lastActive: 'Jul 21, 5:04 PM',
    callsToday: 0,
    editingMode: 'Prompt',
    direction: 'Inbound',
    preview: false,
  },
  {
    id: 'a0f48513-2971-44ef-b7a7-71b4b11dc7a1',
    name: 'My Agent',
    type: 'chat',
    number: null,
    status: 'enabled',
    lastActive: 'Jul 16, 10:42 AM',
    callsToday: 0,
    editingMode: 'Prompt',
    direction: 'Chat',
    preview: true,
  },
];

const LEGACY_DUMMY_AGENTS = [
  { id: 'ag_001', name: 'Sales Agent', type: 'voice', number: '+1 (555) 000-1234', status: 'active', callsToday: 24, sentiment: 92 },
  { id: 'ag_002', name: 'Support Agent', type: 'voice', number: '+1 (555) 000-5678', status: 'active', callsToday: 18, sentiment: 87 },
  { id: 'ag_003', name: 'Booking Agent', type: 'chat', number: null, status: 'active', callsToday: 35, sentiment: 95 },
  { id: 'ag_004', name: 'Intake Agent', type: 'voice', number: '+1 (555) 000-9012', status: 'active', callsToday: 12, sentiment: 78 },
  { id: 'ag_005', name: 'FAQ Bot', type: 'chat', number: null, status: 'inactive', callsToday: 0, sentiment: 0 },
];

function truncateId(id) {
  return `${id.slice(0, 8)}...`;
}

function customerStats(agents) {
  const activeAgents = agents.filter((agent) => agent.status === 'live' || agent.status === 'enabled').length;
  const voiceAgents = agents.filter((agent) => agent.type === 'voice').length;
  const chatAgents = agents.filter((agent) => agent.type === 'chat').length;
  const callsToday = agents.reduce((sum, agent) => sum + agent.callsToday, 0);

  return [
    { label: 'Active Agents', value: activeAgents, meta: 'Currently running', Icon: Zap },
    { label: 'Voice Agents', value: voiceAgents, meta: 'Inbound & outbound', Icon: Phone },
    { label: 'Chat Agents', value: chatAgents, meta: 'Website & messaging', Icon: MessageCircle },
    { label: 'Calls Today', value: callsToday, meta: '+12% vs yesterday', Icon: TrendingUp },
  ];
}

function CustomerStatusChip({ agent }) {
  const live = agent.status === 'live';
  return (
    <span className={`agents-ref-chip ${live ? 'is-live' : 'is-enabled'}`}>
      <span className="agents-ref-chip-dot" />
      {live ? 'Live' : 'Enabled'}
    </span>
  );
}

function CustomerTypeChip({ agent }) {
  if (agent.type === 'voice') {
    return <span className="agents-ref-chip is-inbound">Inbound</span>;
  }
  return <span className="agents-ref-chip is-chat">Chat</span>;
}

function AdminStatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
      status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-[var(--muted)] text-[var(--body)]'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-[var(--body)]'}`}></span>
      {status}
    </span>
  );
}

function CustomerAgentsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DUMMY_AGENTS.filter((agent) => {
      if (typeFilter !== 'all' && agent.type !== typeFilter) return false;
      if (!q) return true;
      return (
        agent.name.toLowerCase().includes(q)
        || agent.id.toLowerCase().includes(q)
        || (agent.number || '').toLowerCase().includes(q)
      );
    });
  }, [query, typeFilter]);

  const stats = useMemo(() => customerStats(DUMMY_AGENTS), []);

  return (
    <div className="agents-ref-shell animate-fade-up">
      <div className="agents-ref-toolbar">
        <div className="agents-ref-toolbar-spacer" />
        <div className="agents-ref-toolbar-actions">
          <div className="agents-ref-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, or number"
              aria-label="Search agents"
            />
          </div>
          <button
            type="button"
            className="agents-ref-primary-btn"
            onClick={() => navigate('/dashboard/agent-detail')}
          >
            + New Agent
          </button>
        </div>
      </div>

      <div className="agents-ref-stats">
        {stats.map(({ label, value, meta, Icon }) => (
          <div key={label} className="agents-ref-stat-card">
            <span className="agents-ref-stat-icon">
              <Icon size={14} />
            </span>
            <div className="agents-ref-stat-label">{label}</div>
            <div className="agents-ref-stat-value">{value}</div>
            <div className="agents-ref-stat-meta">{meta}</div>
          </div>
        ))}
      </div>

      <div className="agents-ref-filter-row">
        <div className="agents-ref-select-wrap">
          <select
            className="agents-ref-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter agent type"
          >
            <option value="all">All types</option>
            <option value="voice">Voice agents</option>
            <option value="chat">Chat agents</option>
          </select>
          <ChevronDown size={15} className="agents-ref-select-icon" />
        </div>
      </div>

      <div className="agents-ref-table-card">
        <div className="agents-ref-table-wrap">
          <table className="agents-ref-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Agent ID</th>
                <th>Editing mode</th>
                <th>Type</th>
                <th>Status</th>
                <th>Phone number</th>
                <th>Today&apos;s calls</th>
                <th>Last active</th>
                <th aria-label="Open row" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr
                  key={agent.id}
                  className="agents-ref-row"
                  onClick={() => navigate(agent.type === 'chat' ? `/dashboard/agent-detail-chat?id=${agent.id}` : `/dashboard/agent-detail?id=${agent.id}`)}
                >
                  <td>
                    <div className="agents-ref-agent-cell">
                      <span className="agents-ref-agent-icon">
                        {agent.type === 'voice' ? <Phone size={15} /> : <MessageCircle size={15} />}
                      </span>
                      <div className="agents-ref-agent-meta">
                        <strong>{agent.name}</strong>
                        {agent.preview && <span className="agents-ref-preview-chip">preview</span>}
                      </div>
                    </div>
                  </td>
                  <td className="agents-ref-mono">
                    {truncateId(agent.id)}
                  </td>
                  <td>
                    <span className="agents-ref-chip is-editing">
                      <Sparkles size={11} />
                      {agent.editingMode}
                    </span>
                  </td>
                  <td><CustomerTypeChip agent={agent} /></td>
                  <td><CustomerStatusChip agent={agent} /></td>
                  <td className="agents-ref-phone">{agent.number || '–'}</td>
                  <td>
                    <div className="agents-ref-calls">
                      <strong>{agent.callsToday}</strong>
                      <span>Today</span>
                    </div>
                  </td>
                  <td>
                    <div className="agents-ref-last-active">
                      <span className="agents-ref-last-active-dot" />
                      {agent.lastActive}
                    </div>
                  </td>
                  <td>
                    <span className="agents-ref-row-arrow">
                      <ChevronRight size={15} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="agents-ref-footnote">
        Voice and chat agents live here together. Click an agent to configure it. Chat agents are a preview - only inbound voice agents are live today.
      </p>
    </div>
  );
}

function AdminAgentsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return LEGACY_DUMMY_AGENTS.filter((agent) => {
      if (typeFilter !== 'all' && agent.type !== typeFilter) return false;
      if (query && !agent.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, typeFilter]);

  const stats = useMemo(() => ({
    active: LEGACY_DUMMY_AGENTS.filter((agent) => agent.status === 'active').length,
    voice: LEGACY_DUMMY_AGENTS.filter((agent) => agent.type === 'voice').length,
    chat: LEGACY_DUMMY_AGENTS.filter((agent) => agent.type === 'chat').length,
    callsToday: LEGACY_DUMMY_AGENTS.reduce((sum, agent) => sum + agent.callsToday, 0),
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
          {['all', 'voice', 'chat'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === type ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
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
                <AdminStatusPill status={agent.status} />
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

export default function AgentsList() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) return <AdminAgentsList />;
  return <CustomerAgentsList />;
}
