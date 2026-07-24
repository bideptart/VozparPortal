import { useMemo, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const atDaysAgo = (daysAgo, hour = 12, minute = 0) =>
  new Date(now.getTime() - daysAgo * DAY + hour * 60 * 60 * 1000 + minute * 60 * 1000).toISOString();

const CALLS = [
  { id: 'c1', direction: 'inbound', from: '+1 817 349 6752', to: 'TKOS', duration: 148, sentiment: 'positive', status: 'answered', date: atDaysAgo(0, 9, 15) },
  { id: 'c2', direction: 'outbound', from: 'TKOS', to: '+1 469 240 8812', duration: 92, sentiment: 'neutral', status: 'answered', date: atDaysAgo(1, 11, 20) },
  { id: 'c3', direction: 'inbound', from: '+1 817 555 1028', to: 'TKOS', duration: 0, sentiment: 'negative', status: 'failed', date: atDaysAgo(1, 13, 10) },
  { id: 'c4', direction: 'inbound', from: '+1 214 555 6601', to: 'TKOS', duration: 206, sentiment: 'positive', status: 'answered', date: atDaysAgo(2, 10, 5) },
  { id: 'c5', direction: 'outbound', from: 'TKOS', to: '+1 972 555 9042', duration: 135, sentiment: 'neutral', status: 'answered', date: atDaysAgo(3, 14, 35) },
  { id: 'c6', direction: 'inbound', from: '+1 682 555 7711', to: 'TKOS', duration: 84, sentiment: 'positive', status: 'answered', date: atDaysAgo(4, 16, 0) },
  { id: 'c7', direction: 'inbound', from: '+1 817 555 1277', to: 'TKOS', duration: 0, sentiment: 'negative', status: 'no-answer', date: atDaysAgo(4, 18, 20) },
  { id: 'c8', direction: 'outbound', from: 'TKOS', to: '+1 254 555 4116', duration: 167, sentiment: 'positive', status: 'answered', date: atDaysAgo(5, 9, 45) },
  { id: 'c9', direction: 'inbound', from: '+1 430 555 2651', to: 'TKOS', duration: 56, sentiment: 'neutral', status: 'answered', date: atDaysAgo(6, 15, 5) },
  { id: 'c10', direction: 'inbound', from: '+1 817 555 8088', to: 'TKOS', duration: 198, sentiment: 'positive', status: 'answered', date: atDaysAgo(7, 8, 55) },
  { id: 'c11', direction: 'outbound', from: 'TKOS', to: '+1 325 555 1900', duration: 119, sentiment: 'neutral', status: 'answered', date: atDaysAgo(8, 12, 40) },
  { id: 'c12', direction: 'inbound', from: '+1 903 555 5207', to: 'TKOS', duration: 63, sentiment: 'negative', status: 'answered', date: atDaysAgo(9, 10, 10) },
  { id: 'c13', direction: 'inbound', from: '+1 214 555 6044', to: 'TKOS', duration: 142, sentiment: 'positive', status: 'answered', date: atDaysAgo(10, 17, 25) },
  { id: 'c14', direction: 'outbound', from: 'TKOS', to: '+1 737 555 8831', duration: 0, sentiment: 'neutral', status: 'no-answer', date: atDaysAgo(11, 13, 50) },
  { id: 'c15', direction: 'inbound', from: '+1 817 555 3382', to: 'TKOS', duration: 74, sentiment: 'positive', status: 'answered', date: atDaysAgo(12, 11, 15) },
  { id: 'c16', direction: 'outbound', from: 'TKOS', to: '+1 512 555 7719', duration: 126, sentiment: 'negative', status: 'answered', date: atDaysAgo(13, 16, 45) },
  { id: 'c17', direction: 'inbound', from: '+1 817 555 4400', to: 'TKOS', duration: 0, sentiment: 'failed', status: 'failed', date: atDaysAgo(18, 10, 35) },
  { id: 'c18', direction: 'outbound', from: 'TKOS', to: '+1 469 555 0021', duration: 156, sentiment: 'positive', status: 'answered', date: atDaysAgo(22, 15, 10) },
];

const directionOptions = [
  { id: 'all', label: 'All types' },
  { id: 'inbound', label: 'Inbound' },
  { id: 'outbound', label: 'Outbound' },
];

const rangeOptions = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'all', label: 'All time' },
];

const sentimentLabel = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  failed: 'Negative',
};

const formatMinutes = (seconds) => (seconds / 60).toFixed(seconds >= 600 ? 0 : 1);
const formatDuration = (seconds) => `${Math.round(seconds || 0)}s`;
const formatTime = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
  });

function matchesRange(dateString, range) {
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

function getRangeLabel(range) {
  return rangeOptions.find((option) => option.id === range)?.label ?? 'All time';
}

export default function Analytics() {
  const [directionFilter, setDirectionFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('last7');

  const filteredCalls = useMemo(() => {
    return CALLS.filter((call) => {
      const matchesDirection = directionFilter === 'all' || call.direction === directionFilter;
      return matchesDirection && matchesRange(call.date, rangeFilter);
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [directionFilter, rangeFilter]);

  const stats = useMemo(() => {
    const total = filteredCalls.length;
    const answered = filteredCalls.filter((call) => call.status === 'answered').length;
    const failed = filteredCalls.filter((call) => call.status !== 'answered').length;
    const totalSeconds = filteredCalls.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = total ? totalSeconds / total : 0;
    const positive = filteredCalls.filter((call) => call.sentiment === 'positive').length;
    const neutral = filteredCalls.filter((call) => call.sentiment === 'neutral').length;
    const negative = filteredCalls.filter((call) => ['negative', 'failed'].includes(call.sentiment)).length;
    const answerRate = total ? Math.round((answered / total) * 100) : 0;

    return { total, answered, failed, answerRate, totalSeconds, avgDuration, positive, neutral, negative };
  }, [filteredCalls]);

  const sentimentSegments = useMemo(() => {
    const total = Math.max(filteredCalls.length, 1);
    return [
      {
        id: 'positive',
        label: 'Positive',
        count: stats.positive,
        percent: (stats.positive / total) * 100,
        tone: 'is-positive',
      },
      {
        id: 'neutral',
        label: 'Neutral',
        count: stats.neutral,
        percent: (stats.neutral / total) * 100,
        tone: 'is-neutral',
      },
      {
        id: 'negative',
        label: 'Negative',
        count: stats.negative,
        percent: (stats.negative / total) * 100,
        tone: 'is-negative',
      },
    ];
  }, [filteredCalls.length, stats.negative, stats.neutral, stats.positive]);

  const volumeBars = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - index));
      return {
        key: date.toISOString(),
        label: dayLabel(date.toISOString()),
        inbound: 0,
        outbound: 0,
        total: 0,
      };
    });

    filteredCalls.forEach((call) => {
      const label = dayLabel(call.date);
      const bucket = days.find((day) => day.label === label);
      if (!bucket) return;
      bucket[call.direction] += 1;
      bucket.total += 1;
    });

    return days;
  }, [filteredCalls]);

  const maxBar = Math.max(...volumeBars.map((bar) => bar.total), 1);
  const failedCalls = filteredCalls.filter((call) => call.status !== 'answered');

  const statCards = [
    { label: 'Total calls', value: stats.total, tone: 'default' },
    { label: 'Answered', value: stats.answered, tone: 'good' },
    { label: 'Failed / no-answer', value: stats.failed, tone: 'bad' },
    { label: 'Answer rate', value: `${stats.answerRate}%`, tone: 'good' },
    { label: 'Total minutes', value: formatMinutes(stats.totalSeconds), tone: 'default' },
    { label: 'Avg duration', value: formatDuration(stats.avgDuration), tone: 'default' },
  ];

  return (
    <div className="analytics-ref-shell animate-fade-up">
      <p className="analytics-ref-intro">Your call history and activity across all your numbers.</p>

      <div className="analytics-ref-toolbar">
        <div className="analytics-ref-segmented">
          {directionOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={directionFilter === option.id ? 'is-active' : ''}
              onClick={() => setDirectionFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="analytics-ref-segmented analytics-ref-range-group">
          {rangeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={rangeFilter === option.id ? 'is-active' : ''}
              onClick={() => setRangeFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-ref-stats">
        {statCards.map((card) => (
          <div key={card.label} className={`analytics-ref-stat-card ${card.tone !== 'default' ? `is-${card.tone}` : ''}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <p className="analytics-ref-note">
        Showing <strong>{getRangeLabel(rangeFilter)}</strong> · answer rate is over completed calls
      </p>

      <section className="analytics-ref-panel">
        <div className="analytics-ref-panel-head">
          <div>
            <h3>Caller sentiment</h3>
            <p>How callers felt across {filteredCalls.length} classified calls.</p>
          </div>
          <div className="analytics-ref-sentiment-score">
            <strong>{Math.round(sentimentSegments[0].percent)}%</strong>
            <span>Positive</span>
          </div>
        </div>

        <div className="analytics-ref-legend">
          {sentimentSegments.map((segment) => (
            <div key={segment.id} className={`analytics-ref-legend-item ${segment.tone}`}>
              <span className="analytics-ref-dot" />
              {segment.label} ({segment.count ? `${Math.round(segment.percent)}%` : '0%'})
            </div>
          ))}
        </div>

        <div className="analytics-ref-sentiment-bar" aria-label="Sentiment distribution">
          {sentimentSegments.map((segment) => (
            <div
              key={segment.id}
              className={`analytics-ref-sentiment-fill ${segment.tone}`}
              style={{ width: `${segment.percent}%` }}
            />
          ))}
        </div>
      </section>

      <section className="analytics-ref-panel analytics-ref-volume-panel">
        <div className="analytics-ref-panel-head analytics-ref-volume-head">
          <div>
            <h3>Call volume</h3>
          </div>
          <p>
            {volumeBars.reduce((sum, bar) => sum + bar.inbound, 0)} inbound · {volumeBars.reduce((sum, bar) => sum + bar.outbound, 0)} outbound
          </p>
        </div>

        <div className="analytics-ref-volume-chart" aria-label="Call volume chart">
          {volumeBars.map((bar) => (
            <button key={bar.key} type="button" className="analytics-ref-volume-col">
              <div className="analytics-ref-volume-bars">
                <div
                  className="analytics-ref-volume-bar is-inbound"
                  style={{ height: `${Math.max((bar.inbound / maxBar) * 100, bar.inbound ? 12 : 4)}%` }}
                  title={`${bar.inbound} inbound`}
                />
                <div
                  className="analytics-ref-volume-bar is-outbound"
                  style={{ height: `${Math.max((bar.outbound / maxBar) * 100, bar.outbound ? 12 : 4)}%` }}
                  title={`${bar.outbound} outbound`}
                />
              </div>
              <span>{bar.label}</span>
            </button>
          ))}
        </div>

        <p className="analytics-ref-panel-foot">Tip: click a bar to see that period&apos;s calls.</p>
      </section>

      <div className="analytics-ref-bottom-grid">
        <section className="analytics-ref-panel analytics-ref-table-panel">
          <div className="analytics-ref-table-head">
            <h3>Recent activity</h3>
          </div>

          <div className="analytics-ref-table-wrap">
            <table className="analytics-ref-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.length ? (
                  filteredCalls.slice(0, 8).map((call) => (
                    <tr key={call.id}>
                      <td>{formatTime(call.date)}</td>
                      <td>
                        <span className={`analytics-ref-type-chip is-${call.direction}`}>
                          {call.direction === 'inbound' ? <PhoneIncoming size={12} /> : <PhoneOutgoing size={12} />}
                          {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                        </span>
                      </td>
                      <td>{call.from}</td>
                      <td>{call.to}</td>
                      <td>{formatDuration(call.duration)}</td>
                      <td>
                        <span className={`analytics-ref-status-chip ${call.status === 'answered' ? 'is-good' : 'is-bad'}`}>
                          {call.status}
                        </span>
                      </td>
                      <td>
                        <span className={`analytics-ref-sentiment-chip is-${call.sentiment === 'failed' ? 'negative' : call.sentiment}`}>
                          {sentimentLabel[call.sentiment]}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="analytics-ref-empty">
                      No calls in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="analytics-ref-panel analytics-ref-failed-panel">
          <div className="analytics-ref-table-head">
            <h3>Failed / no-answer ({failedCalls.length})</h3>
          </div>

          {failedCalls.length ? (
            <div className="analytics-ref-failed-list">
              {failedCalls.map((call) => (
                <div key={call.id} className="analytics-ref-failed-item">
                  <div className="analytics-ref-failed-icon">
                    {call.direction === 'inbound' ? <PhoneIncoming size={14} /> : <Phone size={14} />}
                  </div>
                  <div>
                    <strong>{call.from}</strong>
                    <span>{formatTime(call.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="analytics-ref-failed-empty">No failed calls</div>
          )}
        </section>
      </div>
    </div>
  );
}
