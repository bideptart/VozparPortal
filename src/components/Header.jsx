import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext.jsx';
import Logo from './Logo.jsx';

export default function Header() {
  const { currentUser, signoutUser, demoMode, exitDemoMode } = useApp();
  const { pathname } = useLocation();
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reseller') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy')
  ) return null;
  const home = !currentUser
    ? '/'
    : currentUser.userType === 'reseller'
      ? '/reseller'
      : (currentUser.role === 'admin' || currentUser.userType === 'superadmin')
        ? '/admin'
        : '/dashboard';
  const initials = (currentUser?.name || currentUser?.email || '?')
    .split(/[\s@]/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  return (
    <header className="glass sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to={home} className="cursor-pointer flex items-center" aria-label="Home">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          {demoMode && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-[var(--accent)] bg-[var(--glow)] text-[var(--accent)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
              Demo Mode
            </div>
          )}
          {currentUser ? (
            <>
              <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #046BD2, #0086F9)',
                  }}
                >
                  {initials}
                </div>
                <div className="leading-tight text-right">
                  <div className="text-xs font-semibold text-[var(--foreground)]">{currentUser.name || currentUser.username}</div>
                  <div className="text-[10px] text-[var(--body)]">
                    {currentUser.role === 'admin' ? 'Admin' : (currentUser.company || 'Customer')}
                  </div>
                </div>
              </div>
              {demoMode ? (
                <button
                  onClick={exitDemoMode}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--body)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] shadow-sm"
                >
                  Exit Demo
                </button>
              ) : (
                <button
                  onClick={signoutUser}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--body)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] shadow-sm"
                >
                  Sign out
                </button>
              )}
            </>
          ) : (
            <>
              <Link to="/signin" className="nav-link">Sign in</Link>
              <Link to="/signup/plan" className="btn-primary text-sm py-2 px-4">
                Get started →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}