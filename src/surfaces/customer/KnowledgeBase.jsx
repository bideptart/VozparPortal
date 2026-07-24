import { useState } from 'react';
import { BookOpen, Bot, Plus, FileText, Globe, Upload } from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Reusable knowledge base templates and agent configurations.</p>

      <div className="form-card border-dashed border-[var(--primary)] bg-[var(--glow)] p-4">
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
      </div>

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
          {DUMMY_TEMPLATES.map((t) => (
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