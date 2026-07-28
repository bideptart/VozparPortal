import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CreditCard,
  Phone,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

const CALL_VOLUME = [
  { day: '12', value: 2 },
  { day: '13', value: 1 },
  { day: '14', value: 0 },
  { day: '15', value: 5 },
  { day: '16', value: 17 },
  { day: '17', value: 8 },
  { day: '18', value: 3 },
  { day: '19', value: 3 },
  { day: '20', value: 11 },
  { day: '21', value: 8 },
  { day: '22', value: 13 },
  { day: '23', value: 2 },
  { day: '24', value: 1 },
];

const DEFAULT_NUMBER = {
  id: 'line-1',
  value: '+1 617 349 6752',
  product: 'TKOS',
  autoRecharge: 'Off',
  expDate: 'Aug 20, 26',
  minLeft: 0,
  totalMin: 250,
  todayCalls: 0,
  monthCalls: 0,
  avgDuration: '0s',
};

function NumberUsageBar({ used, total }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
  return (
    <div className="overview-usage">
      <div className="overview-usage-track">
        <div className="overview-usage-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{used} / {total} min</span>
    </div>
  );
}

export default function Overview() {
  const { currentUser, demoMode } = useApp();
  const currentNumber =
    currentUser?.number?.value ||
    currentUser?.numberValue ||
    currentUser?.phone ||
    DEFAULT_NUMBER.value;

  const planLabel =
    currentUser?.plan_label ||
    currentUser?.planLabel ||
    currentUser?.company ||
    DEFAULT_NUMBER.product;

  const minutesUsed = DEFAULT_NUMBER.totalMin - DEFAULT_NUMBER.minLeft;
  const totalCalls = CALL_VOLUME.reduce((sum, item) => sum + item.value, 0);
  const highestDay = Math.max(...CALL_VOLUME.map((item) => item.value), 1);
  const sentimentPositive = 8;
  const sentimentNeutral = 78;
  const sentimentNegative = 9;
  const sentimentClassified = 94;

  return (
    <div className="overview-shell animate-fade-up">
      <section className="overview-intro">
        <div>
          <p className="overview-kicker">Dashboard overview</p>
          <h2>Your numbers, call activity, and quick actions at a glance.</h2>
        </div>
        {demoMode && <span className="overview-demo-pill">Demo data</span>}
      </section>

      <section className="overview-banner">
        <div className="overview-banner-copy">
          <div className="overview-banner-title">
            <AlertTriangle size={16} />
            <span>Low minutes - only 0.0 left</span>
          </div>
          <p>
            You&apos;re at or below your low-balance threshold (20.00 min). Top up now to keep your
            agents answering calls without interruption.
          </p>
        </div>
        <div className="overview-banner-actions">
          <Link to="/dashboard/billing" className="btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2">
            <Zap size={15} />
            Top up 83 min ($1,000)
          </Link>
          <Link to="/dashboard/billing" className="btn-ghost text-sm py-2.5 px-5 inline-flex items-center gap-2">
            <Wallet size={15} />
            Manage wallet
          </Link>
        </div>
      </section>

      <section className="overview-card">
        <div className="overview-card-head">
          <div>
            <p className="overview-label">Numbers</p>
            <h3>Usage by active number</h3>
          </div>
          <Link to="/dashboard/numbers" className="overview-inline-link">
            Manage numbers <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overview-table-wrap">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Product</th>
                <th>Auto-recharge</th>
                <th>Exp date</th>
                <th>Min left</th>
                <th>Today</th>
                <th>Month</th>
                <th>Avg duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="overview-table-number">{currentNumber}</td>
                <td>{planLabel}</td>
                <td><span className="overview-status-chip">{DEFAULT_NUMBER.autoRecharge}</span></td>
                <td>{DEFAULT_NUMBER.expDate}</td>
                <td><NumberUsageBar used={minutesUsed} total={DEFAULT_NUMBER.totalMin} /></td>
                <td>
                  <strong>{DEFAULT_NUMBER.todayCalls}</strong>
                  <small>calls</small>
                </td>
                <td>
                  <strong>{DEFAULT_NUMBER.monthCalls}</strong>
                  <small>calls</small>
                </td>
                <td>
                  <strong>{DEFAULT_NUMBER.avgDuration}</strong>
                </td>
              </tr>
              <tr className="overview-table-summary">
                <td colSpan="4">
                  Across all numbers
                  <small>{demoMode ? 'Demo usage snapshot' : 'Roll-up usage'}</small>
                </td>
                <td><NumberUsageBar used={minutesUsed} total={DEFAULT_NUMBER.totalMin} /></td>
                <td><strong>{DEFAULT_NUMBER.todayCalls}</strong></td>
                <td><strong>{DEFAULT_NUMBER.monthCalls}</strong></td>
                <td><strong>{DEFAULT_NUMBER.avgDuration}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-card">
        <div className="overview-card-head">
          <div>
            <h3>Call analytics</h3>
            <p>Last {sentimentClassified} calls · all numbers · mirrored to the overview dashboard.</p>
          </div>
          <Link to="/dashboard/analytics" className="overview-inline-link">
            View analytics <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overview-stats-grid">
          <div className="overview-stat">
            <span>Calls</span>
            <strong>{totalCalls}</strong>
          </div>
          <div className="overview-stat">
            <span>Answer rate</span>
            <strong>--</strong>
          </div>
          <div className="overview-stat">
            <span>Total minutes</span>
            <strong>--</strong>
          </div>
          <div className="overview-stat">
            <span>Avg duration</span>
            <strong>0s</strong>
          </div>
        </div>

        <div className="overview-sentiment-block">
          <div className="overview-sentiment-head">
            <span>Caller sentiment · last 30 days</span>
            <strong>8% positive</strong>
          </div>
          <div className="overview-sentiment-bar" aria-hidden="true">
            <div className="overview-sentiment-positive" style={{ width: `${(sentimentPositive / sentimentClassified) * 100}%` }} />
            <div className="overview-sentiment-neutral" style={{ width: `${(sentimentNeutral / sentimentClassified) * 100}%` }} />
            <div className="overview-sentiment-negative" style={{ width: `${(sentimentNegative / sentimentClassified) * 100}%` }} />
          </div>
          <p>
            {sentimentPositive} positive · {sentimentNeutral} neutral · {sentimentNegative} negative ·{' '}
            {sentimentClassified} classified
          </p>
        </div>

        <div className="overview-volume-block">
          <div className="overview-chart-head">Call volume · last 14 days</div>
          <div className="overview-bars" aria-label="Call volume chart">
            {CALL_VOLUME.map((item) => (
              <div key={item.day} className="overview-bar-group">
                <div
                  className="overview-bar"
                  style={{ height: `${Math.max(8, (item.value / highestDay) * 132)}px` }}
                  title={`${item.value} calls on day ${item.day}`}
                />
                <span>{item.day}</span>
              </div>
            ))}
          </div>
          <p>Based on your {sentimentClassified} most recent calls across all your numbers.</p>
        </div>
      </section>

      <section className="overview-card">
        <div className="overview-card-head">
          <div>
            <h3>Quick actions</h3>
            <p>Shortcuts for the tasks your operators use most often.</p>
          </div>
        </div>

        <div className="overview-actions-grid">
          <Link to="/dashboard/agents" className="overview-action-btn">
            <Bot size={16} />
            Edit agent
          </Link>
          <Link to="/dashboard/billing" className="overview-action-btn overview-action-btn-primary">
            <CreditCard size={16} />
            Buy more minutes
          </Link>
          <Link to="/dashboard/analytics" className="overview-action-btn overview-action-btn-wide">
            <TrendingUp size={16} />
            View analytics
          </Link>
        </div>

        <p className="overview-footnote">
          To test, dial <span>{currentNumber}</span> from your phone.
        </p>
      </section>
    </div>
  );
}
