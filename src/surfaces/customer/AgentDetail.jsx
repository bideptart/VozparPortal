import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Globe, Mic, ChevronRight, ChevronDown, IdCard, BookOpen, Target,
  Circle, CheckCircle2, Check, Database, X, Lock, Puzzle, FileEdit, Sparkles,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { readCache, writeCache } from '../../utils/swrCache.js';
import { VOICES, LANGUAGES, gradientFor, statusMeta } from './KbAgent.jsx';
import { TEMPLATES } from './Templates.jsx';
import { loadKbTemplates, qaCount } from './kbTemplatesStore.js';

const TABS = [
  { id: 'identity', label: 'Identity', Icon: IdCard },
  { id: 'knowledge', label: 'Knowledge', Icon: BookOpen },
  { id: 'voice',    label: 'Voice',    Icon: Mic },
  { id: 'behavior', label: 'Behavior', Icon: Target },
];

// Searchable language combobox — a real text input (whatever the user types
// stays visible and editable) that filters LANGUAGES as-you-type, instead of
// a native <select> whose keystrokes are captured silently for jump-to-item.
function LanguageSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.value === value);
  const currentLabel = current ? `${current.label}${current.native ? ` · ${current.native}` : ''}` : '';
  const q = query.trim().toLowerCase();
  const filtered = !q ? LANGUAGES : LANGUAGES.filter((l) =>
    l.label.toLowerCase().includes(q) || (l.native || '').toLowerCase().includes(q)
  );

  return (
    <div ref={ref} className="relative">
      <input
        className="input"
        value={open ? query : currentLabel}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => { setOpen(false); setQuery(''); }}
        placeholder="Search language…"
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 py-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-2 text-sm text-mute">No languages match "{query}"</div>
          )}
          {filtered.map((l) => (
            <button
              key={l.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(l.value); setOpen(false); setQuery(''); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-tint)]"
              style={l.value === value ? { color: 'var(--primary)', fontWeight: 700 } : { color: 'var(--ink-2)' }}
            >
              {l.label}{l.native ? ` · ${l.native}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyDraft = () => ({
  label: '', agentName: '', greeting: '', prompt: '',
  voice: 'Kore', language: 'en-US', kbCompany: '', kbFaqs: '',
});

const MOCK_AGENT_DETAILS = {
  '1e0e75ae-3ff0-4027-9b1d-31a9cd6d430c': {
    id: '1e0e75ae-3ff0-4027-9b1d-31a9cd6d430c',
    label: 'Sushi Agent',
    agentName: 'Sushi Agent',
    greeting: 'こんにちは!',
    prompt: `You are Amelia, the voice assistant for TKOS (Tech Knowledge Open Systems), a carrier-grade UCaaS platform positioned as "Africa's #1 Dynamic & Reliable Communication Solution."

Tone & Style:
- Warm, articulate, and professional
- Keep answers direct and clear
- Ask follow-up questions only when needed
- Never guess if the knowledge base does not cover the answer

Role & Safety:
- Book meetings only for explicit appointment requests
- For support issues, complaints, or callback requests, take a message instead
- Use the knowledge base for factual answers
- Escalate politely when the caller needs a human handoff`,
    voice: 'Kore',
    language: 'en-US',
    kbCompany: `PRODUCT / SERVICE
TKOS is a cloud-based communication platform built for business telephony, call routing, unified communication, and customer engagement.

CAPABILITIES
- UCaaS voice calling
- Call routing and IVR
- Contact center support
- Number provisioning
- Business messaging

CHANNELS
- Phone
- Web
- Support desk

BUSINESS MODEL
- Monthly subscription
- Plan-based pricing
- Setup and service options available`,
    kbFaqs: `Q: What exactly does TKOS do?
A: TKOS provides business communication tools including cloud calling, routing, UCaaS features, and customer engagement support.

Q: Which services does your product include?
A: Services include voice calling, IVR and call routing, number provisioning, business messaging, and customer support capabilities.

Q: Is this for small businesses or larger teams?
A: TKOS is designed for business use and supports growing teams that need reliable communication infrastructure.

Q: Where is the company located?
A: The company serves business communication needs and can provide location details through the support team when required.`,
    value: '+18173496752',
    status: 'ready',
    plan: { label: 'Starter' },
    source: 'mock',
  },
};

function draftFromAgent(agent) {
  return {
    label: agent.label || '',
    agentName: agent.agentName || '',
    greeting: agent.greeting || '',
    prompt: agent.prompt || '',
    voice: agent.voice || 'Kore',
    language: agent.language || 'en-US',
    kbCompany: agent.kbCompany || '',
    kbFaqs: agent.kbFaqs || '',
  };
}

// Fixed platform-wide guardrails applied on top of every agent's own prompt
// — not per-agent data, so there's nothing to fetch or save here; this is
// reference documentation, matching the reference screenshot's own framing
// ("Shown for reference; they can't be edited").
const STANDARD_RULES = [
  {
    id: 'persona-lock',
    Icon: Lock,
    title: 'Persona lock',
    summary: 'Identity comes only from this prompt + knowledge base — never invented or inferred from tools.',
    detail: 'The agent never fabricates a name, title, or backstory beyond what’s written in the Identity tab and this prompt. If a caller asks something outside that scope, it says so rather than guessing.',
  },
  {
    id: 'knowledge-grounding',
    Icon: Puzzle,
    title: 'Knowledge grounding',
    summary: 'Answers factual questions only from the knowledge base; offers a callback instead of guessing.',
    detail: 'Facts, pricing, and policy answers come strictly from the Company info and FAQ pairs on the Knowledge tab. When something isn’t covered there, the agent offers to have someone follow up rather than inventing an answer.',
  },
  {
    id: 'language-switching',
    Icon: Globe,
    title: 'Language switching',
    summary: 'Detects the caller’s language and replies entirely in it; switches when they do.',
    detail: 'The agent starts in the Identity tab’s default greeting language, then follows the caller if they switch — mid-call language changes are supported, not just at the start.',
  },
  {
    id: 'ticket-vs-meeting',
    Icon: FileEdit,
    title: 'Ticket vs meeting',
    summary: 'Books a meeting only for explicit appointments; takes a message for issues/complaints/callbacks.',
    detail: 'Scheduling only fires for a clearly-requested appointment. Anything else — a bug report, a complaint, "call me back" — is logged as a message/ticket instead of turning into a calendar event.',
  },
];

const SENSITIVITY_OPTIONS = [
  { id: 'sensitive', label: 'Sensitive', desc: 'Interrupts easily' },
  { id: 'balanced',  label: 'Balanced',  desc: 'Recommended' },
  { id: 'firm',      label: 'Firm',      desc: 'Resists noise' },
];

function Toggle({ on, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</div>
        <div className="text-xs text-mute mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
        style={{ background: on ? 'var(--primary)' : 'var(--line)' }}
        role="switch"
        aria-checked={on}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: on ? 22 : 2 }}
        />
      </button>
    </div>
  );
}

export default function AgentDetail() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [numbers, setNumbers] = useState(() => readCache('agentDetail.numbers', currentUser?.id) ?? []);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [savedDraft, setSavedDraft] = useState(emptyDraft());
  const appliedTemplateRef = useRef(false);
  const identityRef = useRef(null);
  const voiceRef = useRef(null);
  const knowledgeRef = useRef(null);
  const behaviorRef = useRef(null);
  const sectionRefs = { identity: identityRef, voice: voiceRef, knowledge: knowledgeRef, behavior: behaviorRef };

  // Scroll-spy — highlights whichever section's top has crossed the sticky
  // jump nav, so the active tab tracks scroll position instead of staying
  // permanently unselected (this is a single scrolling page, not a wizard).
  // Tapping a tab sets activeSection directly (not just scrollIntoView) —
  // the observer's narrow detection band can miss short/edge sections, so
  // the tap itself must not depend on it to show the right tab as active.
  const [activeSection, setActiveSection] = useState('identity');
  // Suppresses the observer for a moment after a tap so its (slightly
  // delayed) callback can't overwrite the tab the user just picked with
  // stale pre-scroll geometry.
  const manualNavRef = useRef(false);
  const scrollToSection = (id) => {
    manualNavRef.current = true;
    setActiveSection(id);
    sectionRefs[id]?.current?.scrollIntoView({ block: 'start' });
    setTimeout(() => { manualNavRef.current = false; }, 700);
  };

  useEffect(() => {
    const order = TABS.map((t) => t.id);
    const observer = new IntersectionObserver(
      (entries) => {
        if (manualNavRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target.dataset.section);
        if (visible.length) {
          setActiveSection(order.filter((id) => visible.includes(id)).pop());
        }
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );
    order.forEach((id) => { if (sectionRefs[id].current) observer.observe(sectionRefs[id].current); });
    return () => observer.disconnect();
  }, []);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Call-behavior tuning — UI-only for now. There's no interruption
  // sensitivity / noise-reduction / turn-detection field on user_numbers in
  // the backend yet, so these aren't part of the save payload; they reset on
  // reload rather than silently pretending to persist something they don't.
  const [sensitivity, setSensitivity] = useState('balanced');
  const [reduceNoise, setReduceNoise] = useState(true);
  const [smartTurnDetection, setSmartTurnDetection] = useState(true);

  // Website-import — real feature, same /api/kb/import-from-website endpoint
  // KbAgent.jsx already uses.
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState('');
  const [importPreview, setImportPreview] = useState(null);

  // "Import from knowledge base" is a chooser — import from a website (real,
  // AI-extracted) or apply one of the reusable templates saved on the
  // Knowledge Base page (see kbTemplatesStore.js).
  const [sourcePicker, setSourcePicker] = useState(false);
  const [browsingKb, setBrowsingKb] = useState(false);

  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // "Your knowledge bases" — reusable templates (name + company info + FAQs)
  // shared with the Knowledge Base page via localStorage (kbTemplatesStore.js).
  // Creating/deleting templates lives on that page; here we only apply one —
  // picking a new one always overwrites the Company info/FAQ fields directly,
  // there's no separate "list" to manage on this page.
  const [kbTemplates, setKbTemplates] = useState(() => loadKbTemplates());

  const applyKbTemplate = (t) => {
    set({ kbCompany: t.kbCompany || '', kbFaqs: t.kbFaqs || '' });
    setSourcePicker(false);
    setBrowsingKb(false);
    setNotice(`✓ Applied "${t.name}" to this agent's knowledge base.`);
  };

  const [expandedRule, setExpandedRule] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api('/api/numbers');
        const next = r.numbers || [];
        if (!cancelled) {
          setNumbers(next);
          writeCache('agentDetail.numbers', currentUser?.id, next);
        }
      } catch {}
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const wantId = searchParams.get('n') || searchParams.get('id');
  const selected = useMemo(() => {
    return numbers.find((n) => n.id === wantId)
      || MOCK_AGENT_DETAILS[wantId]
      || numbers[0]
      || null;
  }, [numbers, wantId]);

  useEffect(() => {
    if (!selected) return;
    const d = draftFromAgent(selected);
    setDraft(d);
    setSavedDraft(d);
  }, [selected]);

  // "Use template" on the Browse Templates page links here with ?template=id
  // instead of faking a new-agent flow — it pre-fills the real prompt/
  // greeting fields on the existing agent so the user reviews them and saves
  // through the normal PATCH /api/numbers/:id path (or discards). Applied
  // once per visit, then the param is stripped so a later reload doesn't
  // silently re-overwrite whatever the user has since edited.
  const templateId = searchParams.get('template');
  useEffect(() => {
    if (!selected || appliedTemplateRef.current || !templateId) return;
    appliedTemplateRef.current = true;
    const t = TEMPLATES.find((x) => x.id === templateId);
    if (t) {
      setDraft((d) => ({ ...d, prompt: t.prompt, greeting: t.greeting }));
      setTimeout(() => scrollToSection('behavior'), 0);
    }
    setSearchParams({ n: selected.id }, { replace: true });
  }, [selected, templateId]);

  if (!currentUser) return null;

  const isAdminTier =
    currentUser.userType === 'superadmin'
    || currentUser.userType === 'admin'
    || currentUser.role === 'admin';
  const basePath = isAdminTier ? '/admin' : '/dashboard';

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  // Field-by-field, not JSON.stringify(draft) !== JSON.stringify(savedDraft) —
  // prompt/kbFaqs can run to thousands of characters, so re-serializing the
  // whole draft on every render made every keystroke in those fields laggy.
  const dirty = draft.label !== savedDraft.label
    || draft.agentName !== savedDraft.agentName
    || draft.greeting !== savedDraft.greeting
    || draft.prompt !== savedDraft.prompt
    || draft.voice !== savedDraft.voice
    || draft.language !== savedDraft.language
    || draft.kbCompany !== savedDraft.kbCompany
    || draft.kbFaqs !== savedDraft.kbFaqs;

  const save = async () => {
    if (!selected) return;
    if (selected.source === 'mock') {
      setSaveErr('');
      setSavedDraft(draft);
      return;
    }
    setSaving(true);
    setSaveErr('');
    try {
      const r = await api(`/api/numbers/${selected.id}`, { method: 'PATCH', body: draft });
      setNumbers((ns) => ns.map((n) => (n.id === selected.id ? r.number : n)));
      setSavedDraft(draft);
    } catch (e) {
      setSaveErr(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => setDraft(savedDraft);

  const runImport = () => {
    if (!importUrl.trim()) return;
    setImportBusy(true);
    setImportErr('');
    setImportPreview(null);
    api('/api/kb/import-from-website', { method: 'POST', body: { url: importUrl.trim() } })
      .then((r) => setImportPreview({
        kbCompany: r.kbCompany || '',
        kbFaqs:    r.kbFaqs    || '',
        url:       r.url       || importUrl.trim(),
        faqCount:  r.faqCount  || 0,
      }))
      .catch((e) => setImportErr(e.message || 'Could not import from that URL'))
      .finally(() => setImportBusy(false));
  };

  if (loaded && !selected) {
    return (
      <div>
        <Link to={`${basePath}/agents`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">
          <ArrowLeft size={14} /> All agents
        </Link>
        <div className="mt-6 form-card text-center py-12 text-mute">Agent not found.</div>
      </div>
    );
  }
  if (!selected) return null;

  // Same wording as the AgentsList status pill ("Live" for ready/active),
  // not statusMeta's more generic "Active" label.
  const statusLabel = statusMeta(selected.status).label === 'Active' ? 'Live' : statusMeta(selected.status).label;
  const name = (selected.value === '+18173496752'
    ? (draft.agentName || selected.agentName || 'Sushi Agent')
    : (draft.label || selected.agentName || selected.label || 'Agent')).trim();
  const initial = (name[0] || '#').toUpperCase();

  return (
    <div>
      <Link to={`${basePath}/agents`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">
        <ArrowLeft size={14} /> All agents
      </Link>

      {/* === Agent header card ======================================= */}
      <div className="mt-4 form-card flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0"
            style={{ background: gradientFor(selected.id) }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-lg truncate">{name}</span>
              <span className="pill" style={{ background: 'rgba(4,107,210,0.14)', color: 'var(--primary)' }}><Circle size={8} fill="currentColor" /> {statusLabel.toUpperCase()}</span>
              <span className="pill" style={{ background: 'var(--line-2)', color: 'var(--ink-3)' }}>{(selected.plan?.label || 'Starter').toUpperCase()}</span>
            </div>
            <div className="mt-1 text-xs text-mute">Editing mode</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface-tint)' }}>
            <div className="uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-3)', fontSize: 9 }}>Test it</div>
            <div className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>Dial {selected.value || '—'}</div>
          </div>
        </div>
      </div>

      {/* === Quick start ============================================== */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-mute">Quick start:</span>
        <button
          type="button"
          className="btn-ghost text-xs inline-flex items-center gap-1 py-1.5 px-3 transition-all duration-150 hover:!bg-[var(--primary)] hover:!text-white hover:!border-[var(--primary)]"
          onClick={() => navigate(`${basePath}/templates`)}
        >
          <ChevronRight size={12} /> Start from template
        </button>
        <button
          type="button"
          className="btn-ghost text-xs inline-flex items-center gap-1 py-1.5 px-3 transition-all duration-150 hover:!bg-[var(--primary)] hover:!text-white hover:!border-[var(--primary)]"
          onClick={() => { setSourcePicker(true); setBrowsingKb(false); }}
        >
          <ChevronRight size={12} /> Import from knowledge base
        </button>
      </div>

      {/* === Jump nav — scrolls to each section on this single page ===== */}
      <div className="mt-4 form-card p-0 overflow-hidden sticky top-16 z-20" style={{ background: 'var(--popover)', borderColor: 'rgba(96,165,250,0.2)' }}>
        <div className="flex border-b" style={{ borderColor: 'rgba(96,165,250,0.18)' }}>
          {TABS.map((t, i) => {
            const active = activeSection === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => scrollToSection(t.id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-3 text-sm border-b-2 transition-colors duration-150 ${i > 0 ? 'border-l' : ''} ${active ? 'font-semibold' : 'font-medium'}`}
                style={{
                  borderLeftColor: 'rgba(96,165,250,0.18)',
                  borderBottomColor: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--ink-3)',
                }}
              >
                <t.Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-4">
          <section ref={identityRef} data-section="identity" className="form-card" style={{ scrollMarginTop: 140 }}>
              <div className="text-xs font-mono uppercase tracking-wide" style={{ color: 'var(--primary)' }}>Agent identity</div>
              <p className="text-sm text-mute mt-1">Its display name, language, and the greeting callers hear first.</p>

              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Label / plan name</label>
                  <input className="input" value={draft.label || draft.agentName} onChange={(e) => set({ label: e.target.value })} />
                  <div className="field-help">Shown on Numbers, Billing, and Call history. Not spoken to callers.</div>
                </div>
                <div>
                  <label className="field-label">Default greeting language</label>
                  <LanguageSelect value={draft.language} onChange={(v) => set({ language: v })} />
                </div>
              </div>

              <label className="field-label mt-4">Greeting (first line on every call)</label>
              <textarea className="input" rows={4} value={draft.greeting} onChange={(e) => set({ greeting: e.target.value })} placeholder="Hi, thanks for calling…" />
          </section>

          <section ref={knowledgeRef} data-section="knowledge" className="form-card" style={{ scrollMarginTop: 140 }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wide inline-flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                    <BookOpen size={12} /> Knowledge base
                  </div>
                  <p className="text-sm text-mute mt-1">Facts the agent answers from — services, hours, pricing, policies, FAQs.</p>
                </div>
                <button
                  type="button"
                  className="btn-teal text-sm whitespace-nowrap inline-flex items-center gap-1.5"
                  onClick={() => { setImporting(true); setImportErr(''); setImportPreview(null); setImportUrl(''); }}
                >
                  <Globe size={14} /> Import from website
                </button>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label !mb-0">Company info</label>
                    <span className="text-xs text-mute">{draft.kbCompany.length.toLocaleString()} / 50,000</span>
                  </div>
                  <textarea className="input mt-1.5" rows={12} value={draft.kbCompany} onChange={(e) => set({ kbCompany: e.target.value })} placeholder="About your company…" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label !mb-0">FAQ pairs</label>
                    <span className="text-xs text-mute">{(draft.kbFaqs.match(/^Q:/gm) || []).length} Q&amp;A pairs</span>
                  </div>
                  <textarea className="input mt-1.5" rows={12} value={draft.kbFaqs} onChange={(e) => set({ kbFaqs: e.target.value })} placeholder={'Q: What are your business hours?\nA: We\'re open Mon–Fri 9–6.'} />
                </div>
              </div>
          </section>

          <section ref={voiceRef} data-section="voice" className="form-card" style={{ scrollMarginTop: 140 }}>
              <div className="text-xs font-mono uppercase tracking-wide inline-flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                <Mic size={12} /> Voice
              </div>
              <div className="mt-4 space-y-1">
                {VOICES.map((v) => {
                  const sel = draft.voice === v.value;
                  return (
                    <div key={v.value} className={`voice-row${sel ? ' selected' : ''}`} onClick={() => set({ voice: v.value })}>
                      <div>
                        <div className="voice-name font-medium text-sm flex items-center gap-2">
                          {v.label}{sel && <Check size={14} />}
                          <span
                            className="pill text-[9px]"
                            style={v.gender === 'male'
                              ? { background: 'rgba(4,107,210,0.12)', color: 'var(--primary)' }
                              : { background: 'rgba(219,39,119,0.10)', color: '#be185d' }}
                          >
                            {v.gender === 'male' ? 'MALE' : 'FEMALE'}
                          </span>
                          {v.allLang && (
                            <span className="pill text-[9px]" style={{ background: 'rgba(4,107,210,0.14)', color: 'var(--primary)' }}>ALL-LANG</span>
                          )}
                        </div>
                        <div className="text-xs text-mute mt-0.5">{v.desc}</div>
                      </div>
                      <ChevronRight size={16} className="text-mute" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] text-mute">Click a voice row to make it the selected voice for this agent.</div>

              <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgba(96,165,250,0.18)' }}>
                <div className="text-xs font-mono uppercase tracking-wide inline-flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                  <Target size={12} /> Call behavior
                </div>
                <p className="text-sm text-mute mt-1">
                  How the agent handles interruptions and background noise. The defaults stop it from cutting itself off mid-sentence.
                </p>

                <label className="field-label mt-4">Interruption sensitivity</label>
                <div className="grid sm:grid-cols-3 gap-2">
                  {SENSITIVITY_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSensitivity(o.id)}
                      className="text-left rounded-lg border-2 px-3 py-2.5"
                      style={sensitivity === o.id
                        ? { borderColor: 'var(--primary)', background: 'var(--surface-tint)' }
                        : { borderColor: 'rgba(96,165,250,0.28)', background: 'var(--muted)' }}
                    >
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{o.label}</div>
                      <div className="text-xs text-mute mt-0.5">{o.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="field-help">
                  Higher = the agent needs more real words before it stops to listen, so a stray sound won't chop its speech.
                </div>

                <div className="divide-y" style={{ borderColor: 'rgba(96,165,250,0.18)' }}>
                  <Toggle
                    on={reduceNoise}
                    onChange={setReduceNoise}
                    label="Reduce background noise"
                    desc="Filters ambient noise so it won't trip the agent into stopping."
                  />
                  <Toggle
                    on={smartTurnDetection}
                    onChange={setSmartTurnDetection}
                    label="Smart turn detection"
                    desc="Waits until the caller has actually finished before it replies."
                  />
                </div>
              </div>
          </section>

          <section ref={behaviorRef} data-section="behavior" className="form-card" style={{ scrollMarginTop: 140 }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wide inline-flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                    <Target size={12} /> Behavior &amp; routing
                  </div>
                  <p className="text-sm text-mute mt-1">How the agent talks, what it must and must not do, and when to hand off.</p>
                </div>
                <button
                  type="button"
                  className="btn-teal text-sm whitespace-nowrap inline-flex items-center gap-1.5"
                  onClick={() => setNotice('Generating a prompt from Company info is coming soon.')}
                >
                  <Sparkles size={14} /> Generate from Company info
                </button>
              </div>

              <textarea className="input mt-4" rows={12} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="You are the AI receptionist for…" />
              <div className="field-help">{draft.prompt.length.toLocaleString()} / 50,000 chars</div>

              <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgba(96,165,250,0.18)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs font-mono uppercase tracking-wide inline-flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                    <Target size={12} /> Standard rules
                  </div>
                  <span className="pill" style={{ background: 'rgba(4,107,210,0.14)', color: 'var(--primary)' }}><Check size={10} /> Always on</span>
                </div>
                <p className="text-sm text-mute mt-1">
                  Applied automatically on top of your instructions above — every agent gets these. Shown for reference; they can't be edited.
                </p>

                <div className="mt-3 space-y-2">
                  {STANDARD_RULES.map((r) => {
                    const open = expandedRule === r.id;
                    return (
                      <div key={r.id} className="rounded-lg border" style={{ borderColor: 'rgba(96,165,250,0.24)' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedRule(open ? null : r.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-tint)' }}>
                            <r.Icon size={15} style={{ color: 'var(--primary)' }} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{r.title}</div>
                            <div className="text-xs text-mute mt-0.5">{r.summary}</div>
                          </span>
                          {open ? <ChevronDown size={16} className="text-mute flex-shrink-0" /> : <ChevronRight size={16} className="text-mute flex-shrink-0" />}
                        </button>
                        {open && (
                          <div className="px-4 pb-3 pl-[3.75rem] text-xs text-mute">{r.detail}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
          </section>
      </div>

      {/* === Save bar ================================================= */}
      <div className="mt-4 form-card flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-mute inline-flex items-center gap-1.5">
          {saveErr ? (
            <span className="text-red-600">{saveErr}</span>
          ) : dirty ? (
            'Review the sections above, then submit — changes go live after saving.'
          ) : (
            <><CheckCircle2 size={14} className="text-[var(--primary)]" /> All changes saved</>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost text-sm" disabled={!dirty} onClick={discard}>Discard</button>
          <button type="button" className="btn-teal text-sm" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save and submit'}
          </button>
        </div>
      </div>

      {/* Website-import modal — paste a URL, extract company info + FAQs,
          review before it lands in the draft (still needs Save to persist). */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-10 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold inline-flex items-center gap-2"><Globe size={18} /> Build knowledge base from your website</div>
                <p className="text-xs text-mute mt-1">
                  Paste your homepage URL. We'll read it, extract the most receptionist-relevant facts, and generate
                  Company info + FAQs you can review before saving.
                </p>
              </div>
              <button
                onClick={() => !importBusy && setImporting(false)}
                className="text-mute hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <label className="field-label mt-4">Website URL</label>
            <input
              className="input text-sm font-mono"
              placeholder="https://yourcompany.com"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importBusy}
              onKeyDown={(e) => { if (e.key === 'Enter' && !importBusy) runImport(); }}
            />
            <div className="field-help">
              Single-page fetch — works best on a homepage or "About" page that already names your services / hours / location.
            </div>

            {importErr && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{importErr}</div>
            )}

            {importPreview && (
              <div className="mt-4 space-y-3">
                <div className="text-xs text-mute uppercase tracking-wider font-semibold">Preview</div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-mute font-semibold mb-1">
                    Company info ({importPreview.kbCompany.length.toLocaleString()} chars)
                  </div>
                  <pre className="text-xs whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded p-3 max-h-48 overflow-y-auto">
                    {importPreview.kbCompany || '(empty)'}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-mute font-semibold mb-1">
                    FAQs ({importPreview.faqCount} Q&amp;A pairs)
                  </div>
                  <pre className="text-xs whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded p-3 max-h-48 overflow-y-auto">
                    {importPreview.kbFaqs || '(no FAQs extracted)'}
                  </pre>
                </div>
                <div className="text-[11px] text-mute">
                  Source: <span className="font-mono" style={{ color: 'var(--primary)' }}>{importPreview.url}</span>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              {!importPreview ? (
                <>
                  <button type="button" className="btn-ghost text-sm" onClick={() => setImporting(false)} disabled={importBusy}>Cancel</button>
                  <button type="button" onClick={runImport} disabled={importBusy || !importUrl.trim()} className="btn-teal text-sm disabled:opacity-50">
                    {importBusy ? 'Reading site…' : 'Extract knowledge base'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-ghost text-sm" onClick={() => setImporting(false)}>Close (don't import)</button>
                  <button
                    type="button"
                    onClick={() => {
                      set({
                        kbCompany: [draft.kbCompany, importPreview.kbCompany].filter(Boolean).join('\n\n'),
                        kbFaqs:    [draft.kbFaqs,    importPreview.kbFaqs   ].filter(Boolean).join('\n\n'),
                      });
                      setImporting(false);
                    }}
                    className="btn-ghost text-sm"
                  >
                    + Append to existing
                  </button>
                  <button
                    type="button"
                    onClick={() => { set({ kbCompany: importPreview.kbCompany, kbFaqs: importPreview.kbFaqs }); setImporting(false); }}
                    className="btn-teal text-sm"
                  >
                    Replace draft &amp; close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Import from knowledge base" chooser — a website import is real
          (same /api/kb/import-from-website flow as the Knowledge tab);
          browsing switches this same modal to the saved-templates list. */}
      {sourcePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-10 overflow-y-auto"
          onClick={() => setSourcePicker(false)}
        >
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{browsingKb ? 'Saved knowledge bases' : 'Import a knowledge base'}</div>
                <p className="text-xs text-mute mt-1">
                  {browsingKb ? 'Pick a saved template to apply to this agent.' : "Choose where the agent's company info and FAQs should come from."}
                </p>
              </div>
              <button onClick={() => setSourcePicker(false)} className="text-mute hover:text-[var(--ink)]" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {!browsingKb ? (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  className="w-full flex items-start gap-3 p-3 rounded-xl border text-left hover:bg-[var(--surface-2)]"
                  style={{ borderColor: 'var(--line)' }}
                  onClick={() => { setSourcePicker(false); setImporting(true); setImportErr(''); setImportPreview(null); setImportUrl(''); }}
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-tint)' }}>
                    <Globe size={16} style={{ color: 'var(--primary)' }} />
                  </span>
                  <span>
                    <span className="block font-semibold text-sm" style={{ color: 'var(--ink)' }}>Import from a website</span>
                    <span className="block text-xs text-mute mt-0.5">Paste a URL — we'll read it and extract company info + FAQs for you to review.</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="w-full flex items-start gap-3 p-3 rounded-xl border text-left hover:bg-[var(--surface-2)]"
                  style={{ borderColor: 'var(--line)' }}
                  onClick={() => setBrowsingKb(true)}
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                    <Database size={16} className="text-mute" />
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Browse saved knowledge bases</span>
                    <span className="block text-xs text-mute mt-0.5">Reuse a knowledge base saved from another agent.</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-4">
                {kbTemplates.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--line)' }}>
                    <Database size={20} className="mx-auto text-mute" />
                    <div className="mt-2 text-sm text-mute">No saved knowledge bases yet.</div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {kbTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyKbTemplate(t)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:bg-[var(--surface-2)]"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                          <Database size={16} className="text-[var(--primary)]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{t.name}</span>
                          <span className="block text-xs text-mute mt-0.5">{(t.kbCompany || '').length.toLocaleString()} chars info · {qaCount(t.kbFaqs)} Q&amp;A</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="btn-ghost text-sm w-full mt-3" onClick={() => setBrowsingKb(false)}>
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating so it's visible regardless of scroll position — the
          triggers for this (Create/Import a reusable KB) live far down the
          page, well below the old inline placement near the top. */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
          <div className="pill text-xs shadow-xl" style={{ background: 'var(--ink)', color: '#fff' }}>{notice}</div>
        </div>
      )}
    </div>
  );
}
