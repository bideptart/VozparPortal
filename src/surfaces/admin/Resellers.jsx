import { useEffect, useState } from 'react';
import { Building2, Phone, MapPin, Users as UsersIcon } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const initials = (name) => (name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

const BRAND_GRADIENT = 'bg-[linear-gradient(135deg,#0ea5e9_0%,#6366f1_55%,#8b5cf6_110%)]';

function StatTile({ icon, label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border px-4 py-3 flex items-center gap-3 text-left transition ${
        active ? 'border-[var(--primary)] shadow-[0_0_0_2px_var(--glow)]' : 'border-[var(--border)] hover:border-[var(--primary)]/60'
      } bg-[var(--popover)]`}
    >
      <div className={`absolute inset-0 ${active ? 'opacity-[0.12]' : 'opacity-[0.06]'} ${BRAND_GRADIENT}`} aria-hidden="true" />
      <span className={`relative shrink-0 w-9 h-9 rounded-lg ${BRAND_GRADIENT} flex items-center justify-center text-white shadow-[0_0_16px_var(--glow)]`}>
        {icon}
      </span>
      <div className="relative min-w-0">
        <div className="text-xl font-bold text-[var(--foreground)] leading-tight">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-mute">{label}</div>
      </div>
    </button>
  );
}

function CustomerBadge({ r, onDrill }) {
  if (!r.customerCount) return <span className="pill bg-slate-500/15 text-mute text-xs">0 customers</span>;
  return (
    <button
      onClick={() => onDrill(r)}
      className="pill bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 hover:shadow-[0_0_12px_rgba(163,230,53,0.35)] transition cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
      title="Click to see all customers under this reseller"
    >
      <UsersIcon className="w-3 h-3" /> {r.customerCount} {r.customerCount === 1 ? 'customer' : 'customers'} →
    </button>
  );
}

// A "hub" card for a reseller — gradient accent strip, glowing avatar ring,
// and stat chips.
function ResellerHub({ r, onDrill }) {
  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--popover)] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`h-1.5 ${BRAND_GRADIENT}`} aria-hidden="true" />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold ring-2 ring-white/10 shadow-[0_0_20px_var(--glow)] bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)]">
              {initials(r.company || r.name)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-[var(--foreground)] truncate">{r.company || r.name}</span>
                <span className="pill bg-amber-500/15 text-amber-400 text-[9px] uppercase tracking-wider font-semibold">reseller</span>
              </div>
              <div className="text-xs text-mute truncate">{r.email} · @{r.username}</div>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-mute whitespace-nowrap">Joined {fmtDate(r.createdAt)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-mute flex items-center gap-1"><Building2 className="w-3 h-3" /> Portal</div>
            <div className="font-mono text-lime-400 text-sm truncate">{r.resellerPortal || '—'}</div>
          </div>
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-mute flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div>
            <div className="text-[var(--foreground)] text-sm truncate">{r.phone || '—'}</div>
          </div>
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-mute flex items-center gap-1"><MapPin className="w-3 h-3" /> KYC</div>
            <div className="text-[var(--foreground)] text-sm truncate">{r.kycLocation || '—'}</div>
          </div>
        </div>

        <CustomerBadge r={r} onDrill={onDrill} />
      </div>
    </div>
  );
}

const emptyForm = () => ({
  name: '', company: '', email: '', phone: '',
  username: '', password: '',
  resellerPortal: '',
  kycAddress: '', kycLocation: '',
});

// Shown only when the real reseller list comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks.
const DEMO_RESELLERS = [
  { id: 'demo-r1', company: 'Acme Voice Solutions', name: 'Jane Acme', email: 'ops@acme.com', username: 'acme', userType: 'reseller',
    resellerPortal: 'acme.io', phone: '+91 98765 43210', customerCount: 12, kycLocation: 'Mumbai, IN', createdAt: daysAgo(120) },
  { id: 'demo-r2', company: 'BrightLine Comms', name: 'Marcus Lee', email: 'hello@brightline.io', username: 'brightline', userType: 'reseller',
    resellerPortal: 'brightline.io', phone: '+1 415 555 0199', customerCount: 5, kycLocation: 'Austin, US', createdAt: daysAgo(60) },
  { id: 'demo-r3', company: 'Acme APAC', name: 'Wei Tan', email: 'wei@acme-apac.io', username: 'acme-apac', userType: 'reseller',
    resellerPortal: 'acme-apac.io', phone: '+65 8123 4567', customerCount: 3, kycLocation: 'Singapore, SG', createdAt: daysAgo(30) },
];

// Demo customers shown when drilling into a demo reseller — keyed by the
// demo reseller's id so the modal doesn't need a real API call.
const makeDemoCustomer = (i, label, plan) => ({
  id: `demo-c-${label}-${i}`,
  company: `${label} Customer ${i}`,
  name: `Contact ${i}`,
  email: `contact${i}@${label.toLowerCase().replace(/\s+/g, '')}.example`,
  phone: `+1 555 010${i}`,
  numbers: [{ id: `demo-n-${label}-${i}`, value: `+1 415 555 0${100 + i}`, isPrimary: true, planCycle: i % 2 ? 'yearly' : 'monthly', plan }],
  minutesUsed: 40 * i,
  planActivated: daysAgo(30 + i * 5),
  createdAt: daysAgo(20 + i * 5),
});

const DEMO_CUSTOMERS_BY_RESELLER = {
  'demo-r1': [1, 2, 3].map((i) => makeDemoCustomer(i, 'Acme', { label: 'Growth', amount: 79, min: 500, rate: 0.1 })),
  'demo-r2': [1, 2].map((i) => makeDemoCustomer(i, 'BrightLine', { label: 'Starter', amount: 29, min: 100, rate: 0.15 })),
  'demo-r3': [1].map((i) => makeDemoCustomer(i, 'AcmeAPAC', { label: 'Scale', amount: 199, min: 1200, rate: 0.08 })),
};

// =============================================================================
// Resellers — superadmin-only page to register whitelabel resellers (with
// KYC) and see the existing reseller list. Each newly registered reseller
// is auto-seeded with the platform's default Starter / Growth / Scale plans.
// =============================================================================
export default function Resellers() {
  const { currentUser } = useApp();
  const [list, setList]       = useState(() => readCache('admin.resellers', currentUser?.id) ?? null);
  const [err, setErr]         = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [busy, setBusy]       = useState(false);
  const [formErr, setFormErr] = useState('');
  const [createdMsg, setCreatedMsg] = useState('');
  // When set to a reseller object, opens the customer-detail drawer.
  const [drilledReseller, setDrilledReseller] = useState(null);
  // Clicking a stat tile filters the grid below; clicking it again clears the filter.
  const [statFilter, setStatFilter] = useState(null); // null | 'resellers' | 'withCustomers'

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/admin/resellers');
      const next = r.resellers || [];
      setList(next);
      writeCache('admin.resellers', currentUser?.id, next);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo resellers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_RESELLERS);
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormErr(''); setBusy(true);
    try {
      const r = await api('/api/admin/resellers', { method: 'POST', body: form });
      setCreatedMsg(`✓ Created ${r.reseller.email} (portal: ${r.reseller.resellerPortal})`);
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Could not create reseller');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute text-sm">
            Whitelabel partners with their own customer portal. Each reseller
            starts with the platform's default plans and can edit them upward.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormErr(''); }}
          className="group relative overflow-hidden px-4 py-2 rounded-lg text-sm font-semibold text-white border border-white/25 transition duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 shrink-0"
        >
          <span className={`absolute inset-0 ${BRAND_GRADIENT} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
          <span className="relative">{showForm ? '× Cancel' : '+ Register new reseller'}</span>
        </button>
      </div>

      {err && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {err}
        </div>
      )}
      {createdMsg && (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
          {createdMsg}
        </div>
      )}

      {/* === Registration form ============================================== */}
      {showForm && (
        <form onSubmit={submit} className="form-card space-y-4">
          <div className="text-sm font-semibold text-[var(--foreground)]">
            Register a new reseller
          </div>
          <div className="text-xs text-mute">
            All fields are required. KYC details are stored on the reseller's user row;
            the password is bcrypt-hashed before being saved. The reseller will be
            auto-seeded with default Starter / Growth / Scale plans.
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Company name *</label>
              <input className="input text-sm" required value={form.company} onChange={setField('company')} placeholder="Acme Voice Solutions" />
            </div>
            <div>
              <label className="field-label">Authorised contact name *</label>
              <input className="input text-sm" required value={form.name} onChange={setField('name')} placeholder="Jane Acme" />
            </div>
            <div>
              <label className="field-label">Registered phone *</label>
              <input className="input text-sm" required value={form.phone} onChange={setField('phone')} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="field-label">Work email (login) *</label>
              <input type="email" className="input text-sm" required value={form.email} onChange={setField('email')} placeholder="ops@acme.com" />
            </div>
            <div>
              <label className="field-label">Username *</label>
              <input className="input text-sm" required value={form.username} onChange={setField('username')} placeholder="acme" />
            </div>
            <div>
              <label className="field-label">Password * (8+ chars)</label>
              <input type="text" className="input text-sm font-mono" required value={form.password} onChange={setField('password')} placeholder="Auto-generate or paste" />
              <button
                type="button"
                className="mt-1 text-xs text-lime-400 hover:underline"
                onClick={() => {
                  // Quick generator — same 16-char alphanumeric shape as the
                  // node script used to seed earlier accounts.
                  const arr = new Uint8Array(12);
                  window.crypto.getRandomValues(arr);
                  const pwd = btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '').slice(0, 16);
                  setForm((f) => ({ ...f, password: pwd }));
                }}
              >
                ⟳ Generate strong password
              </button>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Reseller portal slug *</label>
              <input
                className="input text-sm font-mono lowercase"
                required
                value={form.resellerPortal}
                onChange={(e) => setForm((f) => ({ ...f, resellerPortal: e.target.value.toLowerCase() }))}
                placeholder="acme.io"
              />
              <div className="field-help">
                The portal slug their branded signup form posts. Customers signing
                up there are auto-attributed to this reseller. Must be unique
                across all resellers.
              </div>
            </div>
            <div>
              <label className="field-label">KYC address</label>
              <input className="input text-sm" value={form.kycAddress} onChange={setField('kycAddress')} placeholder="Registered office address" />
            </div>
            <div>
              <label className="field-label">KYC location / city</label>
              <input className="input text-sm" value={form.kycLocation} onChange={setField('kycLocation')} placeholder="Mumbai, IN" />
            </div>
          </div>

          {formErr && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              ⚠ {formErr}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={() => setShowForm(false)} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="group relative overflow-hidden px-5 py-2 rounded-lg text-sm font-semibold text-white border border-white/25 transition duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
            >
              <span className={`absolute inset-0 ${BRAND_GRADIENT} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
              <span className="relative">{busy ? 'Registering…' : 'Register reseller'}</span>
            </button>
          </div>
        </form>
      )}

      {/* === Reseller network — glowing hub cards per top-level reseller,
          with sub-resellers rendered as satellite chips underneath. ===== */}
      {effectiveList === null && <div className="form-card text-center text-mute py-10">Loading…</div>}
      {effectiveList?.length === 0 && (
        <div className="form-card text-center text-mute py-10">
          No resellers yet — click <strong>+ Register new reseller</strong> above to add one.
        </div>
      )}
      {effectiveList && effectiveList.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <StatTile
              icon={<Building2 className="w-4 h-4" />}
              label="Resellers"
              value={effectiveList.filter((r) => r.userType !== 'sub-reseller').length}
              active={statFilter === 'resellers'}
              onClick={() => setStatFilter((f) => (f === 'resellers' ? null : 'resellers'))}
            />
            <StatTile
              icon={<UsersIcon className="w-4 h-4" />}
              label="Customers reached"
              value={effectiveList.reduce((s, r) => s + (r.customerCount || 0), 0)}
              active={statFilter === 'withCustomers'}
              onClick={() => setStatFilter((f) => (f === 'withCustomers' ? null : 'withCustomers'))}
            />
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            {effectiveList
              .filter((r) => {
                if (statFilter === 'resellers') return r.userType !== 'sub-reseller';
                if (statFilter === 'withCustomers') return r.customerCount > 0;
                return true;
              })
              .map((r) => (
                <ResellerHub key={r.id} r={r} onDrill={setDrilledReseller} />
              ))}
          </div>
        </>
      )}

      {drilledReseller && (
        <ResellerCustomersModal
          reseller={drilledReseller}
          onClose={() => setDrilledReseller(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// ResellerCustomersModal — drilled-down view triggered by clicking a customer
// count pill on the Resellers list. Shows every customer under that reseller
// with their plan / DID / minute usage / dates.
// =============================================================================
function ResellerCustomersModal({ reseller, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    const demoCustomers = DEMO_CUSTOMERS_BY_RESELLER[reseller.id];
    if (demoCustomers) {
      setData({ customers: demoCustomers });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await api(`/api/admin/resellers/${reseller.id}/customers`);
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Could not load customers');
      }
    })();
    return () => { cancelled = true; };
  }, [reseller.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mt-12 bg-[var(--popover)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-mute uppercase tracking-wider">Reseller customers</div>
            <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{reseller.company || reseller.name}</div>
            <div className="text-xs text-mute flex items-center gap-2 flex-wrap">
              <span>Portal: <span className="font-mono text-lime-400">{reseller.resellerPortal}</span></span>
              <span>· {reseller.email}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-mute hover:text-[var(--foreground)]" aria-label="Close">×</button>
        </div>

        {err && (
          <div className="mx-6 mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            ⚠ {err}
          </div>
        )}

        <div className="p-5">
          {data === null && !err && (
            <div className="text-mute text-center py-10">Loading customers…</div>
          )}
          {data && data.customers.length === 0 && (
            <div className="text-mute text-center py-10">
              No customers under this reseller yet — they'll appear here as soon as someone signs up via{' '}
              <span className="font-mono text-lime-400">{reseller.resellerPortal}</span>.
            </div>
          )}
          {data && data.customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-mute text-xs uppercase tracking-wider border-b border-[var(--border)]">
                    <th className="text-left font-semibold py-2 pl-1">Customer</th>
                    <th className="text-left font-semibold py-2">Phone (DID)</th>
                    <th className="text-left font-semibold py-2">Plan</th>
                    <th className="text-left font-semibold py-2">Cycle</th>
                    <th className="text-right font-semibold py-2">Min used</th>
                    <th className="text-left font-semibold py-2">Activated</th>
                    <th className="text-left font-semibold py-2 pr-1">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.flatMap((c) => {
                    // Prefer the per-DID list; fall back to legacy primary
                    // for any row that pre-dates the user_numbers backfill.
                    const dids = (Array.isArray(c.numbers) && c.numbers.length)
                      ? c.numbers
                      : c.number ? [{
                          id: `legacy-${c.id}`,
                          value: c.number,
                          isPrimary: true,
                          planCycle: 'monthly',
                          plan: c.plan ? { ...c.plan, id: (c.plan.label || 'unknown').toLowerCase() } : null,
                        }] : [];

                    if (dids.length === 0) {
                      return [(
                        <tr key={c.id} className="border-b border-[var(--border)]">
                          <td className="py-3 pl-1">
                            <div className="font-semibold text-[var(--foreground)]">{c.company || c.name}</div>
                            <div className="text-xs text-mute">{c.email} · {c.phone || '—'}</div>
                          </td>
                          <td className="py-3 text-mute italic text-xs" colSpan={3}>— No DID provisioned —</td>
                          <td className="py-3 text-right text-mute">—</td>
                          <td className="py-3 text-xs text-mute">—</td>
                          <td className="py-3 pr-1 text-xs text-mute">{fmtDate(c.createdAt)}</td>
                        </tr>
                      )];
                    }

                    return dids.map((d, i) => (
                      <tr key={`${c.id}-${d.id}`} className={i === dids.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                        {i === 0 ? (
                          <td rowSpan={dids.length} className="py-3 pl-1 align-top">
                            <div className="font-semibold text-[var(--foreground)]">{c.company || c.name}</div>
                            <div className="text-xs text-mute">{c.email} · {c.phone || '—'}</div>
                            {dids.length > 1 && (
                              <div className="mt-1 text-[10px] uppercase tracking-wider text-lime-400 font-semibold">
                                {dids.length} plans
                              </div>
                            )}
                          </td>
                        ) : null}
                        <td className="py-3 font-mono text-xs">
                          {d.value}
                          {d.isPrimary && dids.length > 1 && (
                            <span className="ml-2 pill bg-lime-500/15 text-lime-400 text-[9px] uppercase tracking-wider font-semibold">primary</span>
                          )}
                        </td>
                        <td className="py-3">
                          {d.plan ? (
                            <>
                              <div className="text-sm font-semibold text-[var(--foreground)]">{d.plan.label}</div>
                              <div className="text-[11px] text-mute">
                                ${Number(d.plan.amount).toLocaleString('en-US')} · {d.plan.min} min · ${d.plan.rate}/min
                              </div>
                            </>
                          ) : <span className="text-mute">—</span>}
                        </td>
                        <td className="py-3">
                          <span className={`pill text-[10px] uppercase tracking-wider font-semibold ${
                            d.planCycle === 'yearly'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-500/15 text-[var(--body)]'
                          }`}>
                            {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                          </span>
                        </td>
                        {i === 0 ? (
                          <td rowSpan={dids.length} className="py-3 text-right align-top text-[var(--foreground)]">
                            <strong>{c.minutesUsed.toFixed(1)}</strong>
                            <span className="text-mute"> / {dids[0].plan?.min || 0}</span>
                          </td>
                        ) : null}
                        {i === 0 ? (
                          <td rowSpan={dids.length} className="py-3 text-xs text-mute align-top">
                            {fmtDate(c.planActivated)}
                          </td>
                        ) : null}
                        {i === 0 ? (
                          <td rowSpan={dids.length} className="py-3 pr-1 text-xs text-mute align-top">
                            {fmtDate(c.createdAt)}
                          </td>
                        ) : null}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
              <div className="mt-3 text-xs text-mute text-right">
                {data.customers.length} {data.customers.length === 1 ? 'customer' : 'customers'} ·{' '}
                {data.customers.reduce((a, c) => a + (Array.isArray(c.numbers) ? c.numbers.length : (c.number ? 1 : 0)), 0)} plans
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[var(--border)] flex justify-end">
          <button onClick={onClose} className="btn-ghost text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
