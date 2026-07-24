import { useState, useMemo } from 'react';
import { TrendingUp, Phone, Clock, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

const DUMMY_CALLS = Array.from({ length: 30 }, (_, i) => ({
  id: `call_${i}`,
  from: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  direction: Math.random() > 0.3 ? 'inbound' : 'outbound',
  duration: Math.floor(Math.random() * 300) + 15,
  sentiment: ['Positive', 'Neutral', 'Negative'][Math.floor(Math.random() * 3)],
  date: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
  agent: ['Sales Agent', 'Support Agent', 'Booking Agent'][Math.floor(Math.random() * 3)],
}));

const StatTile = ({ label, value, icon: Icon, color }) => (
  <div className="form-card flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color }}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">{label}</div>
      <div className="text-xl font-bold text-[var(--foreground)]">{value}</div>
    </div>
  </div>
);

export default function Analytics() {
  const [typeFilter] = useState('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return DUMMY_CALLS;
    return DUMMY_CALLS.filter((c) => c.direction === typeFilter);
  }, [typeFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    avgDuration: Math.round(filtered.reduce((s, c) => s + c.duration, 0) / filtered.length),
    positive: filtered.filter((c) => c.sentiment === 'Positive').length,
    negative: filtered.filter((c) => c.sentiment === 'Negative').length,
    neutral: filtered.filter((c) => c.sentiment === 'Neutral').length,
  }), [filtered]);

  const volumeDays = useMemo(() => {
    const days = {};
    filtered.forEach((c) => {
      const d = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).slice(-7);
  }, [filtered]);
  const maxVol = Math.max(...volumeDays.map(([, v]) => v), 1);

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Your call history and activity across all your numbers.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Calls" value={stats.total} icon={Phone} color="var(--primary)" />
        <StatTile label="Avg Duration" value={`${stats.avgDuration}s`} icon={Clock} color="var(--accent)" />
        <StatTile label="Positive" value={stats.positive} icon={ThumbsUp} color="#16A34A" />
        <StatTile label="Negative" value={stats.negative} icon={ThumbsDown} color="#EF4444" />
      </div>

      <div className="form-card">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Call Volume (Last 7 Days)</h3>
        <div className="flex items-end gap-2 h-40">
          {volumeDays.map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${(count / maxVol) * 100}%`,
                  background: 'linear-gradient(180deg, var(--primary), var(--accent))',
                  minHeight: '4px',
                }}
              ></div>
              <span className="text-[10px] text-[var(--body)]">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-card">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Sentiment Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Positive', count: stats.positive, color: '#16A34A' },
            { label: 'Neutral', count: stats.neutral, color: '#F59E0B' },
            { label: 'Negative', count: stats.negative, color: '#EF4444' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-[var(--body)] w-16">{label}</span>
              <div className="flex-1 h-3 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%`, background: color }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-[var(--foreground)] w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-card">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Recent Calls</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">From</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Direction</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Duration</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Sentiment</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-wider text-[var(--body)] font-semibold">Agent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((call) => (
                <tr key={call.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="py-2.5 font-mono text-xs text-[var(--foreground)]">{call.from}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium ${call.direction === 'inbound' ? 'text-green-400' : 'text-[var(--primary)]'}`}>
                      {call.direction === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--body)] text-xs">{Math.floor(call.duration / 60)}m {call.duration % 60}s</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: call.sentiment === 'Positive' ? '#16A34A' : call.sentiment === 'Negative' ? '#EF4444' : '#F59E0B' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: call.sentiment === 'Positive' ? '#16A34A' : call.sentiment === 'Negative' ? '#EF4444' : '#F59E0B' }}></span>
                      {call.sentiment}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--body)] text-xs">{call.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}