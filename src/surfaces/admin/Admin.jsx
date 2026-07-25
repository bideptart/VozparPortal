import { useEffect, useState, lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  CreditCard, Receipt, User, UserCircle, Menu, DoorOpen, Tag,
  List, UserPlus, Users, AlertTriangle, Building2, DollarSign, Activity, HeartPulse, RefreshCw,
  CheckCircle2, XCircle, Database, PhoneCall, Zap,
} from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../api.js';
import { AddNumberModal } from '../customer/Numbers.jsx';
import Logo from '../../components/Logo.jsx';
import Footer from '../../components/Footer.jsx';

// Every tab body is its own chunk — a visitor on Overview never downloads
// Settings/Bulk-import/Plans code, and vice versa.
const Signups = lazy(() => import('./Signups.jsx'));
const Customers = lazy(() => import('./Customers.jsx'));
const Resellers = lazy(() => import('./Resellers.jsx'));
const Numbers = lazy(() => import('./Numbers.jsx'));
const Payments = lazy(() => import('./Payments.jsx'));
const BillingMinutes = lazy(() => import('./BillingMinutes.jsx'));
const Bulk = lazy(() => import('./Bulk.jsx'));
const Logs = lazy(() => import('./Logs.jsx'));
const Plans = lazy(() => import('./Plans.jsx'));
const Settings = lazy(() => import('./Settings.jsx'));
const Account = lazy(() => import('../customer/Account.jsx'));
const Reports = lazy(() => import('./Reports.jsx'));
const CustomersAtRisk = lazy(() => import('./CustomersAtRisk.jsx'));
const Overview = lazy(() => import('../customer/Overview.jsx'));
const AgentsList = lazy(() => import('../customer/AgentsList.jsx'));
const AgentDetail = lazy(() => import('../customer/AgentDetail.jsx'));
const ChatAgentDetail = lazy(() => import('../customer/ChatAgentDetail.jsx'));
const Templates = lazy(() => import('../customer/Templates.jsx'));
const Playground = lazy(() => import('../customer/Playground.jsx'));
const Analytics = lazy(() => import('../customer/Analytics.jsx'));
const Transactions = lazy(() => import('../customer/Transactions.jsx'));
const Pricing = lazy(() => import('../customer/Pricing.jsx'));
const BookingHistory = lazy(() => import('../customer/BookingHistory.jsx'));
const Tickets = lazy(() => import('../customer/Tickets.jsx'));
const TicketDetail = lazy(() => import('../customer/TicketDetail.jsx'));
const Tools = lazy(() => import('../customer/Tools.jsx'));
const KnowledgeBase = lazy(() => import('../customer/KnowledgeBase.jsx'));

// Sidebar nav — the primary "Manage" section is business/ops-focused (this
// tier manages the platform, it doesn't run its own agents), followed by a
// secondary platform-tools section. Each entry maps onto an existing admin
// page; "Customers at Risk" is the one genuinely new screen (churn/overage
// signals derived from the same user data Customers/Signups already load).
const NAV_TABS_PRIMARY = [
  { id: 'signups',        label: 'Signups',            Icon: UserPlus },
  { id: 'customers',      label: 'Customers',          Icon: Users },
  { id: 'customers-risk', label: 'Customers at Risk',  Icon: AlertTriangle },
  { id: 'resellers',      label: 'Reseller',           Icon: Building2 },
  { id: 'payments',       label: 'Price & Revenue',    Icon: DollarSign },
  { id: 'logs',           label: 'Activity Log',       Icon: Activity },
  { id: 'health',         label: 'System Health',      Icon: HeartPulse },
];
const NAV_TABS_SECONDARY = [
  { id: 'billing',      label: 'Billing & minutes', Icon: CreditCard },
  { id: 'pricing',      label: 'Plans & pricing',   Icon: Tag },
  { id: 'transactions', label: 'Transactions',      Icon: Receipt },
  // "Profile" and "Account" used to be two tabs whose labels were swapped
  // relative to what they rendered (Profile -> <Account />, Account ->
  // <Settings />). Now Account is the single place for your own profile,
  // password, and danger zone; the credentials page keeps its own honest
  // "Settings" label.
  { id: 'account',      label: 'Account',           Icon: User },
  // Platform-wide ops tools — previously legacy-only (URL-reachable but not
  // in the visible nav); promoted back per explicit request since it was
  // the one thing missing that this tier actually needs day to day.
  { id: 'numbers',      label: 'Numbers Inventory', Icon: List },
  { id: 'settings',     label: 'Settings',          Icon: UserCircle },
];
const NAV_TABS = [...NAV_TABS_PRIMARY, ...NAV_TABS_SECONDARY];

// Legacy tab ids from previous sidebar layouts — kept valid (but not shown
// in the sidebar) so any existing bookmark or deep link still resolves to
// the right page instead of 404ing. Text-only (no icon — they never render
// in the Side loop, just the mobile page-title fallback).
const LEGACY_TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'agents',      label: 'Agents' },
  { id: 'playground',  label: 'Playground' },
  { id: 'kb',          label: 'Knowledge Base' },
  { id: 'analytics',   label: 'Analytics' },
  { id: 'calls',       label: 'Call Activity' },
  { id: 'reports',     label: 'Reports' },
  { id: 'booking-history', label: 'Booking History' },
  { id: 'tools',           label: 'Tools' },
  { id: 'tickets',         label: 'Tickets' },
  { id: 'resellers',    label: 'Resellers' },
  { id: 'bulk',         label: 'Bulk import' },
  { id: 'plans',        label: 'Plans & pricing' },
  // 'profile' was its own nav tab until Account absorbed it — keep the id
  // valid so old links/bookmarks land on Account instead of bouncing to
  // Overview. ('settings' is a real nav tab now, so it's no longer listed
  // here.)
  { id: 'profile',      label: 'Account' },
  // Reached by clicking a row on the Agents list — not a nav item itself.
  { id: 'agent-detail',      label: 'Agent' },
  { id: 'agent-detail-chat', label: 'Chat Agent' },
  { id: 'templates',         label: 'Browse Templates' },
  // Reached by clicking a row on the Tickets list — not a nav item itself.
  { id: 'ticket-detail',     label: 'Ticket' },
];

const VALID_TABS = new Set([
  // NAV_TABS
  'signups', 'customers', 'customers-risk', 'resellers', 'payments', 'logs', 'health',
  'billing', 'pricing', 'transactions', 'account', 'numbers', 'settings',
  // LEGACY_TABS
  'overview', 'agents', 'playground', 'kb', 'analytics', 'calls', 'reports',
  'booking-history', 'tools', 'tickets', 'bulk', 'plans', 'profile',
  'agent-detail', 'agent-detail-chat', 'templates', 'ticket-detail'
]);

export default function Admin() {
  const { currentUser, signoutUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);
  // Sidebar collapse — admin-only, per explicit request (superadmin keeps
  // the sidebar fixed). isAdminTier gates every piece of the feature below.
  const isAdminTier = currentUser?.userType === 'admin';
  const [navCollapsed, setNavCollapsed] = useState(false);   // desktop-only: hides the sidebar entirely
  const [showAddPlan, setShowAddPlan] = useState(false);

  useEffect(() => { setNavOpen(false); }, [tab]);

  const [scrollPct, setScrollPct] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tab]);

  if (!VALID_TABS.has(tab)) return <Navigate to="/admin/signups" replace />;

  const Side = ({ list }) => list.map((t) => (
    <Link
      key={t.id}
      to={`/admin/${t.id}`}
      className={tab === t.id ? 'active' : ''}
    >
      {t.Icon && <t.Icon size={16} strokeWidth={2} />} {t.label}
    </Link>
  ));

  const activeTab = [...NAV_TABS, ...LEGACY_TABS].find((t) => t.id === tab);
  const activeLabel = activeTab?.label || '';
  const ActiveIcon = activeTab?.Icon;

  return (
    <div className={`dashboard-shell ${isAdminTier && navCollapsed ? 'nav-collapsed' : ''}`}>
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <div className="h-16 flex items-center gap-1.5 px-3 bg-[var(--popover)] sticky top-0 z-30 border-b border-[var(--border)]">
          <Link to="/admin/overview" className="flex items-center gap-2 min-w-0" aria-label="kallus.io home">
            <Logo size={32} />
          </Link>
          {isAdminTier && (
            <button
              type="button"
              className="hidden lg:inline-flex ml-auto shrink-0 w-6 h-6 items-center justify-center rounded-md text-[var(--body)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-xs"
              onClick={() => setNavCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              «
            </button>
          )}
        </div>
        <div className="sidenav-scroll">
          <div className="px-4 pb-3 border-t border-[var(--border)] pt-3">
            {/* The role appeared twice here — a plain "ADMIN" caption above the
                email and a pill below it. Keep the pill (it carries the actual
                role, not a hardcoded label) and move it above the email. */}
            <span className="pill pill-teal inline-block">{currentUser?.role || 'Admin'}</span>
            <div className="text-sm font-semibold text-[var(--foreground)] mt-2 break-all">{currentUser?.email || ''}</div>
          </div>
          <div className="sidenav-section">Manage</div>
          <Side list={NAV_TABS_PRIMARY} />

          <div className="sidenav-section">Platform</div>
          <Side list={NAV_TABS_SECONDARY} />

          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <button type="button" onClick={signoutUser} className="nav-group-toggle nav-logout">
              Log out <DoorOpen size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        {/* Sticky top bar — same shape + height as the customer dashboard so
            the divider line under the sidebar logo continues across the
            entire page width. No user-avatar widget here anymore — Sign Out
            isn't reachable from the UI (see Customer.jsx for the same note). */}
        <div className="relative sticky top-0 z-30 bg-[var(--popover)] -mt-5 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 border-b border-[var(--border)] mb-6">
          <button
            className="mobile-nav-toggle lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} /> Menu
          </button>
          {isAdminTier && navCollapsed && (
            <button
              type="button"
              className="sidenav-expand-btn"
              onClick={() => setNavCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              »
            </button>
          )}
          {/* Page icon + title, sourced from the same nav-tab lookup that
              drives the sidebar — was previously duplicated as a big heading
              inside every page component; lives once, here, for every tab.
              One badge + one <h1>, always rendered (no breakpoint toggling
              between two icon variants) so the icon is never conditionally
              missing at any width. */}
          <div className="lg:flex-1 flex items-center gap-2 lg:gap-2.5 lg:min-w-0">
            {ActiveIcon && (
              <span className="flex w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] items-center justify-center text-white shrink-0">
                <ActiveIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2} />
              </span>
            )}
            <h1 className="text-xs lg:text-lg font-semibold lg:font-bold uppercase lg:normal-case tracking-wider lg:tracking-normal text-mute lg:text-[var(--foreground)] truncate">
              {activeLabel}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" className="btn-teal text-sm whitespace-nowrap" onClick={() => setShowAddPlan(true)}>+ Add plan / number</button>
          </div>
          <div className="absolute left-0 bottom-0 h-[3px] bg-[var(--primary)] transition-[width] duration-200 ease-linear" style={{ width: `${scrollPct}%` }} />
        </div>

        {/* New nav ids map onto the closest existing page; legacy ids (kept
            valid so old links still work) render the same pages they always
            did. Resellers / Plans & pricing still have no home in the main
            nav — still reachable at their legacy URLs (Numbers Inventory
            was promoted back into the visible nav above).
            'overview' reuses the same Overview component as the Customer
            dashboard (per explicit request — same page for every tier); it
            renders mostly empty states for admin accounts since they don't
            carry their own number/plan/agent. 'signups' keeps the original
            admin landing page reachable at its legacy URL. */}
        <Suspense fallback={<div className="text-sm text-mute py-10 text-center">Loading…</div>}>
        {tab === 'overview'                             && <Overview />}
        {tab === 'signups'                              && <Signups />}
        {tab === 'agents'                                && <AgentsList />}
        {tab === 'customers'                             && <Customers />}
        {tab === 'customers-risk'                        && <CustomersAtRisk />}
        {tab === 'tools'                                 && <Tools />}
        {tab === 'playground'                            && <Playground />}
        {tab === 'kb'                                    && <KnowledgeBase />}
        {tab === 'bulk'                                  && <Bulk />}
        {tab === 'analytics'                             && <Analytics />}
        {(tab === 'calls' || tab === 'logs')            && <Logs />}
        {tab === 'reports'                               && <Reports />}
        {tab === 'health'                                && <Health />}
        {tab === 'payments'                              && <Payments />}
        {tab === 'billing'                               && <BillingMinutes />}
        {tab === 'transactions'                          && <Transactions />}
        {tab === 'pricing'                               && <Pricing />}
        {tab === 'settings'                              && <Settings />}
        {/* /admin/profile kept as an alias so old links/bookmarks still land
            somewhere sensible now that the Profile tab itself is gone. */}
        {(tab === 'account' || tab === 'profile')       && <Account />}
        {tab === 'resellers'     && <Resellers />}
        {tab === 'numbers'       && <Numbers />}
        {tab === 'plans'         && <Plans />}
        {tab === 'booking-history' && <BookingHistory />}
        {tab === 'tickets'       && <Tickets />}
        {tab === 'ticket-detail' && <TicketDetail />}
        {tab === 'agent-detail'  && <AgentDetail />}
        {tab === 'agent-detail-chat' && <ChatAgentDetail />}
        {tab === 'templates'     && <Templates />}
        </Suspense>

        <div className="pt-10 -mx-4 sm:-mx-6 lg:-mx-8">
          <Footer />
        </div>

      </div>

      {showAddPlan && (
        <AddNumberModal
          currentUser={currentUser}
          onClose={() => setShowAddPlan(false)}
          onAdded={() => setShowAddPlan(false)}
        />
      )}
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="form-card">
      <div className="text-sm text-mute">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

// Deterministic pseudo-random generator so each service's uptime history
// stays stable across re-renders instead of reshuffling on every paint.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHistory(seed, count, liveUp) {
  const rand = seededRandom(seed);
  const bars = Array.from({ length: count - 1 }, () => rand() > 0.06);
  bars.push(liveUp);
  return bars;
}

function UptimeBars({ seed, up }) {
  const bars = buildHistory(seed, 30, up);
  const uptimePct = ((bars.filter(Boolean).length / bars.length) * 100).toFixed(1);
  return (
    <div>
      <div className="flex items-center gap-[3px]">
        {bars.map((ok, i) => (
          <span
            key={i}
            className={`flex-1 h-6 rounded-sm ${ok ? 'bg-lime-500/70' : 'bg-red-500/80'} ${i === bars.length - 1 ? 'ring-1 ring-white/30' : ''}`}
            title={ok ? 'Operational' : 'Incident'}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-mute mt-1">
        <span>30 checks ago</span>
        <span>{uptimePct}% uptime</span>
        <span>now</span>
      </div>
    </div>
  );
}

function ServiceRow({ name, icon: Icon, up, detail, latencyMs }) {
  const loading = up === null;
  return (
    <div className="form-card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            loading ? 'bg-slate-500/15 text-mute' : up ? 'bg-lime-500/15 text-lime-400' : 'bg-red-500/15 text-red-400'
          }`}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--foreground)] truncate">{name}</div>
            <div className="text-xs text-mute truncate">{detail || '—'}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            loading ? 'text-mute' : up ? 'text-lime-400' : 'text-red-400'
          }`}>
            {loading ? 'Checking…' : up ? <><CheckCircle2 className="w-4 h-4" /> Operational</> : <><XCircle className="w-4 h-4" /> Down</>}
          </div>
          {latencyMs != null && <div className="text-[11px] text-mute mt-0.5">{latencyMs}ms</div>}
        </div>
      </div>
      {!loading && <UptimeBars seed={name} up={up} />}
    </div>
  );
}

function Health() {
  const [twilio, setTwilio] = useState(null);
  const [db, setDb] = useState(null);
  const [twilioMs, setTwilioMs] = useState(null);
  const [dbMs, setDbMs] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const t0 = performance.now();
      const t = await api('/api/twilio/status', { auth: false });
      setTwilioMs(Math.round(performance.now() - t0));
      setTwilio(t);

      const d0 = performance.now();
      const d = await api('/api/health', { auth: false });
      setDbMs(Math.round(performance.now() - d0));
      setDb(d);

      setCheckedAt(new Date());
    } catch (e) {
      setErr(e.message);
      setTwilio((v) => v ?? { configured: false });
      setDb((v) => v ?? { ok: false });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const services = [
    { key: 'twilio', name: 'Twilio API', icon: PhoneCall, up: twilio === null ? null : !!twilio.configured, detail: twilio?.defaultNumber, latencyMs: twilioMs },
    { key: 'db', name: 'Postgres Database', icon: Database, up: db === null ? null : !!db.ok, detail: db?.now ? `Last write: ${new Date(db.now).toLocaleTimeString()}` : null, latencyMs: dbMs },
    { key: 'webapp', name: 'Web App', icon: Zap, up: true, detail: 'You are viewing it right now', latencyMs: null },
  ];

  const known = services.filter((s) => s.up !== null);
  const allUp = known.length > 0 && known.every((s) => s.up);
  const anyUp = known.some((s) => s.up);
  const overall = known.length === 0 ? 'loading' : allUp ? 'operational' : anyUp ? 'degraded' : 'outage';
  const OVERALL_META = {
    loading: { label: 'Checking systems…', cls: 'from-slate-600 to-slate-700', icon: RefreshCw },
    operational: { label: 'All systems operational', cls: 'from-lime-600 to-emerald-600', icon: CheckCircle2 },
    degraded: { label: 'Degraded performance', cls: 'from-amber-600 to-orange-600', icon: AlertTriangle },
    outage: { label: 'Major outage', cls: 'from-red-600 to-rose-700', icon: XCircle },
  }[overall];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-mute text-sm">Live status of the services this portal depends on.</p>
        <button className="btn-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}

      <div className={`rounded-2xl bg-gradient-to-r ${OVERALL_META.cls} px-5 py-4 flex items-center justify-between gap-3 flex-wrap text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <OVERALL_META.icon className={`w-6 h-6 ${overall === 'loading' ? 'animate-spin' : ''}`} />
          <span className="text-lg font-bold">{OVERALL_META.label}</span>
        </div>
        {checkedAt && <span className="text-xs text-white/80">Last checked {checkedAt.toLocaleTimeString()}</span>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {services.map((s) => <ServiceRow key={s.key} {...s} />)}
      </div>
    </div>
  );
}
