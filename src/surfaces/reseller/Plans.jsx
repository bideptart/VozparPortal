import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

const inr = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

// Shown only when the real plan list comes back genuinely empty — same
// "never overrides real data" rule as the admin surface's demo fallbacks.
const DEMO_FLOORS = { starter: { amount: 31, rate: 0.13 }, growth: { amount: 93, rate: 0.12 }, scale: { amount: 316, rate: 0.11 } };
const DEMO_PLANS = [
  { basePlanId: 'starter', label: 'Starter', amount: 31,  rate: 0.13, min: 250,  agents: 2 },
  { basePlanId: 'growth',  label: 'Growth',  amount: 93,  rate: 0.12, min: 800,  agents: 10 },
  { basePlanId: 'scale',   label: 'Scale',   amount: 316, rate: 0.11, min: 3000, agents: 999 },
];

// =============================================================================
// Reseller Plans — show the three plans and let the reseller edit label /
// retail price / per-min rate / minutes / agents inline. The PATCH endpoint
// enforces amount ≥ platform base and rate ≥ platform base; we mirror those
// floors here so the customer gets immediate feedback before submitting.
// =============================================================================
export default function Plans() {
  const [list, setList]       = useState(null);
  const [floors, setFloors]   = useState({});      // basePlanId → { amount, rate }
  const [editingId, setEditingId] = useState(null); // basePlanId currently in edit mode
  const [draft, setDraft]     = useState(null);    // shape: { label, amount, rate, min, agents }
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [msg, setMsg]         = useState('');

  const loadAll = async () => {
    setErr('');
    try {
      const [mine, base] = await Promise.all([
        api('/api/reseller/plans'),
        api('/api/plans'),                          // canonical platform plans = the floors
      ]);
      setList(mine.plans || []);
      const f = {};
      for (const bp of (base.plans || [])) f[bp.id] = { amount: bp.amount, rate: bp.rate };
      setFloors(f);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Falls back to demo plans only when the real list comes back genuinely
  // empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_PLANS);
  const effectiveFloors = usingDemo && Object.keys(floors).length === 0 ? DEMO_FLOORS : floors;

  const startEdit = (p) => {
    setEditingId(p.basePlanId);
    setDraft({
      label:  p.label,
      amount: p.amount,
      rate:   p.rate,
      min:    p.min,
      agents: p.agents,
    });
    setErr(''); setMsg('');
  };

  const cancelEdit = () => { setEditingId(null); setDraft(null); setErr(''); };

  const floorForCurrent = effectiveFloors[editingId] || { amount: 0, rate: 0 };
  const violatesFloor = useMemo(() => {
    if (!draft) return null;
    if (Number(draft.amount) < floorForCurrent.amount) {
      return `Price must be at least ${inr(floorForCurrent.amount)} (platform base).`;
    }
    if (Number(draft.rate) < floorForCurrent.rate) {
      return `Per-min rate must be at least $${floorForCurrent.rate} (platform base).`;
    }
    return null;
  }, [draft, floorForCurrent]);

  const save = async () => {
    if (!draft || !editingId) return;
    if (violatesFloor) { setErr(violatesFloor); return; }
    setBusy(true); setErr(''); setMsg('');
    const draftPlan = {
      basePlanId: editingId,
      label:  draft.label,
      amount: Number(draft.amount),
      rate:   Number(draft.rate),
      min:    Number(draft.min),
      agents: Number(draft.agents),
    };
    // Demo rows aren't real accounts — apply the edit locally instead of
    // hitting a backend that isn't there.
    if (usingDemo) {
      setList((cur) => (cur && cur.length ? cur : DEMO_PLANS).map((p) => p.basePlanId === editingId ? draftPlan : p));
      setMsg(`✓ ${draftPlan.label} updated (demo)`);
      cancelEdit();
      setBusy(false);
      return;
    }
    try {
      const r = await api(`/api/reseller/plans/${encodeURIComponent(editingId)}`, {
        method: 'PATCH',
        body: {
          label:  draft.label,
          amount: Number(draft.amount),
          rate:   Number(draft.rate),
          min:    Number(draft.min),
          agents: Number(draft.agents),
        },
      });
      // Optimistically replace the row in the list.
      setList((cur) => (cur || []).map((p) => p.basePlanId === r.plan.basePlanId ? r.plan : p));
      setMsg(`✓ ${r.plan.label} updated`);
      cancelEdit();
    } catch (e) {
      setErr(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">⭐ My plans</h1>
      <p className="text-mute text-sm mt-1">
        Customers signing up through your portal see these prices. Edit any
        plan to raise its retail price or per-min rate — both must stay
        at or above the platform's base.
      </p>
      {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}

      {err && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          ⚠ {err}
        </div>
      )}
      {msg && (
        <div className="mt-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
          {msg}
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {effectiveList === null && <div className="text-mute md:col-span-3">Loading…</div>}
        {(effectiveList || []).map((p) => {
          const isEditing = editingId === p.basePlanId;
          const floor = effectiveFloors[p.basePlanId] || { amount: 0, rate: 0 };
          if (isEditing && draft) {
            return (
              <div key={p.basePlanId} className="form-card flex flex-col border-2 border-primary ring-2 ring-primary/15">
                <div className="text-xs uppercase tracking-wider font-semibold text-mute">{p.basePlanId}</div>
                <div className="mt-2">
                  <label className="field-label">Plan label</label>
                  <input
                    className="input text-sm"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </div>
                <div className="mt-3">
                  <label className="field-label">Retail price ($/mo)</label>
                  <input
                    type="number"
                    min={floor.amount}
                    className="input text-sm"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  />
                  <div className="text-[11px] text-mute mt-1">
                    Floor: <strong>{inr(floor.amount)}</strong> · what you owe us
                  </div>
                </div>
                <div className="mt-3">
                  <label className="field-label">Per-minute rate ($)</label>
                  <input
                    type="number"
                    min={floor.rate}
                    step="0.5"
                    className="input text-sm"
                    value={draft.rate}
                    onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                  />
                  <div className="text-[11px] text-mute mt-1">
                    Floor: <strong>${floor.rate}/min</strong> · what you owe us
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Included min</label>
                    <input
                      type="number"
                      min={0}
                      className="input text-sm"
                      value={draft.min}
                      onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Agents</label>
                    <input
                      type="number"
                      min={0}
                      className="input text-sm"
                      value={draft.agents}
                      onChange={(e) => setDraft({ ...draft, agents: e.target.value })}
                    />
                  </div>
                </div>

                {violatesFloor && (
                  <div className="mt-3 text-xs text-red-400">⚠ {violatesFloor}</div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button className="btn-ghost text-xs" onClick={cancelEdit} disabled={busy}>Cancel</button>
                  <button
                    onClick={save}
                    disabled={busy || !!violatesFloor}
                    className="px-4 py-1.5 rounded-lg bg-primary hover:bg-[var(--primary-hover)] disabled:bg-slate-300 text-white text-xs font-semibold"
                  >
                    {busy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={p.basePlanId} className="form-card flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold text-mute">{p.basePlanId}</div>
                <button onClick={() => startEdit(p)} className="text-xs text-primary font-semibold hover:underline">
                  Edit ›
                </button>
              </div>
              <div className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{p.label}</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-extrabold text-[var(--foreground)]">{inr(p.amount)}</span>
                <span className="text-xs text-mute pb-1">/mo</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-[var(--body)] flex-1">
                <li>• {p.min} included minutes</li>
                <li>• ${p.rate}/min overage rate</li>
                <li>• {p.agents >= 999 ? 'Unlimited' : p.agents} agents</li>
              </ul>
              <div className="mt-3 text-[11px] text-mute pt-3 border-t border-[var(--border)]">
                Platform floor: {inr(floor.amount)} · ${floor.rate}/min — your margin is {inr(p.amount - floor.amount)}/mo.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
