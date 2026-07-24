import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Zap, Phone, TrendingUp, Bot, Volume2, Users } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const DUMMY_STATS = {
  totalCalls: 1247,
  minutesUsed: 3420,
  activeAgents: 5,
  avgSentiment: 87,
};

const DUMMY_RECENT_CALLS = [
  { id: 1, from: '+1 (555) 123-4567', agent: 'Sales Agent', duration: '2m 34s', sentiment: 'Positive', time: '2 hours ago' },
  { id: 2, from: '+1 (555) 987-6543', agent: 'Support Agent', duration: '5m 12s', sentiment: 'Neutral', time: '3 hours ago' },
  { id: 3, from: '+1 (555) 456-7890', agent: 'Sales Agent', duration: '1m 45s', sentiment: 'Positive', time: '5 hours ago' },
  { id: 4, from: '+1 (555) 321-0987', agent: 'Booking Agent', duration: '3m 22s', sentiment: 'Positive', time: '6 hours ago' },
  { id: 5, from: '+1 (555) 654-3210', agent: 'Support Agent', duration: '4m 08s', sentiment: 'Negative', time: '8 hours ago' },
];

const DUMMY_NUMBERS = [
  { id: 1, value: '+1 (555) 000-1234', friendlyName: 'Main Line', status: 'active' },
  { id: 2, value: '+1 (555) 000-5678', friendlyName: 'Support', status: 'active' },
];

const StatCard = ({ icon: Icon, label, value, color, loading }) => (
  <div className="form-card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0`} style={{ background: color }}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-[var(--body)] font-semibold mb-0.5">{label}</div>
      <div className="text-2xl font-bold text-[var(--foreground)] truncate">{loading ? '—' : value}</div>
    </div>
  </div>
);

const sentimentColor = (s) => {
  if (s === 'Positive') return '#16A34A';
  if (s === 'Negative') return '#EF4444';
  return '#F59E0B';
};

export default function Overview() {
  const { currentUser, demoMode } = useApp();
  const [stats] = useState(DUMMY_STATS);
  const [calls] = useState(DUMMY_RECENT_CALLS);
  const [numbers] = useState(DUMMY_NUMBERS);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Phone} label="Total Calls" value={stats.totalCalls.toLocaleString()} color="var(--primary)" />
        <StatCard icon={AlarmClock} label="Minutes Used" value={stats.minutesUsed.toLocaleString()} color="var(--accent)" />
        <StatCard icon={Bot} label="Active Agents" value={stats.activeAgents} color="var(--secondary)" />
        <StatCard icon={TrendingUp} label="Avg Sentiment" value={`${stats.avgSentiment}%`} color="#16A34A" />
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="form-card border-dashed border-[var(--accent)] bg-[var(--glow)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">Demo Mode Active</div>
              <div className="text-xs text-[var(--body)]">You're viewing sample data. Connect a backend to see real data.</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2 form-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Volume2 size={16} className="text-[var(--primary)]" />
              Recent Calls
            </h2>
            <Link to="/dashboard/calls" className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">From</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Agent</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Duration</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Sentiment</th>
                  <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                    <td className="py-3 font-mono text-xs text-[var(--foreground)]">{call.from}</td>
                    <td className="py-3 text-[var(--body)]">{call.agent}</td>
                    <td className="py-3 text-[var(--body)]">{call.duration}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: sentimentColor(call.sentiment) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentimentColor(call.sentiment) }}></span>
                        {call.sentiment}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--body)] text-xs">{call.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="form-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Users size={16} className="text-[var(--primary)]" />
              Phone Numbers
            </h2>
            <Link to="/dashboard/overview" className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]">Manage →</Link>
          </div>
          <div className="space-y-3">
            {numbers.map((num) => (
              <div key={num.id} className="p-3 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[var(--foreground)]">{num.friendlyName}</div>
                    <div className="text-xs font-mono text-[var(--body)] mt-0.5">{num.value}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary w-full mt-4 py-2 text-xs">
            + Add Number
          </button>
        </div>
      </div>
    </div>
  );
}