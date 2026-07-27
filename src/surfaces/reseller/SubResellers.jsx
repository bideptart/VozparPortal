import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BRAND_GRADIENT = 'bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)]';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real sub-reseller list comes back genuinely empty —
// same "never overrides real data" rule as the admin surface's demo
// fallbacks.
const DEMO_SUB_RESELLERS = [
  { id: 'demo-1', company: 'Acme Voice Partners', name: 'Jane Acme', email: 'ops@acme.example', username: 'acme', resellerPortal: 'acme-voice.io', phone: '+1 415 555 0100', customerCount: 6, kycLocation: 'Austin, US', createdAt: daysAgo(60) },
  { id: 'demo-2', company: 'Northstar Comms',     name: 'Devon Lee', email: 'devon@northstar.example', username: 'northstar', resellerPortal: 'northstar.io', phone: '+1 646 555 0121', customerCount: 0, kycLocation: 'Toronto, CA', createdAt: daysAgo(12) },
];

const emptyForm = () => ({
  name: '', company: '', email: '', phone: '',
  username: '', password: '',
  resellerPortal: '',
  kycAddress: '', kycLocation: '',
});

// =============================================================================
// SubResellers — reseller-only page to on-board sub-resellers. Same shape as
// the superadmin's Resellers page (register form + list), scoped to this
// reseller's tree. Sub-resellers can on-board their own customers under
// their own portal slug.
// =============================================================================
export default function SubResellers() {
  const [list, setList]       = useState(null);
  const [err, setErr]         = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [busy, setBusy]       = useState(false);
  const [formErr, setFormErr] = useState('');
  const [createdMsg, setCreatedMsg] = useState('');

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/reseller/sub-resellers');
      setList(r.subResellers || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo sub-resellers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_SUB_RESELLERS);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormErr(''); setBusy(true);
    // Demo rows aren't a real account tree — add the row locally instead of
    // hitting a backend that isn't there.
    if (usingDemo) {
      const newRow = {
        id: `demo-${Date.now()}`, company: form.company, name: form.name, email: form.email,
        username: form.username, resellerPortal: form.resellerPortal, phone: form.phone,
        customerCount: 0, kycLocation: form.kycLocation, createdAt: new Date().toISOString(),
      };
      setList((cur) => [...(cur && cur.length ? cur : DEMO_SUB_RESELLERS), newRow]);
      setCreatedMsg(`✓ Created ${form.email} (portal: ${form.resellerPortal}) (demo)`);
      setForm(emptyForm());
      setShowForm(false);
      setBusy(false);
      return;
    }
    try {
      const r = await api('/api/reseller/sub-resellers', { method: 'POST', body: form });
      setCreatedMsg(`✓ Created ${r.subReseller.email} (portal: ${r.subReseller.resellerPortal})`);
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Could not create sub-reseller');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">🤝 Sub-resellers</h1>
          <p className="text-mute text-sm mt-1">
            On-board partners under your brand. Each sub-reseller gets their own
            portal slug and customer list — all rolled up to your downstream.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormErr(''); }}
          className={`px-4 py-2 rounded-lg text-white text-sm font-semibold ${BRAND_GRADIENT}`}
        >
          {showForm ? '× Cancel' : '+ Add sub-reseller'}
        </button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}
      {createdMsg && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {createdMsg}
        </div>
      )}

      {/* === Registration form ============================================== */}
      {showForm && (
        <form onSubmit={submit} className="mt-6 form-card space-y-4">
          <div className="text-sm font-semibold text-slate-900">
            Register a new sub-reseller
          </div>
          <div className="text-xs text-mute">
            All fields are required. The sub-reseller will be created under your
            account — every customer they on-board rolls up to your downstream.
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Company name *</label>
              <input className="input text-sm" required value={form.company} onChange={setField('company')} placeholder="Acme Voice Partners" />
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
                className="mt-1 text-xs text-primary hover:underline"
                onClick={() => {
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
              <label className="field-label">Portal slug *</label>
              <input
                className="input text-sm font-mono lowercase"
                required
                value={form.resellerPortal}
                onChange={(e) => setForm((f) => ({ ...f, resellerPortal: e.target.value.toLowerCase() }))}
                placeholder="acme-voice.io"
              />
              <div className="field-help">
                Sub-reseller's branded signup slug. Customers signing up there are
                auto-attributed to this sub-reseller and roll up to you. Must be
                unique platform-wide.
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
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
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
              className={`px-5 py-2 rounded-lg text-white text-sm font-semibold ${BRAND_GRADIENT}`}
            >
              {busy ? 'Registering…' : 'Register sub-reseller'}
            </button>
          </div>
        </form>
      )}

      {/* === Sub-reseller list ============================================== */}
      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Sub-reseller</th>
              <th>Portal slug</th>
              <th>Phone</th>
              <th>Customers</th>
              <th>KYC location</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {effectiveList === null && <tr><td colSpan={6} className="text-center text-mute py-6">Loading…</td></tr>}
            {(effectiveList || []).map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="font-medium">{r.company || r.name}</div>
                  <div className="text-xs text-mute">{r.email} · @{r.username}</div>
                </td>
                <td className="font-mono text-sm text-primary">{r.resellerPortal || '—'}</td>
                <td className="text-xs text-mute">{r.phone || '—'}</td>
                <td>
                  <span className={r.customerCount > 0
                    ? 'pill pill-primary'
                    : 'pill bg-slate-200 text-slate-600'}>
                    {r.customerCount} {r.customerCount === 1 ? 'customer' : 'customers'}
                  </span>
                </td>
                <td className="text-xs text-mute">{r.kycLocation || '—'}</td>
                <td className="text-xs text-mute">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
