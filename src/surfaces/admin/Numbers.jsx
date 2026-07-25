import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';
import { readCache, writeCache } from '../../utils/swrCache.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const EXPORT_COLUMNS = ['DID', 'Status', 'Owner', 'Source', 'Locality', 'Added Date'];

const toExportRow = (n) => [
  n.value,
  n.status === 'busy' ? 'Busy' : 'Free',
  n.owner ? (n.owner.label || n.owner.email) : '—',
  n.source === 'env' ? 'ENV' : 'DB',
  [n.locality, n.region].filter(Boolean).join(' · ') || '—',
  n.addedAt ? fmtDate(n.addedAt) : '—',
];

const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const buildCsv = (rows) => {
  const lines = rows.map((r) => r.map(csvEscape).join(','));
  return [EXPORT_COLUMNS.map(csvEscape).join(','), ...lines].join('\n');
};

// No xlsx dependency in this project — Excel opens an HTML table saved with
// a .xls extension just fine, and it's the only way to keep the bold/green
// header formatting without pulling in a binary-format library for one button.
const buildExcelHtml = (rows) => {
  const headerCells = EXPORT_COLUMNS.map((c) => `<th style="background:#4d7c0f;color:#fff;font-weight:bold;padding:6px 10px;border:1px solid #365a0a;text-align:left;">${c}</th>`).join('');
  const bodyRows = rows.map((r) => `<tr>${r.map((v) => `<td style="padding:6px 10px;border:1px solid #d1d5db;">${String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>` +
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>` +
    `</body></html>`;
};

const dateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Shown only when the real inventory comes back genuinely empty — same
// "never overrides real data" rule as the other admin pages' demo
// fallbacks.
const DEMO_NUMBERS = [
  { value: '+14155550142', status: 'busy', source: 'db', owner: { label: 'Northwind Traders', email: 'priya@northwind.example' }, locality: 'San Francisco', region: 'CA', addedAt: daysAgo(40), addedBy: 'admin' },
  { value: '+12125550198', status: 'busy', source: 'db', owner: { label: 'Bluepeak Studio', email: 'owen@bluepeak.example' }, locality: 'New York', region: 'NY', addedAt: daysAgo(28), addedBy: 'admin' },
  { value: '+16465550110', status: 'busy', source: 'env', owner: { label: 'Larkspur Dental', email: 'maria@larkspur.example' }, locality: 'New York', region: 'NY', addedAt: daysAgo(90), addedBy: 'system' },
  { value: '+13125550177', status: 'free', source: 'db', owner: null, locality: 'Chicago', region: 'IL', addedAt: daysAgo(12), addedBy: 'admin' },
  { value: '+13055550163', status: 'free', source: 'db', owner: null, locality: 'Miami', region: 'FL', addedAt: daysAgo(6), addedBy: 'admin' },
  { value: '+18005550100', status: 'free', source: 'env', owner: null, locality: 'Toll-free', region: null, addedAt: daysAgo(120), addedBy: 'system' },
];

// =============================================================================
// Numbers inventory — superadmin's view of every DID in the pool. Shows
// busy vs. free, which customer holds each busy DID, and lets the admin
// register new DIDs.
// =============================================================================
export default function Numbers() {
  const { currentUser } = useApp();
  const [data, setData] = useState(() => readCache('admin.numbers', currentUser?.id) ?? null);
  const [err, setErr]   = useState('');
  const [filter, setFilter] = useState('all');     // 'all' | 'busy' | 'free'
  const [search, setSearch] = useState('');

  // Add-number form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', locality: '', region: '' });
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [okMsg, setOkMsg]     = useState('');

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const exportRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async () => {
    setErr('');
    try {
      const r = await api('/api/admin/numbers');
      setData(r);
      writeCache('admin.numbers', currentUser?.id, r);
    } catch (e) {
      setErr(e.message);
      setData((prev) => prev ?? { numbers: [], totals: { total: 0, busy: 0, free: 0 } });
    }
  };
  useEffect(() => { load(); }, []);

  const realNumbers = data?.numbers || [];
  // Falls back to demo DIDs only when the real inventory comes back
  // genuinely empty — never overrides real data.
  const usingDemo = data !== null && realNumbers.length === 0;
  const numbers = usingDemo ? DEMO_NUMBERS : realNumbers;
  const totals = usingDemo
    ? { total: DEMO_NUMBERS.length, busy: DEMO_NUMBERS.filter((n) => n.status === 'busy').length, free: DEMO_NUMBERS.filter((n) => n.status === 'free').length }
    : (data?.totals || { total: 0, busy: 0, free: 0 });

  // Memoized so toggling a row checkbox, typing in the add-number form, or
  // opening the export menu — none of which affect the result — doesn't
  // re-filter the whole inventory on every render.
  const filtered = useMemo(() => numbers.filter((n) => {
    if (filter !== 'all' && n.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.value.toLowerCase().includes(q)
        && !(n.owner?.email || '').toLowerCase().includes(q)
        && !(n.owner?.label || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [numbers, filter, search]);

  const runExport = (kind) => {
    setExportOpen(false);
    const rows = filtered;
    if (!rows.length) return;
    setExporting(true);
    setTimeout(() => {
      const exportRows = rows.map(toExportRow);
      if (kind === 'csv') {
        triggerDownload(new Blob([buildCsv(exportRows)], { type: 'text/csv;charset=utf-8;' }), `numbers-inventory-${dateStamp()}.csv`);
      } else {
        triggerDownload(new Blob([buildExcelHtml(exportRows)], { type: 'application/vnd.ms-excel' }), `numbers-inventory-${dateStamp()}.xls`);
      }
      setExporting(false);
      setToast(`Exported ${rows.length} DID${rows.length === 1 ? '' : 's'} to ${kind === 'csv' ? 'CSV' : 'Excel'}`);
    }, 400);
  };

  const addNumber = async (e) => {
    e.preventDefault();
    setFormErr(''); setOkMsg(''); setBusy(true);
    try {
      await api('/api/admin/numbers', { method: 'POST', body: form });
      setOkMsg(`✓ ${form.number} added to inventory`);
      setForm({ number: '', locality: '', region: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeNumber = async (n) => {
    if (usingDemo) return; // demo rows aren't real inventory — nothing to remove
    if (n.source === 'env') {
      alert('Env-managed DIDs cannot be removed from the UI — pull them out of MANUAL_NUMBERS in .env and restart.');
      return;
    }
    if (!confirm(`Remove ${n.value} from the inventory? Only possible if no customer currently holds it.`)) return;
    try {
      await api(`/api/admin/numbers/${encodeURIComponent(n.value)}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(`Could not remove: ${e.message}`);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-mute text-sm mt-1">
            Every DID available to the platform — assigned (busy) or unassigned (free).
            Add new DIDs as you receive them from the carrier.
          </p>
          {usingDemo && <span className="overview-demo-pill">Demo data</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div ref={exportRef} className="relative inline-block">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting || !filtered.length}
              className="btn-teal text-sm whitespace-nowrap inline-flex items-center gap-1.5 transition duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
            >
              {exporting
                ? <>Exporting…</>
                : <><Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" /></>
              }
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 p-1.5 animate-modal-in">
                <div className="px-2.5 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-mute font-semibold">
                  All {filtered.length} filtered
                </div>
                <button
                  type="button"
                  onClick={() => runExport('csv')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-[var(--foreground)] hover:bg-lime-500/10 hover:text-lime-400 transition-colors duration-150"
                >
                  <FileText className="w-4 h-4" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => runExport('excel')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-[var(--foreground)] hover:bg-lime-500/10 hover:text-lime-400 transition-colors duration-150"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setFormErr(''); }}
            className="btn-teal text-sm whitespace-nowrap"
          >
            {showForm ? '× Cancel' : '+ Add DID'}
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {err}
        </div>
      )}
      {okMsg && (
        <div className="mt-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
          {okMsg}
        </div>
      )}

      {/* === Add DID form ============================================ */}
      {showForm && (
        <form onSubmit={addNumber} className="mt-6 form-card grid sm:grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
          <div>
            <label className="field-label">DID (E.164)</label>
            <input
              required
              className="input text-sm font-mono"
              placeholder="+918037683049"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Locality</label>
            <input className="input text-sm" placeholder="Bangalore" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Region</label>
            <input className="input text-sm" placeholder="Karnataka" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <button
              type="submit"
              disabled={busy}
              className="w-full btn-teal text-sm"
            >
              {busy ? 'Adding…' : 'Add to inventory'}
            </button>
          </div>
          {formErr && (
            <div className="sm:col-span-4 text-xs text-red-400">⚠ {formErr}</div>
          )}
        </form>
      )}

      {/* === KPI cards ============================================== */}
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        <div
          className={`form-card cursor-pointer transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg ${filter === 'all' ? 'ring-2 ring-[var(--primary)]' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Total DIDs</div>
          <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">{totals.total}</div>
        </div>
        <div
          className={`form-card cursor-pointer transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg ${filter === 'busy' ? 'ring-2 ring-[var(--primary)]' : ''}`}
          onClick={() => setFilter('busy')}
        >
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Busy (assigned)</div>
          <div className="mt-1 text-2xl font-bold text-amber-400">{totals.busy}</div>
        </div>
        <div
          className={`form-card cursor-pointer transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg ${filter === 'free' ? 'ring-2 ring-[var(--primary)]' : ''}`}
          onClick={() => setFilter('free')}
        >
          <div className="text-xs text-mute uppercase tracking-wider font-semibold">Free (available)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">{totals.free}</div>
        </div>
      </div>

      {/* === Search ================================================= */}
      <div className="mt-4 relative max-w-md">
        <input
          type="search"
          className="input pl-9 text-sm"
          placeholder="Filter by DID or owner email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none">🔍</span>
      </div>

      {/* === Inventory table ======================================== */}
      <div className="mt-4 form-card p-0 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>DID</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Source</th>
              <th>Locality</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={7} className="text-center text-mute py-6">Loading…</td></tr>
            )}
            {data && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-mute py-6">No DIDs match the current filter.</td></tr>
            )}
            {filtered.map((n) => (
              <tr key={n.value}>
                <td className="font-mono text-sm text-[var(--foreground)]">{n.value}</td>
                <td>
                  {n.status === 'busy'
                    ? <span className="pill bg-amber-500/15 text-amber-400 inline-block cursor-default transition duration-150 ease-out hover:scale-110 hover:shadow-[0_0_10px_rgba(251,191,36,0.4)]">● Busy</span>
                    : <span className="pill bg-emerald-500/15 text-emerald-400 inline-block cursor-default transition duration-150 ease-out hover:scale-110 hover:shadow-[0_0_10px_rgba(52,211,153,0.4)]">○ Free</span>
                  }
                </td>
                <td>
                  {n.owner
                    ? <>
                        <div className="text-xs font-medium text-[var(--foreground)]">{n.owner.label || n.owner.email}</div>
                        <div className="text-[11px] text-mute">{n.owner.email}</div>
                      </>
                    : <span className="text-mute text-xs">—</span>
                  }
                </td>
                <td>
                  <span className={`pill text-[10px] uppercase tracking-wider inline-block cursor-default transition duration-150 ease-out hover:scale-110 ${
                    n.source === 'env'
                      ? 'bg-slate-500/15 text-[var(--body)] hover:shadow-[0_0_10px_rgba(148,163,184,0.35)]'
                      : 'bg-lime-500/15 text-lime-400 hover:shadow-[0_0_10px_rgba(163,230,53,0.4)]'
                  }`}>
                    {n.source === 'env' ? 'ENV' : 'DB'}
                  </span>
                </td>
                <td className="text-xs text-mute">
                  {[n.locality, n.region].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="text-xs text-mute">
                  {n.addedAt ? <>{fmtDate(n.addedAt)}<br /><span className="text-[10px]">by {n.addedBy || '—'}</span></> : '—'}
                </td>
                <td>
                  {n.source === 'db' && n.status === 'free' && !usingDemo && (
                    <button className="btn-red text-xs" onClick={() => removeNumber(n)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
          <div className="flex items-center gap-2 bg-[var(--popover)] border border-lime-500/30 shadow-xl rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)]">
            <span className="text-lime-400">✓</span> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
