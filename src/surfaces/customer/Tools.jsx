import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, PhoneForwarded, BellRing, Radio, Check, ChevronRight } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';

// =============================================================================
// Tools — per-agent call settings.
//
// Two-column layout: a searchable list of plans/numbers on the left, the
// selected number's tool config (call transfer, booking notifications) on
// the right. When the account has no numbers yet, falls back to read-only
// demo data (same "never overrides real data" convention used on the other
// admin/customer surfaces) so the page always demonstrates the real UI.
//
// Two tool sections per selected number:
//  - Blind transfer: the number the agent hands a caller off to when asked
//    for a human, plus an optional destination label. Backed by the
//    dashboard MCP set_/get_transfer_number tools via
//    /api/numbers/:id/transfer. Saving uses the same two-step flow as the
//    Knowledge & Agent page: a confirmation modal explaining the ~2-minute
//    propagation window, then a countdown that locks the form until the
//    change has gone live.
//  - Booking notifications: an owner email to copy on new bookings. No
//    backend yet (see Tools page copy: "booking notifications, more soon"),
//    so this section is local-state only — it doesn't persist across a
//    reload.
// =============================================================================
const PROPAGATION_SECONDS = 120;
const COUNTRY_CODE = '+1';

const stripCountryCode = (fullNumber) => {
  if (!fullNumber) return '';
  return fullNumber.startsWith(COUNTRY_CODE) ? fullNumber.slice(COUNTRY_CODE.length) : fullNumber.replace(/^\+/, '');
};

// Stale-while-revalidate cache for this tab. Without it, every reload resets
// `numbers` to [] and the whole card grid blanks to "No numbers yet" for
// however long /api/numbers takes — indistinguishable from a genuinely empty
// account, and the blank-then-pop is what reads as slow. Hydrating
// synchronously from the last successful load shows the real cards
// immediately; loadNumbers() below always re-fetches in the background and
// overwrites this with fresh data once it lands. Session-scoped and keyed by
// user id so it never leaks across accounts or outlives the tab.
const TOOLS_NUMBERS_CACHE_KEY = 'kallus.tools.numbers.cache.v1';
const readNumbersCache = (userId) => {
  if (!userId) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TOOLS_NUMBERS_CACHE_KEY) || 'null');
    return parsed && parsed.userId === userId ? parsed.numbers : null;
  } catch {
    return null;
  }
};
const writeNumbersCache = (userId, numbers) => {
  if (!userId) return;
  try {
    sessionStorage.setItem(TOOLS_NUMBERS_CACHE_KEY, JSON.stringify({ userId, numbers }));
  } catch { /* storage full / private-mode — just skip caching */ }
};

// Shown only when the real number list comes back genuinely empty — never
// overrides real data. Read-only: saves on these are simulated locally so
// the demo doesn't hit the API with a fake number id.
const DEMO_NUMBERS = [
  { id: 'demo-1', value: '+14155550142', agentName: 'Front Desk', agentSlug: 'front-desk', plan: { label: 'Growth' } },
  { id: 'demo-2', value: '+12125550198', agentName: 'Sales Line', agentSlug: 'sales-line', plan: { label: 'Starter' } },
  { id: 'demo-3', value: '+16465550110', agentName: 'Support Bot', agentSlug: 'support-bot', plan: { label: 'Scale' } },
];
const DEMO_TRANSFER = {
  'demo-1': { number: '+14155550199', destinationName: 'Front desk manager' },
  'demo-2': { number: '', destinationName: '' },
  'demo-3': { number: '+16465550188', destinationName: 'On-call support lead' },
};
const isDemoId = (id) => typeof id === 'string' && id.startsWith('demo-');

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ease-out shrink-0 ${
        on ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
    >
      <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function Tools() {
  const { currentUser } = useApp();
  const [numbers, setNumbers] = useState(() => readNumbersCache(currentUser?.id) ?? []);
  const [selectedId, setSelectedId] = useState('');
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [search, setSearch] = useState('');

  // Blind-transfer state.
  const [current, setCurrent] = useState(null);   // { number, destinationName, source } | null
  const [curLoading, setCurLoading] = useState(false);
  const [transferOn, setTransferOn] = useState(true);
  const [input, setInput] = useState('');           // national number, no country code
  const [destLabel, setDestLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Booking-notifications state — local only, no backend yet.
  const [notifOn, setNotifOn] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifMsg, setNotifMsg] = useState('');

  // Two-step save + propagation countdown (mirrors KbAgent).
  const [pendingSave, setPendingSave] = useState(null);   // { number, label } awaiting confirmation
  const [propagating, setPropagating] = useState(null);   // { secondsLeft, totalSeconds } | null
  const propagationLocked = !!propagating && propagating.secondsLeft > 0;

  useEffect(() => {
    if (!propagating || propagating.secondsLeft <= 0) return;
    const t = setTimeout(() => {
      setPropagating((p) => p && { ...p, secondsLeft: p.secondsLeft - 1 });
    }, 1000);
    return () => clearTimeout(t);
  }, [propagating]);

  const loadNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const r = await api('/api/numbers');
      const next = r.numbers || [];
      setNumbers(next);
      writeNumbersCache(currentUser?.id, next);
    } catch {}
    finally { setLoadingNumbers(false); }
  };
  useEffect(() => { loadNumbers(); }, []);

  const usingDemo = !loadingNumbers && numbers.length === 0;
  const effectiveNumbers = usingDemo ? DEMO_NUMBERS : numbers;

  const filteredNumbers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return effectiveNumbers;
    return effectiveNumbers.filter((n) =>
      (n.agentName || n.label || '').toLowerCase().includes(q)
      || (n.value || '').toLowerCase().includes(q)
      || (n.agentSlug || '').toLowerCase().includes(q));
  }, [effectiveNumbers, search]);

  const selected = useMemo(() => effectiveNumbers.find((n) => n.id === selectedId) || null, [effectiveNumbers, selectedId]);

  const loadCurrent = async (id) => {
    if (!id) return;
    setErr(''); setMsg(''); setNotifMsg('');
    setTransferOn(true);
    setNotifOn(false);
    setNotifEmail('');
    if (isDemoId(id)) {
      const demo = DEMO_TRANSFER[id] || { number: '', destinationName: '' };
      setCurrent(demo.number ? demo : null);
      setInput(stripCountryCode(demo.number));
      setDestLabel(demo.destinationName || '');
      return;
    }
    setCurLoading(true);
    try {
      const r = await api(`/api/numbers/${id}/transfer`);
      setCurrent(r);
      setInput(stripCountryCode(r.number));
      setDestLabel(r.destinationName || '');
    } catch (e) {
      setErr(e.message || 'Could not load forwarding number');
      setCurrent(null);
    } finally {
      setCurLoading(false);
    }
  };
  // Switching agents while a save is propagating would be confusing — the lock
  // covers the selector too, so this only fires between saves.
  useEffect(() => { if (selectedId) loadCurrent(selectedId); /* eslint-disable-next-line */ }, [selectedId]);

  const selectCard = (id) => setSelectedId((cur) => (cur === id ? '' : id));

  // Step 1 — open the confirmation modal.
  const requestSave = () => {
    setErr(''); setMsg('');
    setPendingSave({ number: `${COUNTRY_CODE}${input.trim()}`, label: destLabel.trim() });
  };

  // Step 2 — actually persist, then start the propagation countdown. Demo
  // numbers simulate the same flow locally instead of hitting the API.
  const confirmSave = async () => {
    const { number, label } = pendingSave;
    setPendingSave(null);
    setErr(''); setMsg('');
    if (isDemoId(selectedId)) {
      setBusy(true);
      DEMO_TRANSFER[selectedId] = { number, destinationName: label };
      setMsg('✓ Saved — applying the forwarding number to your agent.');
      setPropagating({ secondsLeft: PROPAGATION_SECONDS, totalSeconds: PROPAGATION_SECONDS });
      setCurrent({ number, destinationName: label });
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/numbers/${selectedId}/transfer`, { method: 'POST', body: { number, name: label } });
      setMsg('✓ Saved — applying the forwarding number to your agent.');
      setPropagating({ secondsLeft: PROPAGATION_SECONDS, totalSeconds: PROPAGATION_SECONDS });
      await loadCurrent(selectedId);
    } catch (e) {
      setErr(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const saveNotification = () => {
    setNotifMsg(notifEmail.trim()
      ? '✓ Saved locally — booking notifications aren’t wired up to a backend yet.'
      : '');
  };

  const fmtTime = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap animate-fade-up">
        <p className="text-base font-semibold tracking-wide max-w-2xl" style={{ color: 'var(--ink-2)' }}>
          Pick a plan / number below, then configure its tools — call transfer, booking notifications, more soon.
          Changes take effect on the next call (no restart needed).
          {loadingNumbers && numbers.length > 0 && <span className="font-normal text-xs text-mute ml-2">Refreshing…</span>}
        </p>
        {usingDemo && <span className="overview-demo-pill shrink-0">Demo data</span>}
      </div>

      <div className="mt-4">
        <button onClick={loadNumbers} disabled={loadingNumbers} className="btn-refresh">
          <RefreshCw size={15} className={loadingNumbers ? 'animate-spin' : ''} /> {loadingNumbers ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Propagation banner — shown after a save while the change goes live. */}
      {propagating && (
        <div className={`mt-4 rounded-xl border p-4 animate-fade-up ${propagationLocked ? 'border-blue-300 bg-blue-50' : 'border-blue-300 bg-blue-50'}`}>
          {propagationLocked ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50" strokeDashoffset="20" />
                </svg>
                Updating your agent …
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Applying the new call-forwarding number and restarting your voice agent.{' '}
                <strong>Please wait {fmtTime(propagating.secondsLeft)} before placing a test call.</strong>
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${((propagating.totalSeconds - propagating.secondsLeft) / propagating.totalSeconds) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold text-blue-700">
                ✓ Ready — call forwarding is live
                {selected?.value && <span className="font-normal text-slate-700"> · dial <span className="font-mono">{selected.value}</span> to test</span>}
              </div>
              <button onClick={() => setPropagating(null)} className="text-xs text-mute hover:text-slate-900">dismiss</button>
            </div>
          )}
        </div>
      )}

      {effectiveNumbers.length === 0 ? (
        <div className="mt-6 form-card border-blue-500/30 text-center text-mute py-10">
          {loadingNumbers ? 'Loading your numbers…' : 'No numbers yet. Add one from Plan & Numbers to configure tools.'}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start animate-fade-up">
          {/* --- Left: searchable plan/number list --------------------------- */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--body)] pointer-events-none" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search plans or numbers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
              {filteredNumbers.length === 0 && (
                <p className="text-sm text-mute italic py-4 text-center">No matches for “{search}”.</p>
              )}
              {filteredNumbers.map((n, i) => {
                const isOpen = selectedId === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => selectCard(n.id)}
                    disabled={propagationLocked}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="form-card border-blue-500/30 tap-shadow text-left transition duration-200 ease-out relative animate-fade-up hover:shadow-md hover:-translate-y-0.5 flex items-center gap-3 py-3"
                  >
                    <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--muted)] text-[var(--body)]'}`}>
                      <Radio size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[var(--foreground)] truncate">
                        {n.agentName || n.label || 'Unnamed agent'}
                      </div>
                      <span className="block text-xs text-[var(--body)] font-mono truncate">
                        {n.value}
                      </span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="pill bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-[10px] uppercase tracking-wider font-semibold">
                          {n.plan?.label || 'Starter'}
                        </span>
                        {isOpen && (
                          <span className="pill bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-[10px] uppercase tracking-wider font-semibold animate-pop-in">
                            Editing
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 text-[var(--body)] transition-transform duration-200 ease-out ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Right: tool config panel ------------------------------------ */}
          <div>
            {!selected ? (
              <div className="form-card border-blue-500/30 py-16 text-center text-mute">
                <Radio size={22} className="mx-auto mb-3 opacity-50" />
                Select a plan / number on the left to configure its tools.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 animate-fade-up">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">Configuring</div>
                    <div className="mt-0.5 font-bold text-[var(--foreground)]">
                      {selected.agentName || selected.label || 'Unnamed agent'}{' '}
                      <span className="font-mono font-normal text-mute text-sm">{selected.value}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId('')} className="btn-teal text-sm transition duration-200 ease-out hover:scale-105 active:scale-95">✕ Close</button>
                </div>

                {/* Blind transfer -------------------------------------------- */}
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-mute font-semibold mt-6 mb-2 animate-fade-up">
                  <PhoneForwarded size={12} /> Blind transfer
                </div>
                <div className="form-card animate-fade-up border-blue-500/30 transition duration-300 ease-out hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-[var(--foreground)]">
                        {selected.agentName || selected.label || 'Unnamed agent'}
                      </div>
                      <div className="text-xs text-mute mt-0.5">
                        <span className="font-mono">{selected.value}</span>
                        {selected.agentSlug && <> · {selected.agentSlug}</>}
                      </div>
                    </div>
                    <Toggle on={transferOn} onChange={setTransferOn} disabled={curLoading || busy || propagationLocked} />
                  </div>

                  {!transferOn ? (
                    <p className="mt-4 text-sm text-mute">Blind transfer is off — callers won’t be offered a human handoff.</p>
                  ) : (
                    <>
                      <div className="mt-4">
                        <label className="field-label">Transfer number</label>
                        <div className="flex items-stretch gap-2">
                          <span className="input w-auto px-3 flex items-center font-mono text-sm bg-[var(--muted)] text-[var(--foreground)] shrink-0">
                            {COUNTRY_CODE}
                          </span>
                          <input
                            className="input font-mono transition duration-200 ease-out focus:shadow-md"
                            value={input}
                            onChange={(e) => { setInput(e.target.value.replace(/[^\d]/g, '')); setMsg(''); setErr(''); }}
                            placeholder="5551234567"
                            disabled={curLoading || busy || propagationLocked}
                          />
                        </div>
                        <div className="text-[11px] text-mute mt-1">
                          You can’t forward to one of your own inbound numbers.
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="field-label">Destination label (optional)</label>
                        <input
                          className="input transition duration-200 ease-out focus:shadow-md"
                          value={destLabel}
                          onChange={(e) => setDestLabel(e.target.value)}
                          placeholder="e.g. Manager, Sales lead"
                          disabled={curLoading || busy || propagationLocked}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        {curLoading ? (
                          <span className="text-xs text-mute">Loading current…</span>
                        ) : current?.number ? (
                          <span className="text-xs text-mute inline-flex items-center gap-1">
                            <Check size={12} className="text-blue-400" /> Currently routing transfers to{' '}
                            <span className="font-mono text-[var(--foreground)]">{current.number}</span>
                            {current.destinationName && <> ({current.destinationName})</>}
                          </span>
                        ) : (
                          <span className="text-xs text-mute">No forwarding number set yet.</span>
                        )}
                        <button
                          className="btn-teal ml-auto transition duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-90"
                          onClick={requestSave}
                          disabled={busy || curLoading || propagationLocked || !input.trim()}
                        >
                          {propagationLocked ? `⏳ Locked · ${propagating.secondsLeft}s` : (busy ? 'Saving…' : 'Save transfer number')}
                        </button>
                      </div>

                      {msg && <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 animate-fade-up">{msg}</div>}
                      {err && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 animate-shake">⚠ {err}</div>}
                    </>
                  )}
                </div>

                {/* Booking notifications -------------------------------------- */}
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-mute font-semibold mt-6 mb-2 animate-fade-up">
                  <BellRing size={12} /> Booking notifications
                </div>
                <div className="form-card animate-fade-up border-blue-500/30 transition duration-300 ease-out hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-[var(--foreground)]">
                        {selected.agentName || selected.label || 'Unnamed agent'}
                      </div>
                      <div className="text-xs text-mute mt-0.5">
                        <span className="font-mono">{selected.value}</span>
                        {selected.agentSlug && <> · {selected.agentSlug}</>}
                      </div>
                    </div>
                    <Toggle on={notifOn} onChange={setNotifOn} />
                  </div>

                  {notifOn && (
                    <>
                      <div className="mt-4">
                        <label className="field-label">Notification email</label>
                        <input
                          className="input transition duration-200 ease-out focus:shadow-md"
                          type="email"
                          value={notifEmail}
                          onChange={(e) => { setNotifEmail(e.target.value); setNotifMsg(''); }}
                          placeholder="your@email.com"
                        />
                      </div>
                      <p className="text-[11px] text-mute mt-1">
                        {notifEmail.trim()
                          ? 'Owner will get a copy when meetings are booked.'
                          : 'No notification target set — owner won’t receive a copy when meetings are booked.'}
                      </p>
                      <div className="mt-3">
                        <button
                          className="btn-teal transition duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-90"
                          onClick={saveNotification}
                          disabled={!notifEmail.trim()}
                        >
                          Save notification
                        </button>
                      </div>
                      {notifMsg && <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 animate-fade-up">{notifMsg}</div>}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Save-confirmation modal — explains the 2-minute propagation window
          BEFORE the change is sent. Proceed applies it and starts the
          countdown; Cancel dismisses with no change. */}
      {pendingSave !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-backdrop-in">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border p-6 animate-modal-in animate-modal-border-shadow">
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">⏱️</span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Allow up to 2 minutes for changes to go live
                </h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  After you save, the dashboard needs around <strong>2 minutes</strong> to apply the new
                  call-forwarding number and restart your agent. Please don’t place a test call to{' '}
                  {selected?.value ? <span className="font-mono">{selected.value}</span> : 'your number'}{' '}
                  before the countdown finishes — calls placed earlier may still use the previous setting.
                </p>
                <p className="mt-3 text-xs text-mute">
                  Forwarding to: <span className="font-mono text-slate-900 dark:text-slate-100">{pendingSave.number}</span>
                  {pendingSave.label && <> ({pendingSave.label})</>}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => setPendingSave(null)} className="btn-ghost text-sm py-2 px-4 transition duration-200 ease-out hover:scale-105 active:scale-95">Cancel</button>
              <button onClick={confirmSave} className="btn-teal text-sm py-2 px-4 transition duration-200 ease-out hover:scale-105 active:scale-95" autoFocus>
                Proceed → start 2-minute window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
