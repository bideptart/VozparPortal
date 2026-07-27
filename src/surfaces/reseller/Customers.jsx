import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the admin surface's demo fallbacks.
const DEMO_CUSTOMERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(21), numberCount: 1,
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 93, min: 800 } }], minutesUsed: 512 },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(15), numberCount: 1,
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'yearly', plan: { label: 'Starter', amount: 31, min: 250 } }], minutesUsed: 84 },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9), numberCount: 2,
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true,  planCycle: 'monthly', plan: { label: 'Scale', amount: 316, min: 3000 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 31, min: 250 } },
    ], minutesUsed: 2140 },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(3), numberCount: 0, numbers: [], minutesUsed: 0 },
];

// Resolve the symbol + format for the reseller's storefront currency.
// 9278.ai reseller bills in $; 9278.ai reseller bills in $.
const symbolFor = (cur) => (cur === 'USD' ? '$' : cur === 'USD' ? '$' : `${cur || '$'} `);
const fmtMoney = (n, cur) => {
  const sym = symbolFor(cur);
  return cur === 'USD'
    ? `${sym}${Number(n || 0).toLocaleString('en-US')}`
    : `${sym}${Number(n || 0).toFixed(2)}`;
};

// Same fallback logic as the admin tables: prefer `customer.numbers[]`
// (per-DID plan tiers from user_numbers JOIN); fall back to the legacy
// primary (users.plan_label + users.number_value) for any row that
// pre-dates the per-DID schema.
const didsFor = (c) => {
  if (Array.isArray(c.numbers) && c.numbers.length) return c.numbers;
  if (c.number) {
    return [{
      id: `legacy-${c.id}`,
      value: c.number,
      isPrimary: true,
      planCycle: 'monthly',
      plan: c.plan
        ? { ...c.plan, id: c.plan.label?.toLowerCase() || 'unknown' }
        : null,
    }];
  }
  return [];
};

// =============================================================================
// Reseller Customers — table of all `users.user_type='user'` rows where
// reseller_id = me.id. Each customer expands into one sub-row per DID so
// the reseller sees every plan their customer bought, just like the
// superadmin's Signups view.
// =============================================================================
export default function Customers() {
  const { currentUser } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr]   = useState('');

  const currency = currentUser?.displayCurrency || 'USD';

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/reseller/customers');
      setList(r.customers || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_CUSTOMERS);

  const totalDids = useMemo(
    () => (effectiveList || []).reduce((a, c) => a + didsFor(c).length, 0),
    [effectiveList],
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">👥 My customers</h1>
          <p className="text-mute text-sm mt-1">
            Every account that signed up through your portal — with every plan and number they bought.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>
        <button className="btn-ghost text-sm" onClick={load}>↻ Refresh</button>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}

      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total customers</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {effectiveList === null ? '—' : effectiveList.length}
          </div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Numbers provisioned</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {effectiveList === null ? '—' : effectiveList.reduce((a, c) => a + (c.numberCount || 0), 0)}
          </div>
        </div>
        <div className="form-card">
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Plans sold</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {effectiveList === null ? '—' : totalDids}
          </div>
        </div>
      </div>

      <div className="mt-6 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Number (DID)</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Min used</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {effectiveList === null && (
              <tr><td colSpan={6} className="text-center text-mute py-6">Loading…</td></tr>
            )}
            {(effectiveList || []).flatMap((c) => {
              const dids = didsFor(c);
              if (dids.length === 0) {
                return [(
                  <tr key={c.id}>
                    <td>
                      <div className="font-medium">{c.company || c.name}</div>
                      <div className="text-xs text-mute">{c.email}</div>
                    </td>
                    <td className="text-mute text-sm">— No DID —</td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-mute text-sm">—</td>
                    <td className="text-xs text-mute">{fmtDate(c.createdAt)}</td>
                  </tr>
                )];
              }
              return dids.map((d, i) => (
                <tr key={`${c.id}-${d.id}`}>
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="align-top">
                      <div className="font-medium">{c.company || c.name}</div>
                      <div className="text-xs text-mute">{c.email}</div>
                      {dids.length > 1 && (
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-primary font-semibold">
                          {dids.length} plans
                        </div>
                      )}
                    </td>
                  ) : null}
                  <td className="font-mono text-sm">
                    {d.value}
                    {d.isPrimary && dids.length > 1 && (
                      <span className="ml-2 pill pill-primary text-[10px] uppercase tracking-wider">primary</span>
                    )}
                  </td>
                  <td>
                    {d.plan ? (
                      <>
                        <div className="text-sm font-semibold">{d.plan.label}</div>
                        <div className="text-xs text-mute">{fmtMoney(d.plan.amount, currency)} · {d.plan.min} min</div>
                      </>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill text-[10px] uppercase tracking-wider ${
                      d.planCycle === 'yearly' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                  </td>
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="text-sm align-top">
                      {Number(c.minutesUsed || 0).toFixed(1)} <span className="text-mute">/ {dids[0].plan?.min || 0}</span>
                    </td>
                  ) : null}
                  {i === 0 ? (
                    <td rowSpan={dids.length} className="text-xs text-mute align-top">
                      {fmtDate(c.createdAt)}
                    </td>
                  ) : null}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
