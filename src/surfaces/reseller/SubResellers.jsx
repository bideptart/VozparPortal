import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../../api.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real sub-reseller list comes back genuinely empty —
// same "never overrides real data" rule as the admin surface's demo
// fallbacks.
const DEMO_SUB_RESELLERS = [
  { id: 'demo-1', company: 'Acme Voice Partners', name: 'Jane Acme', email: 'ops@acme.example', username: 'acme', resellerPortal: 'acme-voice.io', phone: '+1 415 555 0100', customerCount: 6, kycLocation: 'Austin, US', createdAt: daysAgo(60), mrr: 93, walletBalance: 1250.75, verified: true },
  { id: 'demo-2', company: 'Northstar Comms',     name: 'Devon Lee', email: 'devon@northstar.example', username: 'northstar', resellerPortal: 'northstar.io', phone: '+1 646 555 0121', customerCount: 2, kycLocation: 'Toronto, CA', createdAt: daysAgo(12), mrr: 31, walletBalance: 180, verified: true },
];

const emptyForm = () => ({
  name: '', company: '', email: '', phone: '',
  username: '', password: '',
  resellerPortal: '',
  kycAddress: '', kycLocation: '',
});

function statusFor(r) {
  if (r.suspended) return { id: 'suspended', label: 'Suspended', dot: 'bg-red-400', className: 'border-red-500/25 bg-red-500/10 text-red-300' };
  if (Number(r.customerCount || 0) > 0) return { id: 'active', label: 'Active', dot: 'bg-emerald-400', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' };
  return { id: 'pending', label: 'Pending', dot: 'bg-amber-400', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
}

function initialsFor(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

function KpiCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--muted)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">{label}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glow)] text-[var(--primary)]">
          <Icon size={14} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold leading-none text-[var(--foreground)]">{value}</div>
      {hint && <div className="mt-2 text-xs text-[var(--body)]">{hint}</div>}
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input h-10 w-auto min-w-[132px] flex items-center justify-between gap-2 rounded-[var(--radius-sm)] text-sm"
      >
        <span className={selected?.value ? 'text-[var(--foreground)]' : 'text-[var(--body)]'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`text-[var(--body)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors duration-150 ${
                  value === opt.value ? 'bg-[var(--glow)] text-[var(--foreground)]' : 'text-[var(--body)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ subReseller, onViewDetails, onEdit, onSuspend, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  const MENU_HEIGHT = 5 * 32 + 8; // 5 items + vertical padding

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT && rect.top > MENU_HEIGHT;
      setPos(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      );
    }
    setOpen((v) => !v);
  };

  // The trigger sits inside a horizontally-scrolling table wrapper — an
  // absolutely-positioned menu gets clipped by that overflow, so this is
  // portaled to <body> with a fixed position instead. Close on scroll so a
  // stale position (from before the scroll) never lingers on screen.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const items = [
    { label: 'View Details', onClick: () => onViewDetails(subReseller) },
    { label: 'Manage Customers', onClick: () => onViewDetails(subReseller) },
    { label: 'Edit', onClick: () => onEdit(subReseller) },
    { label: subReseller.suspended ? 'Reactivate' : 'Suspend', onClick: () => onSuspend(subReseller), danger: !subReseller.suspended },
    { label: 'Delete', onClick: () => onDelete(subReseller), danger: true },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        aria-label={`Actions for ${subReseller.company || subReseller.name}`}
      >
        <MoreVertical size={15} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
            style={pos}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`block w-full px-3 py-2 text-left text-xs transition-colors duration-150 hover:bg-[var(--muted)] ${
                  item.danger ? 'text-red-300' : 'text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function DetailDrawer({ subReseller, onClose, onEdit, onSuspend }) {
  const navigate = useNavigate();
  if (typeof document === 'undefined' || !subReseller) return null;
  const status = statusFor(subReseller);
  const activity = [
    { label: 'Account created', at: subReseller.createdAt },
    ...(subReseller.customerCount > 0 ? [{ label: `Onboarded ${subReseller.customerCount} customer${subReseller.customerCount === 1 ? '' : 's'}`, at: subReseller.createdAt }] : []),
  ];

  const row = (label, value) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-xs text-[var(--body)]">{label}</span>
      <span className="text-sm font-medium text-[var(--foreground)] text-right">{value}</span>
    </div>
  );

  const quickAction = 'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white';

  const content = (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-in" />
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl animate-drawer-in"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-reseller-drawer-title"
      >
        <div className="shrink-0 border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-sm font-semibold text-[var(--primary)]">
                {initialsFor(subReseller.company || subReseller.name)}
              </span>
              <div className="min-w-0">
                <h2 id="sub-reseller-drawer-title" className="truncate text-lg font-semibold text-[var(--foreground)]">{subReseller.company || subReseller.name}</h2>
                <span className={`mt-1 inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium ${status.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Company Information</div>
          <div className="mt-1 divide-y divide-[var(--border)]">
            {row('Portal Slug', subReseller.resellerPortal || '—')}
            {row('Phone', subReseller.phone || '—')}
            {row('Email', subReseller.email || '—')}
            {row('Total Customers', subReseller.customerCount ?? 0)}
            {row('Monthly Revenue', fmtMoney(subReseller.mrr))}
            {row('Wallet Balance', fmtMoney(subReseller.walletBalance))}
            {row('Joined Date', fmtDate(subReseller.createdAt))}
            {row('KYC Status', subReseller.verified ? 'Verified' : 'Pending review')}
          </div>

          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Recent Activity</div>
          <div className="mt-2 space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5">
                <span className="text-xs text-[var(--foreground)]">{a.label}</span>
                <span className="text-[11px] text-[var(--body)]">{fmtDate(a.at)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)] mb-2">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={quickAction} onClick={() => navigate('/reseller/customers')}>
              <Users size={13} /> Manage Customers
            </button>
            <button type="button" className={quickAction} onClick={() => navigate('/reseller/purchases')}>
              <CreditCard size={13} /> View Purchases
            </button>
            <button type="button" className={quickAction} onClick={() => { onEdit(subReseller); onClose(); }}>Edit</button>
            <button
              type="button"
              className={`${quickAction} !text-red-300 hover:!bg-red-500/15 hover:!text-red-200 hover:!border-red-500/30`}
              onClick={() => onSuspend(subReseller)}
            >
              {subReseller.suspended ? 'Reactivate' : 'Suspend'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function SubResellerRow({ subReseller, onViewDetails, onEdit, onSuspend, onDelete }) {
  const status = statusFor(subReseller);
  return (
    <tr
      className="border-b border-[var(--border)] transition-colors duration-200 hover:bg-[var(--muted)] cursor-pointer"
      onClick={() => onViewDetails(subReseller)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-xs font-semibold text-[var(--primary)]">
            {initialsFor(subReseller.company || subReseller.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--foreground)]">{subReseller.company || subReseller.name}</div>
            <div className="truncate text-xs text-[var(--body)]">{subReseller.email}</div>
            {subReseller.verified && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                <CheckCircle2 size={11} /> Verified
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-sm">
        {subReseller.resellerPortal ? (
          <a
            href={`https://${subReseller.resellerPortal}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 font-mono text-[var(--primary)] hover:underline"
          >
            {subReseller.resellerPortal}
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-[var(--body)]">—</span>
        )}
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-xs text-[var(--body)]">
        {subReseller.phone ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono">
            <Phone size={11} className="shrink-0 text-[var(--body)]" />
            {subReseller.phone}
          </span>
        ) : '—'}
      </td>

      <td className="px-4 py-4">
        <div>
          <span className={subReseller.customerCount > 0 ? 'pill pill-primary' : 'pill bg-slate-500/15 text-[var(--body)]'}>
            {subReseller.customerCount ?? 0} {subReseller.customerCount === 1 ? 'Customer' : 'Customers'}
          </span>
          {subReseller.customerCount > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewDetails(subReseller); }}
              className="ml-2 text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              View All →
            </button>
          )}
        </div>
      </td>

      <td className="px-4 py-4 text-xs text-[var(--body)]">{subReseller.kycLocation || '—'}</td>

      <td className="px-4 py-4 whitespace-nowrap text-xs text-[var(--body)]">{fmtDate(subReseller.createdAt)}</td>

      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium ${status.className}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onViewDetails(subReseller)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]" aria-label="View details">
            <Eye size={15} />
          </button>
          <RowMenu subReseller={subReseller} onViewDetails={onViewDetails} onEdit={onEdit} onSuspend={onSuspend} onDelete={onDelete} />
        </div>
      </td>
    </tr>
  );
}

// =============================================================================
// SubResellers — reseller-only page to on-board sub-resellers. Same shape as
// the superadmin's Resellers page (register form + list), scoped to this
// reseller's tree. Sub-resellers can on-board their own customers under
// their own portal slug.
// =============================================================================
export default function SubResellers() {
  const [list, setList]       = useState(null);
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // sub-reseller id being edited, or null when creating
  const [form, setForm]       = useState(emptyForm);
  const [busy, setBusy]       = useState(false);
  const [formErr, setFormErr] = useState('');
  const [createdMsg, setCreatedMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await api('/api/reseller/sub-resellers');
      setList(r.subResellers || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo sub-resellers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_SUB_RESELLERS);

  const kycOptions = useMemo(() => {
    const locs = new Set();
    (effectiveList || []).forEach((r) => r.kycLocation && locs.add(r.kycLocation));
    return [{ value: 'all', label: 'All Locations' }, ...[...locs].map((l) => ({ value: l, label: l }))];
  }, [effectiveList]);

  const filtered = useMemo(() => {
    return (effectiveList || []).filter((r) => {
      if (search) {
        const haystack = [r.company, r.name, r.email, r.resellerPortal, r.phone].join(' ').toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      if (statusFilter !== 'all' && statusFor(r).id !== statusFilter) return false;
      if (kycFilter !== 'all' && r.kycLocation !== kycFilter) return false;
      return true;
    });
  }, [effectiveList, search, statusFilter, kycFilter]);

  const totalCustomers = useMemo(() => (effectiveList || []).reduce((a, r) => a + Number(r.customerCount || 0), 0), [effectiveList]);
  const totalMrr = useMemo(() => (effectiveList || []).reduce((a, r) => a + Number(r.mrr || 0), 0), [effectiveList]);
  const activeCount = useMemo(() => (effectiveList || []).filter((r) => statusFor(r).id === 'active').length, [effectiveList]);
  const activePct = effectiveList?.length ? Math.round((activeCount / effectiveList.length) * 100) : 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // The current list may still be the raw (possibly empty) API response —
  // seed it with the demo rows first so edits/suspends/deletes against a
  // demo row have something in state to actually update.
  const seededList = () => (list && list.length ? list : DEMO_SUB_RESELLERS);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormErr('');
    setShowForm(true);
  };

  const openEditForm = (subReseller) => {
    setEditingId(subReseller.id);
    setForm({
      name: subReseller.name || '',
      company: subReseller.company || '',
      email: subReseller.email || '',
      phone: subReseller.phone || '',
      username: subReseller.username || '',
      password: '',
      resellerPortal: subReseller.resellerPortal || '',
      kycAddress: subReseller.kycAddress || '',
      kycLocation: subReseller.kycLocation || '',
    });
    setFormErr('');
    setShowForm(true);
  };

  const toggleSuspend = (subReseller) => {
    setList((cur) => seededList().map((r) => (r.id === subReseller.id ? { ...r, suspended: !r.suspended } : r)));
    setCreatedMsg(`✓ ${subReseller.company || subReseller.name} ${subReseller.suspended ? 'reactivated' : 'suspended'}`);
  };

  const deleteSubReseller = (subReseller) => {
    if (!window.confirm(`Delete ${subReseller.company || subReseller.name}? This cannot be undone.`)) return;
    setList((cur) => seededList().filter((r) => r.id !== subReseller.id));
    setCreatedMsg(`✓ ${subReseller.company || subReseller.name} deleted`);
    if (selected?.id === subReseller.id) setSelected(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormErr(''); setBusy(true);

    // Editing has no backend PATCH endpoint yet — apply the change locally
    // so the row updates immediately instead of the button doing nothing.
    if (editingId) {
      setList((cur) => seededList().map((r) => (r.id === editingId ? { ...r, ...form } : r)));
      setCreatedMsg(`✓ ${form.company} updated (local only — not yet saved to the server)`);
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
      setBusy(false);
      return;
    }

    // Demo rows aren't a real account tree — add the row locally instead of
    // hitting a backend that isn't there.
    if (usingDemo) {
      const newRow = {
        id: `demo-${Date.now()}`, company: form.company, name: form.name, email: form.email,
        username: form.username, resellerPortal: form.resellerPortal, phone: form.phone,
        customerCount: 0, kycLocation: form.kycLocation, createdAt: new Date().toISOString(),
        mrr: 0, walletBalance: 0, verified: false,
      };
      setList((cur) => [...(cur && cur.length ? cur : DEMO_SUB_RESELLERS), newRow]);
      setCreatedMsg(`✓ Created ${form.email} (portal: ${form.resellerPortal}) (demo)`);
      setForm(emptyForm());
      setShowForm(false);
      setBusy(false);
      return;
    }
    try {
      const r = await api('/api/reseller/sub-resellers', { method: 'POST', body: form });
      setCreatedMsg(`✓ Created ${r.subReseller.email} (portal: ${r.subReseller.resellerPortal})`);
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (e) {
      setFormErr(e.message || 'Could not create sub-reseller');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['company', 'email', 'portal_slug', 'phone', 'customers', 'kyc_location', 'status', 'joined'],
      ...(effectiveList || []).map((r) => [r.company || r.name, r.email, r.resellerPortal || '', r.phone || '', r.customerCount ?? 0, r.kycLocation || '', statusFor(r).label, fmtDate(r.createdAt)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-resellers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Sub-resellers</h1>
          <p className="mt-1 text-sm text-[var(--body)]">
            On-board partners under your brand. Each sub-reseller gets their own
            portal slug and customer list — all rolled up to your downstream.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={exportCsv} className={toolbarButton}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" onClick={load} className={toolbarButton} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : openCreateForm())}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add Sub-reseller'}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-[var(--radius)] border border-red-500/25 bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <AlertTriangle size={16} />
            </span>
            <div className="flex-1 min-w-[200px]">
              <div className="text-sm font-semibold text-[var(--foreground)]">Session expired</div>
              <p className="mt-0.5 text-xs text-[var(--body)]">Reconnect your reseller account to continue managing sub-resellers.</p>
            </div>
            <button type="button" onClick={load} className="btn-primary text-sm shrink-0">Reconnect</button>
          </div>
        </div>
      )}
      {createdMsg && (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-[var(--radius)] px-3 py-2">
          {createdMsg}
        </div>
      )}

      {/* === Registration form (popup) ======================================= */}
      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-backdrop-in" />
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="form-card relative w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-modal-in"
          >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                {editingId ? 'Edit sub-reseller' : 'Register a new sub-reseller'}
              </div>
              <div className="mt-1 text-xs text-mute">
                {editingId
                  ? 'Update this partner\'s company and contact details.'
                  : 'All fields are required. The sub-reseller will be created under your account — every customer they on-board rolls up to your downstream.'}
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => setShowForm(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Company name *</label>
              <input className="input text-sm" required value={form.company} onChange={setField('company')} placeholder="Acme Voice Partners" />
            </div>
            <div>
              <label className="field-label">Authorised contact name *</label>
              <input className="input text-sm" required value={form.name} onChange={setField('name')} placeholder="Jane Acme" />
            </div>
            <div>
              <label className="field-label">Registered phone *</label>
              <input className="input text-sm" required value={form.phone} onChange={setField('phone')} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="field-label">Work email (login) *</label>
              <input type="email" className="input text-sm" required value={form.email} onChange={setField('email')} placeholder="ops@acme.com" />
            </div>
            {!editingId && (
              <>
                <div>
                  <label className="field-label">Username *</label>
                  <input className="input text-sm" required value={form.username} onChange={setField('username')} placeholder="acme" />
                </div>
                <div>
                  <label className="field-label">Password * (8+ chars)</label>
                  <input type="text" className="input text-sm font-mono" required value={form.password} onChange={setField('password')} placeholder="Auto-generate or paste" />
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary hover:underline"
                    onClick={() => {
                      const arr = new Uint8Array(12);
                      window.crypto.getRandomValues(arr);
                      const pwd = btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '').slice(0, 16);
                      setForm((f) => ({ ...f, password: pwd }));
                    }}
                  >
                    ⟳ Generate strong password
                  </button>
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="field-label">Portal slug *</label>
              <input
                className="input text-sm font-mono lowercase"
                required
                value={form.resellerPortal}
                onChange={(e) => setForm((f) => ({ ...f, resellerPortal: e.target.value.toLowerCase() }))}
                placeholder="acme-voice.io"
              />
              <div className="field-help">
                Sub-reseller's branded signup slug. Customers signing up there are
                auto-attributed to this sub-reseller and roll up to you. Must be
                unique platform-wide.
              </div>
            </div>
            <div>
              <label className="field-label">KYC address</label>
              <input className="input text-sm" value={form.kycAddress} onChange={setField('kycAddress')} placeholder="Registered office address" />
            </div>
            <div>
              <label className="field-label">KYC location / city</label>
              <input className="input text-sm" value={form.kycLocation} onChange={setField('kycLocation')} placeholder="Mumbai, IN" />
            </div>
          </div>

          {formErr && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              ⚠ {formErr}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary text-sm">
              {busy ? (editingId ? 'Saving…' : 'Registering…') : (editingId ? 'Save changes' : 'Register sub-reseller')}
            </button>
          </div>
          </form>
        </div>,
        document.body
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Total Sub-resellers" value={effectiveList === null ? '—' : effectiveList.length} hint={effectiveList?.length ? `${effectiveList.length} partners on your network` : undefined} />
        <KpiCard icon={Users} label="Total Customers" value={effectiveList === null ? '—' : totalCustomers} hint="Across all partners" />
        <KpiCard icon={CreditCard} label="Monthly Revenue" value={effectiveList === null ? '—' : fmtMoney(totalMrr)} hint="Combined MRR from partners" />
        <KpiCard icon={Clock} label="Active Sub-resellers" value={effectiveList === null ? '—' : activeCount} hint={effectiveList?.length ? `${activePct}% active` : undefined} />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input
              className="input h-10 rounded-[var(--radius-sm)] pl-10 text-sm"
              placeholder="Search by reseller name, email, portal slug or phone"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--body)] hover:text-[var(--foreground)]" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }]}
            placeholder="Status"
          />
          <CustomSelect value={kycFilter} onChange={(v) => { setKycFilter(v); setPage(1); }} options={kycOptions} placeholder="KYC Location" />
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Sub-reseller</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Portal Slug</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Phone</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Customers</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">KYC Location</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Joined</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {effectiveList === null && (
                <tr><td colSpan={8} className="px-6 py-14 text-center text-sm text-[var(--body)]">Loading…</td></tr>
              )}
              {effectiveList !== null && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--body)]">
                        <Users size={24} />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">No sub-resellers found</div>
                      <p className="max-w-sm text-xs text-[var(--body)]">Start growing your reseller network by inviting your first partner.</p>
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="btn-primary text-sm mt-1 inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Add Sub-reseller
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((r) => (
                <SubResellerRow
                  key={r.id}
                  subReseller={r}
                  onViewDetails={setSelected}
                  onEdit={openEditForm}
                  onSuspend={toggleSuspend}
                  onDelete={deleteSubReseller}
                />
              ))}
            </tbody>
          </table>
        </div>

        {effectiveList !== null && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-3.5 text-xs text-[var(--body)]">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <CustomSelect
                value={String(pageSize)}
                onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                options={[10, 25, 50].map((n) => ({ value: String(n), label: String(n) }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span>{(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" className="btn-ghost text-xs px-2.5 py-1" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>Prev</button>
                <button type="button" className="btn-ghost text-xs px-2.5 py-1" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>Next</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DetailDrawer subReseller={selected} onClose={() => setSelected(null)} onEdit={openEditForm} onSuspend={toggleSuspend} />
    </div>
  );
}
