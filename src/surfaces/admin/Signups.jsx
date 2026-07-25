import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Phone, Mail, Calendar, Star } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtRelative = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleDateString();
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Build the canonical list of DIDs for a signup row. We prefer the
// `user.numbers[]` array (one row per provisioned DID, each with its own
// plan tier), and fall back to the legacy single-number shape for any
// row that pre-dates the user_numbers backfill.
const didsFor = (u) => {
  if (Array.isArray(u.numbers) && u.numbers.length) return u.numbers;
  if (u.number) {
    return [{
      id: `legacy-${u.id}`,
      value: u.number,
      isPrimary: true,
      planCycle: 'monthly',
      plan: u.plan ? { ...u.plan, id: u.plan.label?.toLowerCase() || 'unknown' } : null,
    }];
  }
  return [];
};

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13),
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(11),
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9),
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true, planCycle: 'yearly', plan: { label: 'Scale', amount: 1990, min: 1200 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } },
    ] },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(5),
    numbers: [{ id: 'd4', value: '+1 312 555 0177', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  { id: 'demo-5', company: 'Amberlight Cafe', name: 'Sara Lund', email: 'sara@amberlight.example', createdAt: daysAgo(2),
    numbers: [{ id: 'd5', value: '+1 305 555 0163', isPrimary: true, planCycle: 'monthly', plan: { label: 'Starter', amount: 29, min: 100 } }] },
  { id: 'demo-6', company: 'Ridgeline Law Group', name: 'Dev Patel', email: 'dev@ridgeline.example', createdAt: hoursAgo(18),
    numbers: [{ id: 'd6', value: '+1 720 555 0129', isPrimary: true, planCycle: 'monthly', plan: { label: 'Scale', amount: 199, min: 1200 } }] },
  { id: 'demo-7', company: 'Solace Wellness', name: 'Emma Ross', email: 'emma@solace.example', createdAt: hoursAgo(3),
    numbers: [{ id: 'd7', value: '+1 512 555 0184', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 79, min: 500 } }] },
  // No number yet — demonstrates the "No number" state too.
  { id: 'demo-8', company: 'Cobalt Freight', name: 'Alex Kim', email: 'alex@cobalt.example', createdAt: hoursAgo(6), numbers: [] },
];

// Inline text readout instead of any kind of card/tile — the master-detail
// layout below needs the vertical room, and five numbers don't need five
// boxes to be scannable.
function StatsLine({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--border)]">·</span>}
          <span className="font-bold text-[var(--foreground)]">{it.value}</span>
          <span className="text-[var(--body)]">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

// Master-detail split: a compact clickable roster on the left, full profile
// for whichever customer is selected on the right — a different browsing
// model from a table/timeline (pick one, inspect it), closer to how an
// inbox or contacts app works.
function SignupExplorer({ users }) {
  const sorted = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [users],
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? null);
  const selected = sorted.find((u) => u.id === selectedId) || sorted[0] || null;

  if (sorted.length === 0) {
    return <div className="form-card text-center text-mute py-10">No signups yet.</div>;
  }

  const dids = selected ? didsFor(selected) : [];
  const isLive = dids.length > 0;
  const totalMrr = dids.reduce((a, d) => {
    const amt = Number(d.plan?.amount) || 0;
    return a + (d.planCycle === 'yearly' ? amt / 12 : amt);
  }, 0);
  const totalMin = dids.reduce((a, d) => a + (Number(d.plan?.min) || 0), 0);

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
      {/* Roster */}
      <div className="form-card p-0 overflow-hidden">
        <div className="max-h-[560px] overflow-y-auto divide-y divide-[var(--border)]">
          {sorted.map((u) => {
            const live = didsFor(u).length > 0;
            const active = u.id === selected?.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  active ? 'bg-[var(--glow)]' : 'hover:bg-white/[0.03]'
                }`}
                style={active ? { boxShadow: 'inset 3px 0 0 var(--primary)' } : undefined}
              >
                <span className="relative shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] flex items-center justify-center text-white text-xs font-bold">
                  {initials(u.company || u.name)}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--popover)] ${live ? 'bg-lime-400' : 'bg-amber-400'}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate ${active ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--foreground)]'}`}>
                    {u.company || u.name}
                  </div>
                  <div className="text-xs text-mute truncate">{fmtRelative(u.createdAt)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected && (
        <div className="form-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] flex items-center justify-center text-white text-lg font-bold shrink-0">
                {initials(selected.company || selected.name)}
              </span>
              <div>
                <div className="text-lg font-bold text-[var(--foreground)]">{selected.company || selected.name}</div>
                <div className="text-sm text-mute flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selected.email}</div>
              </div>
            </div>
            <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${
              isLive ? 'bg-lime-500/15 text-lime-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {isLive ? 'Live' : 'No number'}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-mute border-y border-[var(--border)] py-3">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined {fmtDate(selected.createdAt)}</span>
            {dids.length > 0 && (
              <>
                <span>{fmtUSD(totalMrr)}/mo across {dids.length} plan{dids.length > 1 ? 's' : ''}</span>
                <span>{totalMin.toLocaleString()} min included</span>
              </>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-mute font-semibold mb-2">Plans &amp; numbers</div>
            {dids.length === 0 ? (
              <div className="text-sm text-mute italic">— No DID provisioned —</div>
            ) : (
              <div className="flex flex-col gap-2">
                {dids.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-4 h-4 text-[var(--body)] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-[var(--foreground)] flex items-center gap-1.5">
                          {d.value}
                          {d.isPrimary && <Star className="w-3 h-3 text-lime-400 fill-lime-400" />}
                        </div>
                        <div className="text-xs text-mute">{d.plan?.label || '—'} · {d.plan?.min || 0} min</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-[var(--foreground)]">{fmtUSD(d.plan?.amount)}</div>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${d.planCycle === 'yearly' ? 'text-emerald-400' : 'text-[var(--body)]'}`}>
                        {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Signups() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.signups.users', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const u = await api('/api/admin/users');
      const nextUsers = u.users.filter((x) => x.role === 'customer');
      setUsers(nextUsers);
      writeCache('admin.signups.users', currentUser?.id, nextUsers);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data. Every stat below is
  // derived from this same list so it can never disagree with what's
  // shown in the roster (previously "Total customers"/"Last 24 hr"/"Last
  // 7 days" came from a separate /api/admin/stats call that could fail
  // independently of the user list — exactly the "Cannot read properties
  // of undefined (reading 'filter')" state this page used to get stuck in).
  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);

  const liveCount = (effectiveUsers || []).filter((u) => didsFor(u).length > 0).length;
  const totalDids = useMemo(
    () => (effectiveUsers || []).reduce((a, u) => a + didsFor(u).length, 0),
    [effectiveUsers],
  );
  const last24h = useMemo(
    () => (effectiveUsers || []).filter((u) => u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 86400000).length,
    [effectiveUsers],
  );
  const last7d = useMemo(
    () => (effectiveUsers || []).filter((u) => u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000).length,
    [effectiveUsers],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute">Every customer who completed signup — with every DID + plan they bought.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh signups" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <StatsLine items={[
        { label: 'total customers', value: effectiveUsers?.length ?? '—' },
        { label: 'last 24 hr', value: effectiveUsers ? last24h : '—' },
        { label: 'last 7 days', value: effectiveUsers ? last7d : '—' },
        { label: 'live (with #)', value: effectiveUsers ? liveCount : '—' },
        { label: 'plans sold', value: effectiveUsers ? totalDids : '—' },
      ]} />

      {effectiveUsers === null ? (
        <div className="form-card text-center text-mute py-10">Loading…</div>
      ) : (
        <SignupExplorer users={effectiveUsers} />
      )}
    </div>
  );
}
