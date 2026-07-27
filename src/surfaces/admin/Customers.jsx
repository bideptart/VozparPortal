import { useEffect, useState } from 'react';
import { RefreshCw, Mail, Phone, Hash, Wrench, Trash2, RotateCw, Calendar, Tag } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks.
const DEMO_USERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(13), userType: 'customer',
    number: '+1 415 555 0142', twilioSid: 'CA1a2b3c4d5e6f7g8h9i0j', minutesUsed: 210, plan: { amount: 79, min: 500 } },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(11), userType: 'customer',
    number: '+1 212 555 0198', twilioSid: 'CA2b3c4d5e6f7g8h9i0j1k', minutesUsed: 95, plan: { amount: 29, min: 100 } },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9), userType: 'customer', viaPortal: 'acme.io',
    number: '+1 646 555 0110', twilioSid: 'CA3c4d5e6f7g8h9i0j1k2l', minutesUsed: 1180, plan: { amount: 1990, min: 1200 } },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(5), userType: 'customer',
    number: '+1 312 555 0177', twilioSid: 'CA4d5e6f7g8h9i0j1k2l3m', minutesUsed: 502, plan: { amount: 79, min: 500 } },
  { id: 'demo-5', company: 'Amberlight Cafe', name: 'Sara Lund', email: 'sara@amberlight.example', createdAt: daysAgo(2), userType: 'customer', viaPortal: 'acme.io',
    number: '+1 305 555 0163', twilioSid: 'CA5e6f7g8h9i0j1k2l3m4n', minutesUsed: 12, plan: { amount: 29, min: 100 } },
  // No number yet — demonstrates the "No number" state.
  { id: 'demo-6', company: 'Cobalt Freight', name: 'Alex Kim', email: 'alex@cobalt.example', createdAt: daysAgo(1), userType: 'customer', minutesUsed: 0 },
];

const TYPE_STYLES = {
  superadmin: 'bg-purple-500/15 text-purple-400',
  reseller: 'bg-amber-500/15 text-amber-400',
  admin: 'bg-lime-500/15 text-lime-400',
  customer: 'bg-slate-500/15 text-[var(--body)]',
};

function UsageBar({ used, total }) {
  if (!total) return <span className="text-mute text-xs italic">no plan</span>;
  const pct = Math.min(100, (used / total) * 100);
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-lime-500';
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-mute mb-1">
        <span>{used.toFixed(1)} min</span>
        <span>{total} min</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Card grid instead of a wide table — this page has more fields per row
// than fit comfortably in a table (type, portal, phone, plan, Twilio SID,
// usage, status, joined, actions), and a card lets usage render as an
// actual bar instead of a bare "x / y" number pair.
function CustomerCard({ c, busyId, onProvision, onDelete, isDemo }) {
  const isLive = !!c.number;
  // Buttons live on the back face — stop their clicks from bubbling so they
  // never trigger anything on the (now purely hover-driven) flip container.
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div className="flip-card" style={{ minHeight: 260 }}>
      <div className="flip-card-inner">
        {/* --- Front ----------------------------------------------------- */}
        <div className="flip-card-face flip-card-front form-card flex flex-col gap-3 transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] flex items-center justify-center text-white text-sm font-bold">
                {initials(c.company || c.name)}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--foreground)] truncate">{c.company || c.name}</div>
                <div className="text-xs text-mute flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {c.email}</div>
              </div>
            </div>
            <span className={`pill text-[10px] uppercase tracking-wider font-semibold shrink-0 ${TYPE_STYLES[c.userType] || TYPE_STYLES.customer}`}>
              {c.userType || 'user'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.number || '—'}</span>
            {c.viaPortal && <span className="text-lime-400 font-mono">{c.viaPortal}</span>}
            <span>Joined {fmtDate(c.createdAt)}</span>
          </div>

          <UsageBar used={c.minutesUsed || 0} total={c.plan?.min || 0} />

          <div className="flex items-center justify-between gap-2 pt-1 mt-auto border-t border-[var(--border)]">
            <span className={`inline-block pill text-[10px] uppercase tracking-wider font-semibold ${
              isLive ? 'bg-lime-500/15 text-lime-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {isLive ? 'Live' : 'No number'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-mute uppercase tracking-wider font-semibold">
              <RotateCw className="w-3 h-3" /> Hover for details
            </span>
          </div>
        </div>

        {/* --- Back ------------------------------------------------------- */}
        <div className="flip-card-face flip-card-back form-card flex flex-col gap-3">
          <div className="font-semibold text-[var(--foreground)] truncate">{c.company || c.name}</div>

          <div className="flex flex-col gap-2 text-xs text-mute">
            <div className="flex items-center gap-2"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate text-[var(--foreground)]">{c.email}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-3 h-3 shrink-0" /> <span className="text-[var(--foreground)]">{c.number || 'No number'}</span></div>
            <div className="flex items-center gap-2"><Hash className="w-3 h-3 shrink-0" /> <span className="font-mono text-[var(--foreground)] truncate">{c.twilioSid || 'no Twilio SID'}</span></div>
            <div className="flex items-center gap-2"><Tag className="w-3 h-3 shrink-0" /> <span className="text-[var(--foreground)]">{c.plan ? `$${c.plan.amount}/mo · ${c.plan.min} min included` : 'no plan'}</span></div>
            {c.viaPortal && <div className="flex items-center gap-2"><Tag className="w-3 h-3 shrink-0" /> <span className="text-lime-400 font-mono">{c.viaPortal}</span></div>}
            <div className="flex items-center gap-2"><Calendar className="w-3 h-3 shrink-0" /> <span className="text-[var(--foreground)]">Joined {fmtDate(c.createdAt)}</span></div>
          </div>

          <UsageBar used={c.minutesUsed || 0} total={c.plan?.min || 0} />

          <div className="flex gap-1.5 mt-auto pt-1 border-t border-[var(--border)]">
            {c.number && (
              <button
                className="btn-ghost text-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={isDemo || busyId === c.id + ':prov'}
                onClick={stop(() => onProvision(c))}
                title={isDemo ? 'Demo data — not a real account, nothing to provision' : 'Recreate inbound trunk + dispatch rule + voice agent'}
              >
                <Wrench className="w-3 h-3" /> {busyId === c.id + ':prov' ? '…' : 'Provision'}
              </button>
            )}
            <button
              className="btn-red text-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={isDemo || busyId === c.id}
              onClick={stop(() => onDelete(c))}
              title={isDemo ? 'Demo data — not a real account, nothing to delete' : undefined}
            >
              <Trash2 className="w-3 h-3" /> {busyId === c.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState(() => readCache('admin.customers', currentUser?.id) ?? null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const data = await api('/api/admin/users');
      const next = data.users.filter((u) => u.role === 'customer');
      setUsers(next);
      writeCache('admin.customers', currentUser?.id, next);
    } catch (e) {
      setErr(e.message);
      setUsers((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = users !== null && users.length === 0;
  const effectiveUsers = users === null ? null : (users.length > 0 ? users : DEMO_USERS);
  const isDemoRow = (id) => usingDemo && String(id).startsWith('demo-');

  const remove = async (u) => {
    if (isDemoRow(u.id)) return; // demo rows aren't real accounts — nothing to delete
    if (!window.confirm(`Delete ${u.company || u.email}? This also releases any Twilio number.`)) return;
    setBusyId(u.id);
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const provision = async (u) => {
    if (isDemoRow(u.id)) return;
    setBusyId(u.id + ':prov');
    try {
      const r = await api(`/api/admin/provision/${u.id}`, { method: 'POST' });
      alert('Provisioning OK:\n' + (r.log || []).join('\n'));
      await load();
    } catch (e) {
      alert('Provisioning failed:\n' + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute">All live customers + technical IDs.</p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh customers" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      {effectiveUsers === null && <div className="form-card text-center text-mute py-10">Loading…</div>}
      {effectiveUsers?.length === 0 && <div className="form-card text-center text-mute py-10">No customers yet.</div>}

      {effectiveUsers && effectiveUsers.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {effectiveUsers.map((c) => (
            <CustomerCard key={c.id} c={c} busyId={busyId} onProvision={provision} onDelete={remove} isDemo={isDemoRow(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
