import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, UserPlus, Hash, PhoneIncoming, PhoneOutgoing, Search, Activity } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtTs = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

const timeAgo = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const minsAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

// Shown only when the real feed comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks.
const DEMO_EVENTS = [
  { id: 'demo-e1', type: 'signup', ts: minsAgo(4), title: 'priya@northwind.example signed up', detail: 'role=customer · plan=Growth $79' },
  { id: 'demo-e2', type: 'number', ts: minsAgo(6), title: '+1 415 555 0142 attached', detail: 'twilio_sid=CA1a2b3c4d5e6f7g8h9i0j · owner=priya@northwind.example' },
  { id: 'demo-e3', type: 'call', ts: minsAgo(11), direction: 'inbound', status: 'completed', title: 'Inbound call answered', detail: 'from=+1 212 555 0110 to=+1 415 555 0142 · 3m42s' },
  { id: 'demo-e4', type: 'call', ts: minsAgo(19), direction: 'outbound', status: 'completed', title: 'Outbound call completed', detail: 'from=+1 415 555 0142 to=+1 646 555 0110 · 1m08s' },
  { id: 'demo-e5', type: 'signup', ts: minsAgo(32), title: 'owen@bluepeak.example signed up', detail: 'role=customer · plan=Starter $29' },
  { id: 'demo-e6', type: 'call', ts: minsAgo(47), direction: 'inbound', status: 'no-answer', title: 'Inbound call missed', detail: 'from=+1 305 555 0163 to=+1 212 555 0198 · 0s' },
  { id: 'demo-e7', type: 'number', ts: minsAgo(58), title: '+1 646 555 0110 attached', detail: 'twilio_sid=CA3c4d5e6f7g8h9i0j1k2l · owner=maria@larkspur.example' },
  { id: 'demo-e8', type: 'call', ts: minsAgo(74), direction: 'inbound', status: 'failed', title: 'Inbound call failed', detail: 'from=+1 312 555 0177 to=+1 646 555 0110 · 0s' },
];

const TYPE_META = {
  signup: { label: 'Signups', icon: UserPlus, color: 'text-lime-400', bg: 'bg-lime-500/15' },
  number: { label: 'Numbers', icon: Hash, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  call: { label: 'Calls', icon: PhoneIncoming, color: 'text-amber-400', bg: 'bg-amber-500/15' },
};

const CALL_STATUS_STYLE = {
  completed: 'bg-lime-500/15 text-lime-400',
  'no-answer': 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
  busy: 'bg-red-500/15 text-red-400',
};

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-mute" />
      <span className="text-sm font-bold text-[var(--foreground)]">{value}</span>
      <span className="text-[11px] text-mute">{label}</span>
    </div>
  );
}

function EventRow({ e }) {
  const meta = TYPE_META[e.type] || TYPE_META.signup;
  const Icon = e.type === 'call' && e.direction === 'outbound' ? PhoneOutgoing : meta.icon;
  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-white/[0.03] transition">
      <span className={`shrink-0 w-8 h-8 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center mt-0.5`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--foreground)] truncate">{e.title}</span>
          {e.type === 'call' && (
            <span className={`pill text-[9px] uppercase tracking-wider font-semibold ${CALL_STATUS_STYLE[e.status] || 'bg-slate-500/15 text-mute'}`}>
              {e.status}
            </span>
          )}
        </div>
        <div className="text-xs text-mute font-mono truncate">{e.detail}</div>
      </div>
      <span className="shrink-0 text-[11px] text-mute whitespace-nowrap" title={fmtTs(e.ts)}>{timeAgo(e.ts)}</span>
    </div>
  );
}

export default function Logs() {
  const { currentUser } = useApp();
  const [calls, setCalls] = useState(() => readCache('admin.logs.calls', currentUser?.id) ?? null);
  const [users, setUsers] = useState(() => readCache('admin.logs.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const [c, u] = await Promise.all([
        api('/api/twilio/calls?limit=50'),
        api('/api/admin/users'),
      ]);
      const nextCalls = c.calls || [];
      const nextUsers = u.users || [];
      setCalls(nextCalls);
      setUsers(nextUsers);
      writeCache('admin.logs.calls', currentUser?.id, nextCalls);
      writeCache('admin.logs.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setCalls((prev) => prev ?? []);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const events = useMemo(() => {
    const built = [];
    for (const u of users || []) {
      if (u.createdAt) {
        built.push({
          id: `signup-${u.id}`, type: 'signup', ts: u.createdAt,
          title: `${u.email} signed up`,
          detail: `role=${u.role}${u.plan ? ` · plan=${u.plan.label} $${u.plan.amount}` : ''}`,
        });
      }
      if (u.twilioSid) {
        built.push({
          id: `number-${u.id}`, type: 'number', ts: u.createdAt,
          title: `${u.number} attached`,
          detail: `twilio_sid=${u.twilioSid} · owner=${u.email}`,
        });
      }
    }
    for (const c of calls || []) {
      built.push({
        id: `call-${c.sid}`, type: 'call', ts: c.startTime,
        direction: c.direction || 'inbound', status: c.status,
        title: `${c.direction === 'outbound' ? 'Outbound' : 'Inbound'} call ${c.status}`,
        detail: `from=${c.from || '?'} to=${c.to || '?'} · ${c.duration}s · sid=${c.sid}`,
      });
    }
    built.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    return built;
  }, [users, calls]);

  // Falls back to demo events only when the real feed comes back
  // genuinely empty — never overrides real data.
  const usingDemo = users !== null && calls !== null && events.length === 0;
  const effectiveEvents = users === null || calls === null ? null : (events.length > 0 ? events : DEMO_EVENTS);

  const counts = useMemo(() => {
    const list = effectiveEvents || [];
    return {
      all: list.length,
      signup: list.filter((e) => e.type === 'signup').length,
      number: list.filter((e) => e.type === 'number').length,
      call: list.filter((e) => e.type === 'call').length,
    };
  }, [effectiveEvents]);

  const filtered = useMemo(() => {
    let list = effectiveEvents || [];
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q));
    }
    return list;
  }, [effectiveEvents, typeFilter, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute text-sm">Live signup events, number provisioning, and Twilio call activity.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {effectiveEvents === null && <div className="form-card text-center text-mute py-10">Loading…</div>}

      {effectiveEvents && (
        <>
          <div className="grid sm:grid-cols-4 gap-2">
            <StatChip icon={Activity} label="Total events" value={counts.all} />
            <StatChip icon={UserPlus} label="Signups" value={counts.signup} />
            <StatChip icon={Hash} label="Numbers" value={counts.number} />
            <StatChip icon={PhoneIncoming} label="Calls" value={counts.call} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'signup', 'number', 'call'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`pill text-xs font-semibold transition ${
                  typeFilter === t ? 'bg-[var(--primary)] text-white' : 'bg-black/20 text-mute hover:text-[var(--foreground)]'
                }`}
              >
                {t === 'all' ? 'All' : TYPE_META[t].label}
              </button>
            ))}
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-mute absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                className="input text-sm pl-8 w-full"
                placeholder="Search events…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card !p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center text-mute py-10">No events match this filter.</div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((e) => <EventRow key={e.id} e={e} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
