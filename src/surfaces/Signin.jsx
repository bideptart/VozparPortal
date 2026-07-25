import { useState } from 'react';
import { useApp } from '../AppContext.jsx';
import Logo from '../components/Logo.jsx';

export default function Signin() {
  const { signinUser, authError, setAuthError, enterDemoMode } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const timedOut = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('timeout') === '1';

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    await signinUser({ identifier, password });
    setBusy(false);
  };

  const handleDemo = () => {
    enterDemoMode();
  };

  return (
    <div className="auth-shell min-h-screen">
      {/* Left Panel — Brand */}
      <div className="auth-brand flex-col justify-between hidden lg:flex">
        <div>
          <Logo size={48} white showWordmark />
        </div>
        <div className="mt-auto text-center">
          <h2 className="text-3xl font-display font-semibold text-[var(--foreground)] mb-3">
            Welcome to Vozper
          </h2>
          <p className="text-[var(--body)] text-[15px] max-w-md mx-auto leading-relaxed">
            AI voice agents that answer every call. Pick a number, drop in your
            knowledge base, choose a voice, and go live in seconds.
          </p>
        </div>
        <div className="text-xs text-[var(--body)] opacity-60 mt-8 text-center">
          © {new Date().getFullYear()} Vozper. Powered by Rozper
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size={38} showWordmark={false} />
          </div>

          <div className="mb-7 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-[var(--foreground)]">
              Sign in to your{' '}
              <span className="italic text-[var(--primary)]">portal.</span>
            </h1>
            <p className="text-[var(--body)] mt-2 text-[15px]">
              Sign in to your dashboard.
            </p>
          </div>

          {timedOut && (
            <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
              ⏱ You were signed out after 30 minutes of inactivity. Please sign in again.
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="field-label">Email or username</label>
              <input
                className="input input-lg"
                placeholder="you@company.com"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); if (authError) setAuthError(''); }}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label !mb-0">Password</label>
              </div>
              <div className="relative">
                <input
                  className="input input-lg pr-12"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (authError) setAuthError(''); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--body)] hover:text-[var(--foreground)] px-2 py-1 rounded"
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {authError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <span className="text-red-400">⚠</span>
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3.5 text-[15px]" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[var(--popover)] text-[var(--body)]">or</span>
            </div>
          </div>

          <button
            onClick={handleDemo}
            className="btn-ghost w-full py-3 text-[15px] border-dashed"
          >
            🚀 Try Demo Mode
          </button>

          <p className="text-center text-xs text-[var(--body)] mt-8 opacity-60">
            🔒 Sessions expire after 30 minutes of inactivity
          </p>
        </div>
      </div>
    </div>
  );
}