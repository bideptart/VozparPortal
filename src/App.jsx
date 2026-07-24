import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import Signin from './surfaces/Signin.jsx';
import Terms from './surfaces/Terms.jsx';
import Privacy from './surfaces/Privacy.jsx';

const Customer = lazy(() => import('./surfaces/customer/Customer.jsx'));
const Admin = lazy(() => import('./surfaces/admin/Admin.jsx'));
const Reseller = lazy(() => import('./surfaces/reseller/Reseller.jsx'));

function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--body)] text-sm">Loading session…</p>
      </div>
    </main>
  );
}

const effectiveTier = (user) => {
  if (!user) return null;
  if (user.userType === 'superadmin' || user.userType === 'admin') return user.userType;
  if (user.role === 'admin') return 'admin';
  return user.userType || 'user';
};

const homeFor = (user) => {
  if (!user) return '/signin';
  const tier = effectiveTier(user);
  if (tier === 'superadmin' || tier === 'admin') return '/admin';
  if (tier === 'reseller' || tier === 'sub-reseller') return '/reseller';
  return '/dashboard';
};

const DEMO_USER = {
  id: 1,
  name: 'Demo User',
  email: 'demo@vozper.com',
  username: 'demo',
  userType: 'admin',
  role: 'admin',
  company: 'Vozper Demo',
};

function RequireAuth({ children, allow }) {
  const { currentUser, bootstrapping, demoMode } = useApp();
  const location = useLocation();
  if (bootstrapping) return <Loading />;
  const effectiveUser = currentUser || (demoMode ? DEMO_USER : null);
  if (!effectiveUser) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (allow && !allow.has(effectiveTier(effectiveUser))) {
    return <Navigate to={homeFor(effectiveUser)} replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { currentUser, bootstrapping, demoMode } = useApp();
  if (bootstrapping) return <Loading />;
  const effectiveUser = currentUser || (demoMode ? DEMO_USER : null);
  if (effectiveUser) return <Navigate to={homeFor(effectiveUser || { userType: 'admin' })} replace />;
  return children;
}

function AppRoutes() {
  const { bootstrapping } = useApp();
  if (bootstrapping) return <Loading />;
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<GuestOnly><Signin /></GuestOnly>} />
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/signup" element={<Navigate to="/signin" replace />} />
      <Route path="/signup/:step" element={<Navigate to="/signin" replace />} />
      <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
      <Route
        path="/dashboard/:tab"
        element={
          <RequireAuth allow={new Set(['user', 'superadmin', 'admin'])}>
            <Customer />
          </RequireAuth>
        }
      />
      <Route path="/reseller" element={<Navigate to="/reseller/customers" replace />} />
      <Route
        path="/reseller/:tab"
        element={
          <RequireAuth allow={new Set(['reseller', 'sub-reseller', 'superadmin', 'admin'])}>
            <Reseller />
          </RequireAuth>
        }
      />
      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route
        path="/admin/:tab"
        element={
          <RequireAuth allow={new Set(['superadmin', 'admin'])}>
            <Admin />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <Header />
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}