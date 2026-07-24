import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  MessageCircle,
  Mic,
  Send,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';

const CUSTOMER_AGENTS = [
  { id: 'tkos-voice', name: 'TKOS', number: '+18173496752', voice: 'Leda', avatar: 'T', type: 'voice' },
  { id: 'my-agent-chat', name: 'My Agent', number: 'Chat agent', voice: '', avatar: 'M', type: 'chat' },
];

const ADMIN_AGENTS = [
  { id: 'ag_001', name: 'Sales Agent', type: 'voice', greeting: 'Hello! How can I help you today?' },
  { id: 'ag_002', name: 'Support Agent', type: 'voice', greeting: 'Welcome to support. What issue are you experiencing?' },
  { id: 'ag_003', name: 'Booking Agent', type: 'chat', greeting: 'Hi! Would you like to schedule an appointment?' },
];

const DUMMY_CHAT = [
  { role: 'agent', text: 'Hello! I\'m your AI assistant. How can I help you today?' },
  { role: 'user', text: 'I need to know your pricing plans.' },
  { role: 'agent', text: 'We offer three plans: Starter at $9/mo, Growth at $29/mo, and Scale at $79/mo. Would you like details on any of these?' },
  { role: 'user', text: 'Tell me more about the Growth plan.' },
  { role: 'agent', text: 'The Growth plan includes 500 minutes, 1 phone number, and up to 3 agents. It\'s perfect for growing businesses. Would you like to start a free trial?' },
];

const VOICE_CONFIG_TABS = [
  { id: 'behavior', label: 'Behavior', field: 'behavior', type: 'textarea', rows: 9 },
  { id: 'greeting', label: 'Greeting', field: 'greeting', type: 'textarea', rows: 9 },
  { id: 'knowledge', label: 'Knowledge', field: 'knowledge', type: 'textarea', rows: 9 },
  { id: 'voice', label: 'Voice', field: 'voice', type: 'input' },
];

const CHAT_CONFIG_TABS = [
  { id: 'behavior', label: 'Behavior', field: 'behavior', type: 'textarea', rows: 9, configLabel: 'System prompt' },
  { id: 'greeting', label: 'Greeting', field: 'greeting', type: 'textarea', rows: 9, configLabel: 'Greeting' },
  { id: 'knowledge', label: 'Knowledge', field: 'knowledge', type: 'textarea', rows: 9, configLabel: 'Knowledge' },
];

const VOICE_DEFAULT_CONFIG = {
  behavior: `# Identity
Your name is "Amelia". This OVERRIDES any other name that may appear below.
Always introduce yourself and refer to yourself as "Amelia", and never use a different name for yourself.

You are Amelia, the voice assistant for TKOS (Tech Knowledge Open Systems), a carrier-grade UCaaS platform positioned as "Africa's #1 Dynamic & Reliable Communication Solution."

Speak clearly, warmly, and professionally. Keep answers concise, confident, and helpful.`,
  greeting: '',
  knowledge: '',
  voice: '',
};

const CHAT_DEFAULT_CONFIG = {
  behavior: '',
  greeting: '',
  knowledge: '',
  voice: '',
};

function CustomerPlayground() {
  const [mode, setMode] = useState('voice');
  const [selectedId, setSelectedId] = useState('tkos-voice');
  const [configHidden, setConfigHidden] = useState(false);
  const [activeTab, setActiveTab] = useState('behavior');
  const [saved, setSaved] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 'greeting', role: 'agent', text: 'Hi! How can I help you today?' },
  ]);
  const [config, setConfig] = useState({
    ...VOICE_DEFAULT_CONFIG,
  });

  const visibleAgents = useMemo(
    () => CUSTOMER_AGENTS.filter((agent) => agent.type === mode),
    [mode]
  );

  useEffect(() => {
    if (!visibleAgents.some((agent) => agent.id === selectedId)) {
      setSelectedId(visibleAgents[0]?.id || '');
    }
  }, [visibleAgents, selectedId]);

  const selectedAgent = useMemo(
    () => visibleAgents.find((agent) => agent.id === selectedId) || visibleAgents[0] || CUSTOMER_AGENTS[0],
    [visibleAgents, selectedId]
  );

  const configTabs = mode === 'chat' ? CHAT_CONFIG_TABS : VOICE_CONFIG_TABS;
  const activeConfig = configTabs.find((tab) => tab.id === activeTab) || configTabs[0];

  useEffect(() => {
    if (!configTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(configTabs[0]?.id || 'behavior');
    }
  }, [configTabs, activeTab]);

  const updateField = (field, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const resetConfig = () => {
    setConfig(mode === 'chat' ? { ...CHAT_DEFAULT_CONFIG } : { ...VOICE_DEFAULT_CONFIG });
    setSaved(true);
  };

  const saveConfig = () => {
    setSaved(true);
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text },
      { id: `reply-${Date.now() + 1}`, role: 'agent', text: 'Thanks, I can help with that. Add your real prompt and greeting, then test the full flow here.' },
    ]);
    setChatInput('');
  };

  useEffect(() => {
    setConfig(mode === 'chat' ? { ...CHAT_DEFAULT_CONFIG } : { ...VOICE_DEFAULT_CONFIG });
    setSaved(true);
  }, [mode]);

  return (
    <div className="playground-ref-shell animate-fade-up">
      <p className="playground-ref-intro">
        Test your agents and tune them right here - no page hopping. Free, no plan minutes used.
      </p>

      <div className="playground-ref-topbar">
        <div className="playground-ref-controls">
          <div className="playground-ref-mode-switch">
            <button
              type="button"
              className={mode === 'voice' ? 'is-active' : ''}
              onClick={() => setMode('voice')}
            >
              <Mic size={14} />
              Voice
            </button>
            <button
              type="button"
              className={mode === 'chat' ? 'is-active' : ''}
              onClick={() => setMode('chat')}
            >
              <MessageCircle size={14} />
              Chat
            </button>
          </div>

          <div className="playground-ref-agent-picker">
            <div className="playground-ref-agent-badge">{selectedAgent.avatar}</div>
            <div className="playground-ref-agent-copy">
              <strong>{selectedAgent.name}</strong>
              <span>{selectedAgent.number}</span>
            </div>
            <select
              aria-label="Select playground agent"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {visibleAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.number}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="playground-ref-agent-chevron" />
          </div>
        </div>

        <button
          type="button"
          className="playground-ref-hide-btn"
          onClick={() => setConfigHidden((value) => !value)}
        >
          <SlidersHorizontal size={14} />
          {configHidden ? 'Show config' : 'Hide config'}
        </button>
      </div>

      <div className={`playground-ref-grid ${configHidden ? 'config-hidden' : ''}`}>
        <section className="playground-ref-stage">
          <div className="playground-ref-stage-head">
            <div className="playground-ref-stage-badge">{selectedAgent.avatar}</div>
            <div>
              <h3>{selectedAgent.name}</h3>
              <p>{mode === 'voice' ? `${selectedAgent.number} · ${selectedAgent.voice}` : 'Chat agent'}</p>
            </div>
          </div>

          {mode === 'voice' ? (
            <>
              <div className="playground-ref-status-card">
                <div className="playground-ref-status-title">
                  <span className="playground-ref-status-dot" />
                  Ready
                </div>
                <p>Microphone connected</p>
                <p>Voice: {selectedAgent.voice}</p>
              </div>

              <div className="playground-ref-avatar-ring">
                <div className="playground-ref-avatar-core">{selectedAgent.avatar}</div>
              </div>

              <div className="playground-ref-transcript">
                <strong>Live Conversation</strong>
                <p>Your conversation transcript will appear here once the voice test begins.</p>
              </div>

              <button type="button" className="playground-ref-start-btn">
                <Mic size={15} />
                Start voice test
              </button>

              <p className="playground-ref-help">
                Plays a sample of {selectedAgent.voice}&apos;s voice and transcribes your microphone in supported browsers.
              </p>
            </>
          ) : (
            <>
              <div className="playground-ref-chat-shell">
                <div className="playground-ref-chat-window">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`playground-ref-chat-bubble ${message.role === 'user' ? 'is-user' : 'is-agent'}`}
                    >
                      {message.text}
                    </div>
                  ))}
                </div>

                <div className="playground-ref-chat-input-row">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    aria-label="Type a chat message"
                  />
                  <button type="button" className="playground-ref-chat-send-btn" onClick={sendChatMessage}>
                    <Send size={15} />
                  </button>
                </div>
              </div>

              <p className="playground-ref-help is-chat">Free, no plan minutes used.</p>
            </>
          )}
        </section>

        {!configHidden && (
          <aside className="playground-ref-config-card">
            <div className="playground-ref-config-head">
              <div className="playground-ref-config-title">
                <Settings2 size={15} />
                Configure
              </div>
              <span className="playground-ref-config-pill">
                {mode === 'voice' ? 'VOICE AGENT' : 'CHAT AGENT'}
              </span>
            </div>

            <div className="playground-ref-tabs">
              {configTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? 'is-active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="playground-ref-config-body">
              <label className="playground-ref-field-label">{activeConfig.configLabel || activeConfig.label}</label>
              {activeConfig.type === 'textarea' ? (
                <>
                  <textarea
                    rows={activeConfig.rows}
                    value={config[activeConfig.field]}
                    onChange={(e) => updateField(activeConfig.field, e.target.value)}
                    placeholder=""
                  />
                  <div className="playground-ref-char-count">
                    {config[activeConfig.field].length.toLocaleString()} / 50,000
                  </div>
                </>
              ) : (
                <input
                  type="text"
                  value={config[activeConfig.field]}
                  onChange={(e) => updateField(activeConfig.field, e.target.value)}
                  placeholder=""
                />
              )}
            </div>

            <div className="playground-ref-config-footer">
              <div className="playground-ref-save-state">
                <span className={`playground-ref-save-dot ${saved ? 'is-saved' : 'is-unsaved'}`} />
                {saved ? (mode === 'chat' ? 'Preview - not saved' : 'Saved') : 'Unsaved changes'}
              </div>
              <div className="playground-ref-config-actions">
                <button type="button" className="playground-ref-reset-btn" onClick={resetConfig}>Reset</button>
                <button type="button" className="playground-ref-save-btn" onClick={saveConfig}>Save</button>
              </div>
            </div>

            <p className="playground-ref-config-note">
              {mode === 'voice'
                ? 'Voice changes take ~2 min to go live, then restart the test to hear them. Full editor ->'
                : 'Leave these blank for now and fill in Behavior, Greeting, and Knowledge when you\'re ready.'}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

function AdminPlayground() {
  const [mode, setMode] = useState('chat');
  const [selectedId, setSelectedId] = useState('ag_001');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState(DUMMY_CHAT);

  const agent = ADMIN_AGENTS.find((item) => item.id === selectedId);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setChatLog([...chatLog, { role: 'user', text: chatInput }]);
    setChatInput('');
    setTimeout(() => {
      setChatLog((prev) => [...prev, { role: 'agent', text: 'Thank you for your question! Let me look into that for you. Based on our records, I can help you with that right away.' }]);
    }, 800);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Test your agents and tune them right here.</p>

      <div className="flex items-center gap-3">
        <div className="flex bg-[var(--muted)] rounded-lg p-1">
          <button onClick={() => setMode('voice')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'voice' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'}`}>
            <Mic size={16} /> Voice
          </button>
          <button onClick={() => setMode('chat')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'chat' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'}`}>
            <MessageCircle size={16} /> Chat
          </button>
        </div>
        <select className="input py-2 text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {ADMIN_AGENTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="form-card flex flex-col min-h-[500px]">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Bot size={16} className="text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">{agent?.name || 'Agent'}</span>
            <span className="text-[11px] text-[var(--body)] ml-auto">{mode === 'chat' ? 'Chat Mode' : 'Voice Mode'}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mode === 'chat' ? (
              chatLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-white rounded-br-sm'
                      : 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                  <Mic size={40} className="text-[var(--primary)]" />
                </div>
                <p className="text-sm text-[var(--body)]">Click Start to begin a voice test</p>
                <p className="text-xs text-[var(--body)] mt-1 opacity-60">Your microphone will be activated</p>
              </div>
            )}
          </div>

          {mode === 'chat' && (
            <div className="pt-3 border-t border-[var(--border)] flex gap-2">
              <input
                className="input flex-1"
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="btn-primary px-4 py-2">
                <Bot size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="form-card">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Settings2 size={16} className="text-[var(--primary)]" /> Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <label className="field-label">Greeting</label>
                <textarea className="input" rows={3} defaultValue={agent?.greeting || ''} />
              </div>
              <div>
                <label className="field-label">Behavior</label>
                <textarea className="input" rows={4} defaultValue="You are a helpful and friendly AI assistant. Answer questions about our products and services, and help users with their inquiries." />
              </div>
              <div>
                <label className="field-label">Voice</label>
                <select className="input">
                  <option>Kore</option>
                  <option>Alloy</option>
                  <option>Echo</option>
                  <option>Fable</option>
                  <option>Onyx</option>
                  <option>Nova</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Playground() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) return <AdminPlayground />;
  return <CustomerPlayground />;
}
