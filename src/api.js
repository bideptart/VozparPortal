const TOKEN_KEY = '9278.token';

// sessionStorage, not localStorage — the token must be per-TAB, not shared
// across every tab of the origin. With a shared key, signing into a
// different account in one tab silently overwrote the token every other
// open tab was using; that tab looked fine until its next reload, which
// then bootstrapped as whichever account now owned the (clobbered) token —
// e.g. an admin's tab reloading into a customer's account. Each tab now
// gets its own independent session; the trade-off is that closing a tab
// signs it out (no more "stay signed in" across a closed tab/browser
// restart) — a deliberate choice to make one tab's sign-in unable to ever
// silently take over another tab's.

// Base URL for the backend API. Empty in dev (the Vite proxy forwards /api to
// the local Express server) and on any host that runs the backend at the same
// origin. Set VITE_API_BASE to an absolute URL (e.g. https://api.example.com)
// when the frontend is deployed separately from the backend — as on Vercel,
// which serves only the static build and has no Node server.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
};

// Collapses concurrent identical GET requests into a single network call —
// covers React StrictMode's dev-only double-invoke and any two components
// that happen to request the same path in the same tick. Only GETs are safe
// to share (mutations must never be deduped), and the entry is cleared as
// soon as it settles, so it never masks a genuinely fresh request later.
const inflightGets = new Map();

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const isGet = method === 'GET';
  const key = isGet ? `${auth ? '1' : '0'}:${path}` : null;
  if (isGet && inflightGets.has(key)) return inflightGets.get(key);

  const request = (async () => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
    }
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      // Every admin/customer page fires its own authenticated fetches, and
      // most only locally catch-and-display — a 401 here means the session
      // itself is gone, so broadcast it once instead of leaving each call
      // site to surface (or silently drop) the same "signed out" state.
      // AppContext owns the actual sign-out/redirect.
      if (auth && res.status === 401) {
        window.dispatchEvent(new CustomEvent('vozper:session-expired'));
      }
      throw err;
    }
    return data;
  })();

  if (isGet) {
    inflightGets.set(key, request);
    request.finally(() => inflightGets.delete(key));
  }
  return request;
}
