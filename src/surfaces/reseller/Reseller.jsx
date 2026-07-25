import { useEffect, useState, lazy, Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Users, CreditCard, Star, Handshake, Menu, LogOut } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import Logo from '../../components/Logo.jsx';
import Footer from '../../components/Footer.jsx';

const Customers = lazy(() => import('./Customers.jsx'));
const Plans = lazy(() => import('./Plans.jsx'));
const Purchases = lazy(() => import('./Purchases.jsx'));
const SubResellers = lazy(() => import('./SubResellers.jsx'));

// `resellerOnly` tabs are visible only to top-level resellers. Sub-resellers
// manage customers, not further sub-resellers, so the Sub-resellers tab is
// hidden for them (and the backend rejects the create call as a backstop).
const ALL_TABS = [
  { id: 'customers',     label: 'My customers',  Icon: Users },
  { id: 'purchases',     label: 'Plan purchases', Icon: CreditCard },
  { id: 'plans',         label: 'My plans',       Icon: Star },
  { id: 'sub-resellers', label: 'Sub-resellers',  Icon: Handshake, resellerOnly: true },
];

// =============================================================================
// Reseller — top-level shell for reseller@portal accounts. Layout mirrors the
// Admin shell (sidebar + sticky top bar + footer at the bottom) so the
// dashboard reads as one product.
// =============================================================================
export default function Reseller() {
  const { currentUser, signoutUser } = useApp();
  const { tab } = useParams();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [tab]);

  if (!currentUser) return null;

  // Only top-level resellers see the Sub-resellers tab; sub-resellers don't.
  const isReseller = currentUser.userType === 'reseller';
  const TABS = ALL_TABS.filter((t) => !t.resellerOnly || isReseller);
  const VALID = new Set(TABS.map((t) => t.id));
  // A sub-reseller hitting /reseller/sub-resellers directly is bounced home.
  if (!VALID.has(tab)) return <Navigate to="/reseller/customers" replace />;

  const activeTab = TABS.find((t) => t.id === tab);
  const activeLabel = activeTab?.label;
  const ActiveIcon = activeTab?.Icon;

  return (
    <div className="dashboard-shell">
      {navOpen && <div className="mobile-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidenav ${navOpen ? 'is-open' : ''}`}>
        <Link
          to="/reseller/customers"
          className="h-16 flex items-center gap-2 px-4 bg-[var(--popover)] sticky top-0 z-30 border-b border-[var(--border)]"
          aria-label="kallus.io home"
        >
          <Logo size={44} showWordmark={false} />
        </Link>

        <div className="sidenav-scroll">
          <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-mute font-semibold">
              Reseller
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--foreground)] truncate">
              {currentUser.company || currentUser.name}
            </div>
            {currentUser.resellerPortal && (
              <div className="mt-0.5 text-[11px] font-mono text-lime-400 truncate">
                {currentUser.resellerPortal}
              </div>
            )}
          </div>

          <div className="sidenav-section mt-3">Workspace</div>
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={`/reseller/${t.id}`}
              className={tab === t.id ? 'active' : ''}
            >
              <t.Icon size={16} strokeWidth={2} /> {t.label}
            </Link>
          ))}

          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <button type="button" onClick={signoutUser} className="nav-group-toggle">
              <LogOut size={16} strokeWidth={2} /> Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="sticky top-0 z-30 bg-[var(--popover)] -mt-5 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 border-b border-[var(--border)] mb-6">
          <button
            className="mobile-nav-toggle lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} /> Menu
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {ActiveIcon && (
              <span className="flex w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-[var(--grad-start)] to-[var(--grad-end)] items-center justify-center text-white shrink-0">
                <ActiveIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" strokeWidth={2} />
              </span>
            )}
            <h1 className="text-xs lg:text-lg font-semibold lg:font-bold uppercase lg:normal-case tracking-wider lg:tracking-normal text-mute lg:text-[var(--foreground)] truncate">
              {activeLabel}
            </h1>
          </div>
        </div>

        <Suspense fallback={<div className="text-sm text-mute py-10 text-center">Loading…</div>}>
        {tab === 'customers'     && <Customers />}
        {tab === 'purchases'     && <Purchases />}
        {tab === 'plans'         && <Plans />}
        {tab === 'sub-resellers' && <SubResellers />}
        </Suspense>

        <div className="pt-10 -mx-4 sm:-mx-6 lg:-mx-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
