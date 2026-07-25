import { useMemo, useState } from 'react';
import {
  Bot,
  Download,
  FileAudio2,
  ListRestart,
  MessageSquare,
  Phone,
  Search,
  ShieldQuestion,
} from 'lucide-react';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const isoDaysAgo = (daysAgo, hour = 12, minute = 0) =>
  new Date(now.getTime() - daysAgo * DAY + hour * 60 * 60 * 1000 + minute * 60 * 1000).toISOString();

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' },
];

const CALL_LOGS = [
  { id: 'cl_1', number: '+18173496752', duration: 145, transcript: true, date: isoDaysAgo(11, 14, 12), summary: 'Customer asked about new pricing and setup timing.' },
  { id: 'cl_2', number: '+18175551028', duration: 56, transcript: true, date: isoDaysAgo(14, 10, 41), summary: 'Caller wanted to confirm voicemail forwarding.' },
  { id: 'cl_3', number: '+14695558831', duration: 203, transcript: true, date: isoDaysAgo(21, 16, 3), summary: 'Outbound follow-up on onboarding progress.' },
];

const CHAT_LOGS = [
  { id: 'ch_1', session: 'b58d01fa-f0e2-33f4-999c-11cfe5e4d553', duration: 5, date: isoDaysAgo(0, 14, 8), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_2', session: '95f46b1d-1e76-4071-b11a-1451f970d018', duration: 34, date: isoDaysAgo(0, 8, 42), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_3', session: 'e840eecc-776e-94ab-20f3-d3b1f5c77647', duration: 123, date: isoDaysAgo(1, 12, 41), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_4', session: '7cd19034-b63c-9f9c-f337-70c53e158c28', duration: 40, date: isoDaysAgo(1, 18, 25), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_5', session: 'd514ae49-3702-5244-44e4-14623f98214', duration: 10, date: isoDaysAgo(2, 9, 10), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_6', session: '34229031-4e02-37af-7b39-1fb82630a157', duration: 139, date: isoDaysAgo(2, 16, 9), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_7', session: '40176061-4082-4942-4020-110710172f1', duration: 69, date: isoDaysAgo(3, 15, 48), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_8', session: 'a5df8f7b-feb9-c74c-a589-cdfd1c2a519c', duration: 59, date: isoDaysAgo(4, 14, 8), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_9', session: '42d00444-4cdc-7dbc-c002-bcb7cc2c82c', duration: 66, date: isoDaysAgo(4, 17, 46), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_10', session: 'f0eb9903-1ecf-4742-f90e-239396d0e1f8', duration: 150, date: isoDaysAgo(5, 13, 16), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_11', session: 'c1bb0fa7-a76f-145b-1e90-03fac607fa16', duration: 50, date: isoDaysAgo(5, 18, 5), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_12', session: '07000cc2-56d2-9234-fbe7-31dc091177f5', duration: 244, date: isoDaysAgo(6, 10, 3), agent: 'My Agent', transcript: true, outcome: 'hangup' },
  { id: 'ch_13', session: '56dccd31-e267-72ac-10f5-e3a981e91c3f', duration: 169, date: isoDaysAgo(6, 15, 56), agent: 'My Agent', transcript: true, outcome: 'hangup' },
];

function isInRange(dateString, range) {
  const date = new Date(dateString);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  if (range === 'today') return date >= startOfToday;
  if (range === 'yesterday') return date >= startOfYesterday && date < startOfToday;
  if (range === 'last7') return date >= new Date(startOfToday.getTime() - 6 * DAY);
  if (range === 'month') return date >= startOfMonth;
  if (range === 'lastMonth') return date >= startOfLastMonth && date < startOfMonth;
  return true;
}

function getRangeDates(range) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfMonth.getTime() - DAY);

  if (range === 'today') return { from: startOfToday, to: now };
  if (range === 'yesterday') return { from: startOfYesterday, to: new Date(startOfToday.getTime() - 1) };
  if (range === 'last7') return { from: new Date(startOfToday.getTime() - 6 * DAY), to: now };
  if (range === 'month') return { from: startOfMonth, to: now };
  if (range === 'lastMonth') return { from: startOfLastMonth, to: endOfLastMonth };
  return { from: null, to: null };
}

const formatShortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });

const formatSeconds = (seconds) => {
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export default function Reports() {
  const [logsTab, setLogsTab] = useState('call');
  const [range, setRange] = useState('last7');
  const [subTab, setSubTab] = useState('recording');
  const [search, setSearch] = useState('');

  const rangeDates = useMemo(() => getRangeDates(range), [range]);
  const searchPlaceholder = logsTab === 'call' ? 'Search by number' : 'Search by session';

  const filteredCalls = useMemo(() => {
    return CALL_LOGS.filter((call) => {
      const matchesSearch =
        !search ||
        call.number.toLowerCase().includes(search.toLowerCase()) ||
        call.summary.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && isInRange(call.date, range);
    });
  }, [range, search]);

  const filteredChats = useMemo(() => {
    return CHAT_LOGS.filter((chat) => {
      const matchesSearch =
        !search ||
        chat.session.toLowerCase().includes(search.toLowerCase()) ||
        chat.agent.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && isInRange(chat.date, range);
    });
  }, [range, search]);

  const activeCount = logsTab === 'call' ? filteredCalls.length : filteredChats.length;

  const clearFilters = () => {
    setRange('last7');
    setSearch('');
  };

  return (
    <div className="reports-ref-shell animate-fade-up">
      <p className="reports-ref-intro">Call and chat history — recordings, transcripts, and AI summaries per record.</p>

      <div className="reports-ref-layout">
        <div className="reports-ref-main-column">
          <section className="reports-ref-main-card">
            <div className="reports-ref-main-head">
              <div className="reports-ref-title-row">
                <h3>{logsTab === 'call' ? 'Call Logs' : 'Chat Logs'}</h3>
                <span>{activeCount}</span>
              </div>

              <div className="reports-ref-toolbar">
                <div className="reports-ref-search">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                  />
                </div>

                <button type="button" className="reports-ref-tool-btn">
                  <Download size={13} /> Export
                </button>
                <button type="button" className="reports-ref-tool-btn">
                  <ListRestart size={13} /> Refresh
                </button>
              </div>
            </div>

            <div className="reports-ref-chip-row">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={range === option.id ? 'is-active' : ''}
                  onClick={() => setRange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="reports-ref-date-grid">
              <label>
                <span>From date</span>
                <input readOnly value={rangeDates.from ? formatShortDate(rangeDates.from) : ''} />
              </label>
              <label>
                <span>To date</span>
                <input readOnly value={rangeDates.to ? formatShortDate(rangeDates.to) : ''} />
              </label>
            </div>

            <div className="reports-ref-filter-meta">
              <span>
                {activeCount} of {logsTab === 'call' ? CALL_LOGS.length : CHAT_LOGS.length} {logsTab === 'call' ? 'calls' : 'chats'}
              </span>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          </section>

          {logsTab === 'call' ? (
            <>
              <div className="reports-ref-subtabs">
                <button
                  type="button"
                  className={subTab === 'recording' ? 'is-active' : ''}
                  onClick={() => setSubTab('recording')}
                >
                  Recording
                </button>
                <button
                  type="button"
                  className={subTab === 'transcript' ? 'is-active' : ''}
                  onClick={() => setSubTab('transcript')}
                >
                  Transcript
                </button>

                <p>Listen back to any recorded call.</p>
              </div>

              {filteredCalls.length ? (
                <div className="reports-ref-call-list">
                  {filteredCalls.map((call) => (
                    <article key={call.id} className="reports-ref-call-row">
                      <div className="reports-ref-call-robot">
                        <div className="reports-ref-robot-badge">
                          <Bot size={16} />
                        </div>
                        <div>
                          <strong>{call.number}</strong>
                          <span>{formatDateTime(call.date)}</span>
                        </div>
                      </div>

                      <div className="reports-ref-call-tags">
                        <span className="reports-ref-agent-pill">
                          <Bot size={11} />
                          My Agent
                        </span>
                        <span className="reports-ref-availability-pill">
                          {subTab === 'recording' ? 'Recording available' : 'Transcript available'}
                        </span>
                      </div>

                      <div className="reports-ref-call-side">
                        <span>{formatSeconds(call.duration)}</span>
                        <button type="button">hangup</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="reports-ref-empty-card">No calls match the current filter.</div>
              )}
            </>
          ) : (
            <div className="reports-ref-chat-list">
              {filteredChats.map((chat) => (
                <article key={chat.id} className="reports-ref-chat-row">
                  <div className="reports-ref-chat-left">
                    <div className="reports-ref-robot-badge is-chat">
                      <Bot size={16} />
                    </div>
                    <div>
                      <strong>{formatDateTime(chat.date)}</strong>
                      <span>{chat.session}</span>
                    </div>
                  </div>

                  <div className="reports-ref-chat-tags">
                    <span className="reports-ref-agent-pill">
                      <Bot size={11} />
                      {chat.agent}
                    </span>
                    <span className="reports-ref-availability-pill">Transcript available</span>
                  </div>

                  <div className="reports-ref-call-side">
                    <span>{formatSeconds(chat.duration)}</span>
                    <button type="button">{chat.outcome}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="reports-ref-sidebar">
          <div className="reports-ref-switcher">
            <button
              type="button"
              className={logsTab === 'call' ? 'is-active' : ''}
              onClick={() => setLogsTab('call')}
            >
              <Phone size={14} /> Call Logs
            </button>
            <button
              type="button"
              className={logsTab === 'chat' ? 'is-active' : ''}
              onClick={() => setLogsTab('chat')}
            >
              <MessageSquare size={14} /> Chat Logs
            </button>
          </div>

          <div className="reports-ref-info-card">
            <div className="reports-ref-info-head">
              <ShieldQuestion size={15} />
              <strong>Logs overview</strong>
            </div>
            <p>
              A complete record of every conversation your agents handled. Each entry keeps the full transcript,
              AI summary, the call recording, exact timestamps, duration, and the reason the session ended.
              Use the filters and search to find a specific call or chat, expand any row to read what was said,
              and export the results to CSV.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
