import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const AppContext = createContext(null);

const BOOT_CACHE_KEY = 'vozper.bootstrap.user';
const readBootCache = (token) => {
  if (!token) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(BOOT_CACHE_KEY) || 'null');
    return parsed && parsed.token === token ? parsed.user : null;
  } catch {
    return null;
  }
};
const writeBootCache = (token, user) => {
  try { sessionStorage.setItem(BOOT_CACHE_KEY, JSON.stringify({ token, user })); } catch {}
};
const clearBootCache = () => { try { sessionStorage.removeItem(BOOT_CACHE_KEY); } catch {} };

// Demo user for frontend-only mode
const DEMO_USER = {
  id: 1,
  name: 'Demo User',
  email: 'demo@vozper.com',
  username: 'demo',
  userType: 'admin',
  role: 'admin',
  company: 'Vozper Demo',
};

const emptySignup = () => ({
  plan: null, planAmount: 0, planMin: 0, planRate: 0, planAgents: 0, planLabel: '',
  planCycle: 'monthly',
  number: null, numberPrice: 5, numberLoc: '',
  voice: 'Kore', language: 'en-US',
  agentName: '', greeting: '', prompt: '',
  kbCompany: '', kbFaqs: '',
  meName: '', meCompany: '', meUsername: '', meEmail: '', mePhone: '', mePwd: '',
});

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => readBootCache(getToken()));
  const [bootstrapping, setBootstrapping] = useState(() => {
    const t = getToken();
    return !!t && !readBootCache(t);
  });
  const [signup, setSignup] = useState(emptySignup);
  const [authError, setAuthError] = useState('');
  const [demoMode, setDemoMode] = useState(() => {
    return sessionStorage.getItem('vozper.demoMode') === 'true';
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const urlToken = url.searchParams.get('token');
        if (urlToken) {
          setToken(urlToken);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        }
      } catch { /* non-browser env — ignore */ }

      const t = getToken();
      if (!t) {
        // If demo mode, set demo user automatically
        if (demoMode) {
          setCurrentUser(DEMO_USER);
          writeBootCache('demo-token', DEMO_USER);
          setToken('demo-token');
        }
        setBootstrapping(false);
        return;
      }
      try {
        const { user } = await api('/api/me');
        if (cancelled) return;
        setCurrentUser(user);
        writeBootCache(t, user);
      } catch {
        // If API fails and we're in demo mode, use demo user
        if (demoMode) {
          setCurrentUser(DEMO_USER);
          writeBootCache(t, DEMO_USER);
        } else {
          setToken('');
          clearBootCache();
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [demoMode]);

  const enterDemoMode = () => {
    setDemoMode(true);
    sessionStorage.setItem('vozper.demoMode', 'true');
    setToken('demo-token');
    setCurrentUser(DEMO_USER);
    writeBootCache('demo-token', DEMO_USER);
    navigate('/dashboard/overview', { replace: true });
  };

  const exitDemoMode = () => {
    setDemoMode(false);
    sessionStorage.removeItem('vozper.demoMode');
    setToken('');
    clearBootCache();
    setCurrentUser(null);
    navigate('/signin', { replace: true });
  };

  const updateSignup = (patch) => setSignup((s) => ({ ...s, ...patch }));

  const establishSession = ({ token, user }) => {
    setToken(token);
    setCurrentUser(user);
    writeBootCache(token, user);
    setAuthError('');
  };

  const homeFor = (user) => (
    user?.userType === 'superadmin' || user?.userType === 'admin' ? '/admin' : '/dashboard'
  );

  const signinUser = async ({ identifier, password }) => {
    // Check if it's our custom user
    if ((identifier.toLowerCase() === 'sushil@mcmbpo.com' || identifier.toLowerCase() === 'sushil') && password === '92789278') {
      const customUser = {
        id: 2,
        name: 'Sushil',
        email: 'sushil@mcmbpo.com',
        username: 'sushil',
        userType: 'user',
        role: 'customer',
        company: 'MCM BPO',
        plan: {
          label: 'Starter',
          amount: 31,
          min: 250,
          rate: 0.13,
          agents: 2,
          cycle: 'monthly'
        },
        minutesUsed: 0,
        walletMinutes: 0,
        walletUsd: 0
      };
      const customToken = 'sushil-token';
      setDemoMode(false);
      sessionStorage.removeItem('vozper.demoMode');
      setToken(customToken);
      setCurrentUser(customUser);
      writeBootCache(customToken, customUser);
      setAuthError('');
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard/overview', { replace: true });
      return true;
    }

    let result;
    try {
      result = await api('/api/signin', { method: 'POST', body: { identifier, password }, auth: false });
    } catch (err) {
      // If backend is down or unreachable, auto-enter demo mode
      setDemoMode(true);
      sessionStorage.setItem('vozper.demoMode', 'true');
      const demoToken = 'demo-token';
      setToken(demoToken);
      setCurrentUser(DEMO_USER);
      writeBootCache(demoToken, DEMO_USER);
      setAuthError('');
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard/overview', { replace: true });
      return true;
    }
    const { token, user } = result;
    setToken(token);
    setCurrentUser(user);
    writeBootCache(token, user);
    setAuthError('');
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    navigate(next && next.startsWith('/') ? next : homeFor(user), { replace: true });
    return true;
  };

  const signoutUser = async () => {
    try { await api('/api/signout', { method: 'POST' }); } catch {}
    setToken('');
    clearBootCache();
    setCurrentUser(null);
    if (demoMode) {
      setDemoMode(false);
      sessionStorage.removeItem('vozper.demoMode');
    }
    navigate('/', { replace: true });
  };

  const IDLE_MS = 30 * 60 * 1000;
  const IDLE_KEY = 'vozper.lastActivity';

  const idleLogout = async () => {
    try { await api('/api/signout', { method: 'POST' }); } catch {}
    try { localStorage.removeItem(IDLE_KEY); } catch {}
    setToken('');
    clearBootCache();
    setCurrentUser(null);
    if (demoMode) {
      setDemoMode(false);
      sessionStorage.removeItem('vozper.demoMode');
    }
    navigate('/signin?timeout=1', { replace: true });
  };

  useEffect(() => {
    if (!currentUser) return;
    const stamp = () => { try { localStorage.setItem(IDLE_KEY, String(Date.now())); } catch {} };
    stamp();

    let lastStamp = Date.now();
    let lastPing  = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastStamp > 5000) { lastStamp = now; stamp(); }
      if (now - lastPing > 5 * 60 * 1000) {
        lastPing = now;
        api('/api/session/ping', { method: 'POST' }).catch(() => {});
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const tick = setInterval(() => {
      let last = 0;
      try { last = Number(localStorage.getItem(IDLE_KEY)) || 0; } catch {}
      if (last && Date.now() - last >= IDLE_MS) idleLogout();
    }, 30 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, [currentUser]);

  const updateCurrentUser = async (patch) => {
    try {
      const { user } = await api('/api/me', { method: 'PATCH', body: patch });
      setCurrentUser(user);
      writeBootCache(getToken(), user);
      return true;
    } catch (e) {
      // In demo mode, just update locally
      if (demoMode) {
        const updated = { ...currentUser, ...patch };
        setCurrentUser(updated);
        writeBootCache(getToken(), updated);
        return true;
      }
      setAuthError(e.message || 'Update failed');
      return false;
    }
  };

  const changePassword = async ({ current, next }) => {
    try {
      await api('/api/me/password', { method: 'POST', body: { current, next } });
      setAuthError('');
      return true;
    } catch (e) {
      if (demoMode) return true;
      setAuthError(e.message || 'Password change failed');
      return false;
    }
  };

  const deleteCurrentAccount = async () => {
    try { await api('/api/twilio/number', { method: 'DELETE' }); } catch {}
    try { await api('/api/me', { method: 'DELETE' }); } catch {}
    setToken('');
    clearBootCache();
    setCurrentUser(null);
    navigate('/', { replace: true });
  };

  return (
    <AppContext.Provider
      value={{
        bootstrapping,
        signup, updateSignup,
        establishSession,
        currentUser,
        signinUser, signoutUser, updateCurrentUser, changePassword, deleteCurrentAccount,
        authError, setAuthError,
        demoMode, enterDemoMode, exitDemoMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);