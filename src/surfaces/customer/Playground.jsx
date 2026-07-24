import { useState } from 'react';
import { Mic, MessageCircle, Send, Bot, Settings } from 'lucide-react';

const DUMMY_AGENTS = [
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

export default function Playground() {
  const [mode, setMode] = useState('chat');
  const [selectedId, setSelectedId] = useState('ag_001');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState(DUMMY_CHAT);

  const agent = DUMMY_AGENTS.find((a) => a.id === selectedId);

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
          {DUMMY_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                <Send size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="form-card">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Settings size={16} className="text-[var(--primary)]" /> Configuration
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