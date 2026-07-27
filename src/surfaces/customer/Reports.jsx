import { useMemo, useState } from 'react';
import {
  Bot,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Frown,
  Meh,
  MessageSquare,
  Mic,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  RefreshCw,
  Search,
  Smile,
  Sparkles,
  X,
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
  {
    id: 'cl_1', number: '+1 (817) 349-6752', agent: 'Sales Agent', direction: 'inbound', status: 'completed',
    duration: 145, date: isoDaysAgo(1, 14, 12), sentiment: 'positive',
    summary: 'Customer asked about new pricing and setup timing. Confirmed Growth plan fits their call volume.',
    aiSummaryReady: true, recordingAvailable: true, transcriptAvailable: true,
    timeline: ['Call connected', 'Caller asked about pricing tiers', 'Agent explained Growth plan', 'Caller confirmed interest', 'Call ended — follow-up scheduled'],
  },
  {
    id: 'cl_2', number: '+1 (817) 555-1028', agent: 'Support Agent', direction: 'inbound', status: 'completed',
    duration: 56, date: isoDaysAgo(2, 10, 41), sentiment: 'neutral',
    summary: 'Caller wanted to confirm voicemail forwarding was active on their new number.',
    aiSummaryReady: true, recordingAvailable: true, transcriptAvailable: true,
    timeline: ['Call connected', 'Caller asked about voicemail forwarding', 'Agent confirmed settings', 'Call ended'],
  },
  {
    id: 'cl_3', number: '+1 (469) 555-8831', agent: 'Sales Agent', direction: 'outbound', status: 'completed',
    duration: 203, date: isoDaysAgo(4, 16, 3), sentiment: 'positive',
    summary: 'Outbound follow-up on onboarding progress. Customer is on track, no blockers reported.',
    aiSummaryReady: true, recordingAvailable: true, transcriptAvailable: true,
    timeline: ['Call placed', 'Reached customer', 'Reviewed onboarding checklist', 'No blockers found', 'Call ended'],
  },
  {
    id: 'cl_4', number: '+1 (214) 555-4471', agent: 'Support Agent', direction: 'inbound', status: 'missed',
    duration: 0, date: isoDaysAgo(3, 9, 20), sentiment: null,
    summary: '', aiSummaryReady: false, recordingAvailable: false, transcriptAvailable: false,
    timeline: ['Call attempted', 'No answer — missed'],
  },
  {
    id: 'cl_5', number: '+1 (972) 555-7790', agent: 'Sales Agent', direction: 'inbound', status: 'failed',
    duration: 0, date: isoDaysAgo(5, 11, 15), sentiment: null,
    summary: '', aiSummaryReady: false, recordingAvailable: false, transcriptAvailable: false,
    timeline: ['Call connected', 'Line dropped — call failed'],
  },
];

const CHAT_LOGS = [
  { id: 'ch_1', session: 'b58d01fa-f0e2-33f4-999c-11cfe5e4d553', duration: 5, date: isoDaysAgo(0, 14, 8), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_2', session: '95f46b1d-1e76-4071-b11a-1451f970d018', duration: 34, date: isoDaysAgo(0, 8, 42), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_3', session: 'e840eecc-776e-94ab-20f3-d3b1f5c77647', duration: 123, date: isoDaysAgo(1, 12, 41), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_4', session: '7cd19034-b63c-9f9c-f337-70c53e158c28', duration: 40, date: isoDaysAgo(1, 18, 25), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_5', session: 'd514ae49-3702-5244-44e4-14623f98214', duration: 10, date: isoDaysAgo(2, 9, 10), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_6', session: '34229031-4e02-37af-7b39-1fb82630a157', duration: 139, date: isoDaysAgo(2, 16, 9), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_7', session: '40176061-4082-4942-4020-110710172f1', duration: 69, date: isoDaysAgo(3, 15, 48), agent: 'My Agent', outcome: 'hangup' },
  { id: 'ch_8', session: 'a5df8f7b-feb9-c74c-a589-cdfd1c2a519c', duration: 59, date: isoDaysAgo(4, 14, 8), agent: 'My Agent', outcome: 'hangup' },
];

const STATUS_META = {
  completed: { label: 'Completed', dot: 'bg-emerald-400', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
  missed: { label: 'Missed', dot: 'bg-amber-400', className: 'border-amber-500/20 bg-amber-500/10 text-amber-200' },
  failed: { label: 'Failed', dot: 'bg-red-400', className: 'border-red-500/20 bg-red-500/10 text-red-300' },
};

const SENTIMENT_META = {
  positive: { label: 'Positive', icon: Smile, className: 'text-emerald-300' },
  neutral: { label: 'Neutral', icon: Meh, className: 'text-[var(--body)]' },
  negative: { label: 'Negative', icon: Frown, className: 'text-red-300' },
};

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

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--muted)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">{label}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
          <Icon size={14} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold leading-none text-[var(--foreground)]">{value}</div>
      {hint && <div className="mt-2 text-xs text-[var(--body)]">{hint}</div>}
    </div>
  );
}

function EmptyLogsState({ onViewAll, onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center">
      <div className="text-4xl">📞</div>
      <div className="mt-2 text-base font-semibold text-[var(--foreground)]">No call logs found</div>
      <p className="max-w-sm text-sm leading-6 text-[var(--body)]">
        Try adjusting your filters or place your first AI call to generate reports.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onViewAll} className="btn-primary text-sm">View All Calls</button>
        <button type="button" onClick={onClearFilters} className="btn-ghost text-sm">Clear Filters</button>
      </div>
    </div>
  );
}

function CallCard({ call, subTab, onSubTabChange }) {
  const [expanded, setExpanded] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const statusMeta = STATUS_META[call.status] || STATUS_META.completed;
  const DirectionIcon = call.direction === 'outbound' ? PhoneOutgoing : call.status === 'missed' ? PhoneMissed : PhoneIncoming;
  const sentimentMeta = call.sentiment ? SENTIMENT_META[call.sentiment] : null;
  const SentimentIcon = sentimentMeta?.icon;

  const openSection = (section) => {
    onSubTabChange(section);
    setExpanded(true);
  };

  const downloadTranscript = () => {
    const text = `Call with ${call.number}\n${formatDateTime(call.date)}\nAgent: ${call.agent}\nDuration: ${formatSeconds(call.duration)}\n\n${call.summary || 'No transcript available for this call.'}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-${call.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] transition-all duration-200 hover:border-[rgba(4,107,210,0.3)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
            <DirectionIcon size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{call.number}</span>
              <span className={`inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-medium ${statusMeta.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--body)]">
              <span className="inline-flex items-center gap-1"><Bot size={11} />{call.agent}</span>
              <span className="capitalize">{call.direction}</span>
              <span>{formatDateTime(call.date)}</span>
              {call.duration > 0 && <span className="inline-flex items-center gap-1"><Clock size={11} />{formatSeconds(call.duration)}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {call.aiSummaryReady && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[rgba(4,107,210,0.28)] bg-[var(--glow)] px-2.5 text-[11px] font-medium text-[var(--primary)]">
              <Sparkles size={11} /> AI Summary
            </span>
          )}
          {call.recordingAvailable && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 text-[11px] font-medium text-[var(--body)]">
              <Mic size={11} /> Recording
            </span>
          )}
          <ChevronDown size={16} className={`text-[var(--body)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && call.status === 'completed' && (
        <div className="border-t border-[var(--border)] p-4 pt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn-ghost text-xs inline-flex items-center gap-1.5 ${subTab === 'recording' ? '!bg-[var(--primary)] !text-white' : ''}`}
              onClick={() => openSection('recording')}
              disabled={!call.recordingAvailable}
            >
              <Play size={12} /> Play Recording
            </button>
            <button
              type="button"
              className={`btn-ghost text-xs inline-flex items-center gap-1.5 ${subTab === 'transcript' ? '!bg-[var(--primary)] !text-white' : ''}`}
              onClick={() => openSection('transcript')}
            >
              <FileText size={12} /> View Transcript
            </button>
            <button
              type="button"
              className={`btn-ghost text-xs inline-flex items-center gap-1.5 ${subTab === 'summary' ? '!bg-[var(--primary)] !text-white' : ''}`}
              onClick={() => openSection('summary')}
              disabled={!call.aiSummaryReady}
            >
              <Sparkles size={12} /> AI Summary
            </button>
            <button type="button" className="btn-ghost text-xs inline-flex items-center gap-1.5" onClick={downloadTranscript}>
              <Download size={12} /> {downloaded ? 'Downloaded' : 'Download'}
            </button>
          </div>

          {subTab === 'summary' && (
            call.aiSummaryReady ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">AI Summary</div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--foreground)]">{call.summary}</p>
                {sentimentMeta && (
                  <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${sentimentMeta.className}`}>
                    <SentimentIcon size={13} /> {sentimentMeta.label} sentiment
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3.5 text-sm text-[var(--body)]">
                No AI summary was generated for this call.
              </div>
            )
          )}

          {subTab === 'transcript' && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Transcript</div>
              <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{call.summary || 'Transcript not available for this call.'}</p>
              <p className="mt-2 text-[11px] text-[var(--body)]/70">Demo data — this account is not connected to a live call transcript source yet.</p>
            </div>
          )}

          {subTab === 'recording' && (
            call.recordingAvailable ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <Play size={13} />
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]">
                    <div className="h-full w-0 rounded-full bg-[var(--primary)]" />
                  </div>
                  <span className="text-xs text-[var(--body)]">{formatSeconds(call.duration)}</span>
                </div>
                <p className="mt-3 text-[11px] text-[var(--body)]/70">Demo data — no audio file is attached to this call yet, so playback isn't available in this environment.</p>
              </div>
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3.5 text-sm text-[var(--body)]">
                No recording is available for this call.
              </div>
            )
          )}

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">Call Timeline</div>
            <div className="mt-2 space-y-2">
              {call.timeline.map((event, index) => (
                <div key={index} className="flex items-center gap-2.5 text-xs text-[var(--body)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                  {event}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {expanded && call.status !== 'completed' && (
        <div className="border-t border-[var(--border)] p-4 text-sm text-[var(--body)]">
          {call.timeline.join(' → ')}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [logsTab, setLogsTab] = useState('call');
  const [range, setRange] = useState('last7');
  const [subTab, setSubTab] = useState('recording');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const rangeDates = useMemo(() => getRangeDates(range), [range]);
  const searchPlaceholder = logsTab === 'call' ? 'Search by number or summary' : 'Search by session or agent';

  const filteredCalls = useMemo(() => {
    const availabilityField = subTab === 'recording' ? 'recordingAvailable' : subTab === 'transcript' ? 'transcriptAvailable' : 'aiSummaryReady';
    return CALL_LOGS.filter((call) => {
      const matchesSearch =
        !search ||
        call.number.toLowerCase().includes(search.toLowerCase()) ||
        call.summary.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && isInRange(call.date, range) && call[availabilityField];
    });
  }, [range, search, subTab]);

  const filteredChats = useMemo(() => {
    return CHAT_LOGS.filter((chat) => {
      const matchesSearch =
        !search ||
        chat.session.toLowerCase().includes(search.toLowerCase()) ||
        chat.agent.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && isInRange(chat.date, range);
    });
  }, [range, search]);

  const activeRecords = logsTab === 'call' ? filteredCalls : filteredChats;
  const activeCount = activeRecords.length;
  const hasAnyRecords = (logsTab === 'call' ? CALL_LOGS : CHAT_LOGS).length > 0;

  const summary = useMemo(() => {
    const totalDuration = activeRecords.reduce((sum, item) => sum + item.duration, 0);
    const avgDuration = activeRecords.length ? Math.round(totalDuration / activeRecords.length) : 0;
    const aiSummaries = logsTab === 'call' ? filteredCalls.filter((c) => c.aiSummaryReady).length : filteredChats.length;
    return {
      totalCalls: activeCount,
      avgDuration,
      totalMinutes: Math.round(totalDuration / 60),
      aiSummaries,
    };
  }, [activeRecords, activeCount, logsTab, filteredCalls, filteredChats]);

  const clearFilters = () => {
    setRange('last7');
    setSearch('');
  };

  const viewAllCalls = () => {
    setRange('all');
    setSearch('');
  };

  const handleRefresh = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 600);
  };

  const exportCsv = () => {
    const rows = logsTab === 'call'
      ? [['number', 'agent', 'direction', 'status', 'duration', 'date'], ...filteredCalls.map((c) => [c.number, c.agent, c.direction, c.status, c.duration, formatDateTime(c.date)])]
      : [['session', 'agent', 'outcome', 'duration', 'date'], ...filteredChats.map((c) => [c.session, c.agent, c.outcome, c.duration, formatDateTime(c.date)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${logsTab}-logs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="space-y-4 animate-fade-up">
      <p className="text-sm text-[var(--body)] max-w-2xl">
        Call and chat history — recordings, transcripts, and AI summaries per record.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Phone} label={logsTab === 'call' ? 'Total Calls' : 'Total Chats'} value={summary.totalCalls} />
        <SummaryCard icon={Clock} label="Average Duration" value={formatSeconds(summary.avgDuration)} />
        <SummaryCard icon={Clock} label="Total Minutes" value={summary.totalMinutes} />
        <SummaryCard icon={Sparkles} label="AI Summaries Generated" value={summary.aiSummaries} />
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={() => setLogsTab('call')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
            logsTab === 'call' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'
          }`}
        >
          <Phone size={13} /> Call Logs
        </button>
        <button
          type="button"
          onClick={() => setLogsTab('chat')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
            logsTab === 'chat' ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'
          }`}
        >
          <MessageSquare size={13} /> Chat Logs
        </button>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input
              className="input h-10 rounded-[var(--radius-sm)] pl-10 text-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--body)] hover:text-[var(--foreground)]" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={exportCsv} className={toolbarButton}>
              <Download size={14} /> Export
            </button>
            <button type="button" onClick={handleRefresh} className={toolbarButton} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--border)]" />

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-200 ${
                range === option.id
                  ? 'bg-[var(--glow)] border-[var(--primary)] text-[var(--foreground)]'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--body)] hover:bg-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">From date</label>
            <input readOnly className="input h-10 rounded-[var(--radius-sm)] text-sm" value={rangeDates.from ? formatShortDate(rangeDates.from) : ''} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--body)] mb-1.5">To date</label>
            <input readOnly className="input h-10 rounded-[var(--radius-sm)] text-sm" value={rangeDates.to ? formatShortDate(rangeDates.to) : ''} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--body)]">
          <span>{activeCount} of {(logsTab === 'call' ? CALL_LOGS.length : CHAT_LOGS.length)} {logsTab === 'call' ? 'calls' : 'chats'}</span>
          <button type="button" onClick={clearFilters} className="font-semibold text-[var(--primary)] hover:underline">Clear filters</button>
        </div>
      </div>

      {logsTab === 'call' ? (
        <>
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
            {[
              { id: 'recording', label: 'Recording' },
              { id: 'transcript', label: 'Transcript' },
              { id: 'summary', label: 'AI Summary' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                  subTab === tab.id ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredCalls.length ? (
            <div className="space-y-3">
              {filteredCalls.map((call) => (
                <CallCard key={call.id} call={call} subTab={subTab} onSubTabChange={setSubTab} />
              ))}
            </div>
          ) : (
            <EmptyLogsState onViewAll={viewAllCalls} onClearFilters={clearFilters} />
          )}
        </>
      ) : (
        filteredChats.length ? (
          <div className="space-y-3">
            {filteredChats.map((chat) => (
              <div key={chat.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors duration-200 hover:border-[rgba(4,107,210,0.3)]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
                    <MessageSquare size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{formatDateTime(chat.date)}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-[var(--body)]">{chat.session}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-[var(--body)]">
                  <span className="inline-flex items-center gap-1"><Bot size={11} />{chat.agent}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={11} />{formatSeconds(chat.duration)}</span>
                  <span className="inline-flex h-6 items-center rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 font-medium">{chat.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyLogsState onViewAll={viewAllCalls} onClearFilters={clearFilters} />
        )
      )}
    </div>
  );
}
