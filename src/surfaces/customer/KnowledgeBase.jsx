import { useRef, useState } from 'react';
import { BookOpen, Bot, Plus, FileText, Globe, Upload, X } from 'lucide-react';

const DUMMY_KB = [
  { id: 'kb_1', name: 'Sales FAQ', agent: 'Sales Agent', questions: 24, lastUpdated: '2 days ago' },
  { id: 'kb_2', name: 'Support Procedures', agent: 'Support Agent', questions: 18, lastUpdated: '1 week ago' },
  { id: 'kb_3', name: 'Booking Guidelines', agent: 'Booking Agent', questions: 12, lastUpdated: '3 days ago' },
];

const DUMMY_TEMPLATES = [
  { id: 't1', name: 'Company Overview', questions: 8, description: 'General company info and services' },
  { id: 't2', name: 'Pricing FAQ', questions: 15, description: 'Plans, pricing, and billing questions' },
];

export default function KnowledgeBase() {
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState(DUMMY_TEMPLATES);
  const [draft, setDraft] = useState({
    url: '',
    fileName: '',
    name: '',
    companyInfo: '',
    faqs: '',
  });
  const fileInputRef = useRef(null);

  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const resetDraft = () => setDraft({
    url: '',
    fileName: '',
    name: '',
    companyInfo: '',
    faqs: '',
  });
  const closeCreate = () => {
    setShowCreate(false);
    resetDraft();
  };

  const importFromUrl = () => {
    if (!draft.url.trim()) return;
    let hostname = draft.url.trim();
    try {
      hostname = new URL(draft.url.trim()).hostname.replace(/^www\./, '');
    } catch {}
    setDraft((current) => ({
      ...current,
      name: current.name || `${hostname} knowledge base`,
      companyInfo: [current.companyInfo, `Company website: ${hostname}\nHours, pricing, policies, and service notes imported from the site.`]
        .filter(Boolean)
        .join('\n\n'),
      faqs: [current.faqs, `Q: What does ${hostname} offer?\nA: Review the imported company information and replace this sample answer with your final details.`]
        .filter(Boolean)
        .join('\n\n'),
    }));
  };

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFilePicked = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    setDraft((current) => ({
      ...current,
      fileName: file.name,
      name: current.name || `${baseName} knowledge base`,
      companyInfo: [current.companyInfo, `Imported notes from ${file.name}. Review and replace this sample content with the final company information.`]
        .filter(Boolean)
        .join('\n\n'),
      faqs: [current.faqs, 'Q: What key details should this document cover?\nA: Replace this sample FAQ with the final imported answers you want the agent to use.']
        .filter(Boolean)
        .join('\n\n'),
    }));
    event.target.value = '';
  };

  const createKnowledgeBase = () => {
    if (!draft.name.trim()) return;
    const faqCount = (draft.faqs.match(/^Q:/gm) || []).length;
    setTemplates((current) => [
      {
        id: `t${Date.now()}`,
        name: draft.name.trim(),
        questions: faqCount,
        description: draft.companyInfo.trim()
          ? draft.companyInfo.trim().split('\n')[0].slice(0, 64)
          : 'Reusable knowledge base template',
      },
      ...current,
    ]);
    closeCreate();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Reusable knowledge base templates and agent configurations.</p>

      <div className="form-card border-dashed border-[var(--primary)] bg-[var(--glow)] p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bot size={20} className="text-[var(--primary)] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">Knowledge Base Reuse</div>
              <div className="text-xs text-[var(--body)] mt-1 leading-relaxed">
                Create reusable knowledge templates and assign them to multiple agents.
                Templates sync automatically — update once, apply everywhere.
              </div>
            </div>
          </div>
          <button className="btn-primary text-xs px-3 py-2 shrink-0 self-start" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="inline mr-1" /> Add Knowledge Base
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="kb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeCreate}>
          <div
            className="kb-modal w-full animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6">
              <div className="kb-modal-header">
                <div>
                  <div className="text-[28px] font-semibold text-[var(--foreground)]">New knowledge base</div>
                  <div className="mt-1 text-sm text-[var(--body)]">
                    A reusable template you can apply to any agent later.
                  </div>
                </div>
                <button
                  type="button"
                  className="kb-modal-close"
                  onClick={closeCreate}
                  aria-label="Close knowledge base modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="kb-modal-import mt-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--body)]">Import from</div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="kb-modal-input text-sm"
                    placeholder="https://yourcompany.com"
                    value={draft.url}
                    onChange={(e) => setField('url', e.target.value)}
                  />
                  <button type="button" className="kb-modal-action shrink-0" onClick={importFromUrl}>
                    <Globe size={13} className="inline mr-1" /> URL
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="kb-modal-input text-sm"
                    placeholder="Choose a PDF or DOCX..."
                    value={draft.fileName}
                    onChange={(e) => setField('fileName', e.target.value)}
                  />
                  <button type="button" className="kb-modal-action shrink-0" onClick={triggerFilePicker}>
                    <Upload size={13} className="inline mr-1" /> File
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFilePicked}
                />

                <div className="mt-2 text-[11px] leading-relaxed text-[var(--body)]">
                  Extracted company info and FAQs are appended below - review before creating.
                </div>
              </div>

              <div className="mt-4">
                <label className="kb-modal-label">Name *</label>
                <input
                  className="kb-modal-input"
                  placeholder="e.g. Support desk template"
                  value={draft.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>

              <div className="mt-4">
                <label className="kb-modal-label">Company info</label>
                <textarea
                  className="kb-modal-textarea"
                  rows={4}
                  placeholder="Hours, pricing, policies..."
                  value={draft.companyInfo}
                  onChange={(e) => setField('companyInfo', e.target.value)}
                />
              </div>

              <div className="mt-4">
                <label className="kb-modal-label">FAQs</label>
                <textarea
                  className="kb-modal-textarea"
                  rows={5}
                  placeholder={'Q: ...\nA: ...'}
                  value={draft.faqs}
                  onChange={(e) => setField('faqs', e.target.value)}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" className="kb-modal-cancel" onClick={closeCreate}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="kb-modal-action"
                  onClick={createKnowledgeBase}
                  disabled={!draft.name.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Bot size={16} className="text-[var(--primary)]" /> From Your Agents
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DUMMY_KB.map((kb) => (
            <div key={kb.id} className="form-card hover:border-[var(--primary)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{kb.name}</div>
                  <div className="text-[11px] text-[var(--body)]">{kb.agent}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--body)]">
                <span>{kb.questions} questions</span>
                <span>Updated {kb.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--accent)]" /> Saved Templates
          </h3>
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="inline mr-1" /> New Template
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="form-card hover:border-[var(--accent)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--secondary)] to-[var(--link)] flex items-center justify-center">
                  <Globe size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{t.name}</div>
                  <div className="text-[11px] text-[var(--body)]">{t.description}</div>
                </div>
              </div>
              <div className="text-[11px] text-[var(--body)]">{t.questions} questions</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
