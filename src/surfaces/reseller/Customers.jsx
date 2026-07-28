import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Eye,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api.js';
import { useApp } from '../../AppContext.jsx';

const PRIMARY_HEX = '#046BD2';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Shown only when the real customer list comes back genuinely empty — same
// "never overrides real data" rule as the admin surface's demo fallbacks.
const DEMO_CUSTOMERS = [
  { id: 'demo-1', company: 'Northwind Traders', name: 'Priya Shah', email: 'priya@northwind.example', createdAt: daysAgo(21), numberCount: 1,
    numbers: [{ id: 'd1', value: '+1 415 555 0142', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 93, min: 800 } }], minutesUsed: 512 },
  { id: 'demo-2', company: 'Bluepeak Studio', name: 'Owen Clarke', email: 'owen@bluepeak.example', createdAt: daysAgo(15), numberCount: 1,
    numbers: [{ id: 'd2', value: '+1 212 555 0198', isPrimary: true, planCycle: 'yearly', plan: { label: 'Starter', amount: 31, min: 250 } }], minutesUsed: 84 },
  { id: 'demo-3', company: 'Larkspur Dental', name: 'Maria Gomez', email: 'maria@larkspur.example', createdAt: daysAgo(9), numberCount: 2,
    numbers: [
      { id: 'd3a', value: '+1 646 555 0110', isPrimary: true,  planCycle: 'monthly', plan: { label: 'Scale', amount: 316, min: 3000 } },
      { id: 'd3b', value: '+1 646 555 0111', isPrimary: false, planCycle: 'monthly', plan: { label: 'Starter', amount: 31, min: 250 } },
    ], minutesUsed: 2140 },
  { id: 'demo-4', company: 'Fernhill Logistics', name: 'Jack Turner', email: 'jack@fernhill.example', createdAt: daysAgo(3), numberCount: 0, numbers: [], minutesUsed: 0 },
  { id: 'demo-5', company: 'Amber Coastal', name: 'Elena Ruiz', email: 'elena@ambercoastal.example', createdAt: daysAgo(35), numberCount: 1,
    numbers: [{ id: 'd5', value: '+1 305 555 0176', isPrimary: true, planCycle: 'monthly', plan: { label: 'Growth', amount: 93, min: 800 } }], minutesUsed: 745 },
  { id: 'demo-6', company: 'Redgate Realty', name: 'Sam Whitfield', email: 'sam@redgate.example', createdAt: daysAgo(48), numberCount: 1,
    numbers: [{ id: 'd6', value: '+1 720 555 0133', isPrimary: true, planCycle: 'yearly', plan: { label: 'Starter', amount: 31, min: 250 } }], minutesUsed: 40 },
];

// Resolve the symbol + format for the reseller's storefront currency.
const symbolFor = (cur) => (cur === 'USD' ? '$' : `${cur || '$'} `);
const fmtMoney = (n, cur) => {
  const sym = symbolFor(cur);
  return cur === 'USD'
    ? `${sym}${Number(n || 0).toLocaleString('en-US')}`
    : `${sym}${Number(n || 0).toFixed(2)}`;
};

// Same fallback logic as the admin tables: prefer `customer.numbers[]`
// (per-DID plan tiers from user_numbers JOIN); fall back to the legacy
// primary (users.plan_label + users.number_value) for any row that
// pre-dates the per-DID schema.
const didsFor = (c) => {
  if (Array.isArray(c.numbers) && c.numbers.length) return c.numbers;
  if (c.number) {
    return [{
      id: `legacy-${c.id}`,
      value: c.number,
      isPrimary: true,
      planCycle: 'monthly',
      plan: c.plan
        ? { ...c.plan, id: c.plan.label?.toLowerCase() || 'unknown' }
        : null,
    }];
  }
  return [];
};

function totalAllowance(c) {
  return didsFor(c).reduce((sum, d) => sum + Number(d.plan?.min || 0), 0);
}

function usageRatio(c) {
  const allowance = totalAllowance(c);
  if (!allowance) return 0;
  return Math.min(1, Number(c.minutesUsed || 0) / allowance);
}

function statusFor(c) {
  if (c.suspended) return { id: 'suspended', label: 'Suspended', dot: 'bg-red-400', className: 'border-red-500/25 bg-red-500/10 text-red-300' };
  if (!didsFor(c).length) return { id: 'inactive', label: 'Inactive', dot: 'bg-[var(--body)]', className: 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]' };
  const ratio = usageRatio(c);
  if (ratio >= 0.85) return { id: 'near-limit', label: 'Near Limit', dot: 'bg-amber-400', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' };
  return { id: 'active', label: 'Active', dot: 'bg-emerald-400', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' };
}

function progressTone(ratio) {
  if (ratio >= 0.85) return { bar: 'bg-red-400', track: 'bg-red-500/15' };
  if (ratio >= 0.6) return { bar: 'bg-amber-400', track: 'bg-amber-500/15' };
  return { bar: 'bg-emerald-400', track: 'bg-emerald-500/15' };
}

function initialsFor(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

const GROWTH_RANGES = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
];

const TOP_FILTERS = [
  { id: 'all', label: 'All Customers' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'inactive', label: 'Inactive' },
];

function GrowthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, count } = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3.5 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
      <div className="text-xs font-semibold text-[var(--foreground)]">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-6 text-xs">
        <span className="text-[var(--body)]">New customers</span>
        <span className="font-semibold text-[var(--foreground)]">{count}</span>
      </div>
    </div>
  );
}

function UsageDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--popover)] px-3 py-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
      <div className="text-xs font-semibold text-[var(--foreground)]">{name}</div>
      <div className="mt-1 text-xs text-[var(--body)]">{value} customer{value === 1 ? '' : 's'}</div>
    </div>
  );
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
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
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

function RowMenu({ customer, onBillingHistory, onSuspend, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const MENU_HEIGHT = 3 * 32 + 8;

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
    { label: 'Billing History', onClick: () => onBillingHistory(customer) },
    { label: customer.suspended ? 'Reactivate Customer' : 'Suspend Customer', onClick: () => onSuspend(customer), danger: !customer.suspended },
    { label: 'Delete Customer', onClick: () => onDelete(customer), danger: true },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        aria-label={`Actions for ${customer.company || customer.name}`}
      >
        <MoreVertical size={15} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
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

function DetailDrawer({ customer, currency, onClose, onSuspend, onDelete }) {
  if (typeof document === 'undefined' || !customer) return null;
  const dids = didsFor(customer);
  const status = statusFor(customer);
  const ratio = usageRatio(customer);
  const tone = progressTone(ratio);
  const allowance = totalAllowance(customer);

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
        aria-labelledby="customer-drawer-title"
      >
        <div className="shrink-0 border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-sm font-semibold text-[var(--primary)]">
                {initialsFor(customer.company || customer.name)}
              </span>
              <div className="min-w-0">
                <h2 id="customer-drawer-title" className="truncate text-lg font-semibold text-[var(--foreground)]">{customer.company || customer.name}</h2>
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Customer Information</div>
          <div className="mt-1 divide-y divide-[var(--border)]">
            {row('Contact', customer.name || '—')}
            {row('Email', customer.email || '—')}
            {row('Numbers Provisioned', dids.length)}
            {row('Minutes Used', `${Number(customer.minutesUsed || 0).toLocaleString('en-US')}${allowance ? ` / ${allowance}` : ''} min`)}
            {row('Joined Date', fmtDate(customer.createdAt))}
          </div>

          {allowance > 0 && (
            <div className="mt-4">
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}>
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-[var(--body)]">{Math.round(ratio * 100)}% of monthly allowance used</div>
            </div>
          )}

          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Numbers &amp; Plans</div>
          <div className="mt-2 space-y-2">
            {dids.length === 0 && <div className="text-xs text-[var(--body)]">No numbers assigned yet.</div>}
            {dids.map((d) => (
              <div key={d.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--foreground)]">
                    <Phone size={11} className="text-[var(--body)]" />
                    {d.value}
                    {d.isPrimary && <span className="pill border border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[10px] uppercase tracking-wide text-[var(--primary)]">Primary</span>}
                  </span>
                  <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wide ${
                    d.planCycle === 'yearly' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border)] bg-[var(--card)] text-[var(--body)]'
                  }`}>
                    {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--body)]">
                  {d.plan ? `${d.plan.label} Plan · ${fmtMoney(d.plan.amount, currency)}/month · ${d.plan.min} min` : 'No plan assigned'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)] mb-2">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${quickAction} ${customer.suspended ? '' : '!text-red-300 hover:!bg-red-500/15 hover:!text-red-200 hover:!border-red-500/30'}`}
              onClick={() => onSuspend(customer)}
            >
              {customer.suspended ? 'Reactivate Customer' : 'Suspend Customer'}
            </button>
            <button
              type="button"
              className={`${quickAction} !text-red-300 hover:!bg-red-500/15 hover:!text-red-200 hover:!border-red-500/30`}
              onClick={() => { onDelete(customer); onClose(); }}
            >
              Delete Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function CustomerRow({ customer, currency, onViewDetails, onSuspend, onDelete }) {
  const dids = didsFor(customer);
  const [expanded, setExpanded] = useState(false);
  const status = statusFor(customer);
  const ratio = usageRatio(customer);
  const tone = progressTone(ratio);
  const allowance = totalAllowance(customer);
  const primary = dids[0];

  return (
    <>
      <tr
        className="border-b border-[var(--border)] transition-colors duration-200 hover:bg-[var(--muted)] cursor-pointer"
        onClick={() => dids.length > 1 && setExpanded((v) => !v)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glow)] text-xs font-semibold text-[var(--primary)]">
              {initialsFor(customer.company || customer.name)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-[var(--foreground)]">{customer.company || customer.name}</span>
                {dids.length > 1 && (
                  <ChevronDown size={14} className={`shrink-0 text-[var(--body)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                )}
              </div>
              <div className="truncate text-xs text-[var(--body)]">{customer.email}</div>
            </div>
          </div>
        </td>

        <td className="px-4 py-4 text-xs text-[var(--body)]">
          {primary ? (
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Phone size={11} className="text-[var(--body)]" />
              {primary.value}
            </span>
          ) : (
            <div>
              <div className="text-[var(--body)]">No phone number assigned</div>
              <button type="button" onClick={(e) => e.stopPropagation()} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
                Assign Number →
              </button>
            </div>
          )}
        </td>

        <td className="px-4 py-4">
          {primary?.plan ? (
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{primary.plan.label} Plan</div>
              <div className="mt-0.5 text-xs text-[var(--body)]">{fmtMoney(primary.plan.amount, currency)}/month · {primary.plan.min} Minutes</div>
              <span className={`mt-1.5 inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wide ${
                primary.planCycle === 'yearly' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]'
              }`}>
                {primary.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
              </span>
              {dids.length > 1 && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">+{dids.length - 1} more</div>}
            </div>
          ) : (
            <span className="text-sm text-[var(--body)]">—</span>
          )}
        </td>

        <td className="px-4 py-4 min-w-[150px]">
          {allowance ? (
            <div>
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}>
                <div className={`h-full rounded-full ${tone.bar} transition-all duration-500`} style={{ width: `${Math.round(ratio * 100)}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--body)]">
                <span>{Number(customer.minutesUsed || 0).toFixed(0)} / {allowance} min</span>
                <span className="font-semibold text-[var(--foreground)]">{Math.round(ratio * 100)}%</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-[var(--body)]">—</span>
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium ${status.className}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-xs text-[var(--body)]">{fmtDate(customer.createdAt)}</td>

        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onViewDetails(customer)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--body)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="View customer"
            >
              <Eye size={15} />
            </button>
            <RowMenu
              customer={customer}
              onBillingHistory={() => setExpanded(true)}
              onSuspend={onSuspend}
              onDelete={onDelete}
            />
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
          <td colSpan={7} className="px-6 py-4">
            {dids.length === 0 && (
              <div className="text-xs text-[var(--body)]">No numbers or billing lines yet for this customer.</div>
            )}
            <div className="space-y-2.5">
              {dids.map((d) => {
                const dRatio = d.plan?.min ? Math.min(1, Number(customer.minutesUsed || 0) / didsFor(customer).length / d.plan.min) : 0;
                const dTone = progressTone(dRatio);
                return (
                  <div key={d.id} className="grid grid-cols-1 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] p-3 sm:grid-cols-4">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--foreground)]">
                      <Phone size={11} className="text-[var(--body)]" />
                      {d.value}
                      {d.isPrimary && <span className="pill border border-[rgba(4,107,210,0.28)] bg-[var(--glow)] text-[10px] uppercase tracking-wide text-[var(--primary)]">Primary</span>}
                    </span>
                    <span className="text-xs text-[var(--foreground)]">{d.plan?.label || '—'} Plan</span>
                    <span className={`inline-flex h-5 w-fit items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wide ${
                      d.planCycle === 'yearly' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-[var(--border)] bg-[var(--muted)] text-[var(--body)]'
                    }`}>
                      {d.planCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </span>
                    {d.plan?.min ? (
                      <div>
                        <div className={`h-1.5 w-full overflow-hidden rounded-full ${dTone.track}`}>
                          <div className={`h-full rounded-full ${dTone.bar}`} style={{ width: `${Math.round(dRatio * 100)}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] text-[var(--body)]">{d.plan.min} min allowance</div>
                      </div>
                    ) : <span className="text-xs text-[var(--body)]">—</span>}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Customers() {
  const { currentUser } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [topFilter, setTopFilter] = useState('all');
  const [growthRange, setGrowthRange] = useState('30d');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState(null); // { tone: 'success' | 'info', text }
  const [selected, setSelected] = useState(null);

  const currency = currentUser?.displayCurrency || 'USD';

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const r = await api('/api/reseller/customers');
      setList(r.customers || []);
    } catch (e) {
      setErr(e.message);
      setList((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Falls back to demo customers only when the real list comes back
  // genuinely empty — never overrides real data.
  const usingDemo = list !== null && list.length === 0;
  const effectiveList = list === null ? null : (list.length > 0 ? list : DEMO_CUSTOMERS);

  // The current list may still be the raw (possibly empty) API response —
  // seed it with the demo rows first so a row action against a demo row has
  // something in state to actually update.
  const seededList = () => (list && list.length ? list : DEMO_CUSTOMERS);

  const toggleSuspend = (customer) => {
    setList((cur) => seededList().map((c) => (c.id === customer.id ? { ...c, suspended: !c.suspended } : c)));
    setNotice({ tone: 'success', text: `✓ ${customer.company || customer.name} ${customer.suspended ? 'reactivated' : 'suspended'}` });
  };

  const deleteCustomer = (customer) => {
    if (!window.confirm(`Delete ${customer.company || customer.name}? This cannot be undone.`)) return;
    setList((cur) => seededList().filter((c) => c.id !== customer.id));
    setNotice({ tone: 'success', text: `✓ ${customer.company || customer.name} deleted` });
    if (selected?.id === customer.id) setSelected(null);
  };

  const planOptions = useMemo(() => {
    const labels = new Set();
    (effectiveList || []).forEach((c) => didsFor(c).forEach((d) => d.plan?.label && labels.add(d.plan.label)));
    return [{ value: 'all', label: 'All Plans' }, ...[...labels].map((l) => ({ value: l, label: l }))];
  }, [effectiveList]);

  const filtered = useMemo(() => {
    return (effectiveList || []).filter((c) => {
      const dids = didsFor(c);
      if (search) {
        const haystack = [c.company, c.name, c.email, ...dids.map((d) => d.value)].join(' ').toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      if (planFilter !== 'all' && !dids.some((d) => d.plan?.label === planFilter)) return false;
      if (cycleFilter !== 'all' && !dids.some((d) => d.planCycle === cycleFilter)) return false;
      const status = statusFor(c);
      if (statusFilter !== 'all' && status.id !== statusFilter) return false;
      if (topFilter === 'at-risk' && status.id !== 'near-limit') return false;
      if (topFilter === 'inactive' && status.id !== 'inactive') return false;
      return true;
    });
  }, [effectiveList, search, planFilter, cycleFilter, statusFilter, topFilter]);

  const totalDids = useMemo(() => (effectiveList || []).reduce((a, c) => a + didsFor(c).length, 0), [effectiveList]);
  const totalMrr = useMemo(
    () => (effectiveList || []).reduce((a, c) => a + didsFor(c).reduce((s, d) => s + (d.planCycle !== 'yearly' ? Number(d.plan?.amount || 0) : 0), 0), 0),
    [effectiveList]
  );
  const avgMinutes = useMemo(() => {
    if (!effectiveList?.length) return 0;
    return Math.round(effectiveList.reduce((a, c) => a + Number(c.minutesUsed || 0), 0) / effectiveList.length);
  }, [effectiveList]);
  const avgAllowanceRatio = useMemo(() => {
    const totalAllow = (effectiveList || []).reduce((a, c) => a + totalAllowance(c), 0);
    const totalUsed = (effectiveList || []).reduce((a, c) => a + Number(c.minutesUsed || 0), 0);
    return totalAllow ? Math.round((totalUsed / totalAllow) * 100) : 0;
  }, [effectiveList]);

  const growthData = useMemo(() => {
    const range = GROWTH_RANGES.find((r) => r.id === growthRange) || GROWTH_RANGES[1];
    const buckets = new Map();
    const today = new Date();
    for (let i = range.days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 });
    }
    (effectiveList || []).forEach((c) => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.get(key).count += 1;
    });
    return [...buckets.values()];
  }, [effectiveList, growthRange]);

  const usageDonut = useMemo(() => {
    const buckets = [
      { name: '0–60%', value: 0, color: '#34d399' },
      { name: '60–85%', value: 0, color: '#fbbf24' },
      { name: '85–100%', value: 0, color: '#f87171' },
    ];
    (effectiveList || []).forEach((c) => {
      const ratio = usageRatio(c);
      if (ratio >= 0.85) buckets[2].value += 1;
      else if (ratio >= 0.6) buckets[1].value += 1;
      else buckets[0].value += 1;
    });
    return buckets;
  }, [effectiveList]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const exportCsv = () => {
    const rows = [
      ['company', 'email', 'number', 'plan', 'cycle', 'minutes_used', 'allowance', 'status', 'joined'],
      ...(effectiveList || []).flatMap((c) => {
        const dids = didsFor(c);
        const status = statusFor(c);
        if (!dids.length) return [[c.company || c.name, c.email, '', '', '', c.minutesUsed || 0, '', status.label, fmtDate(c.createdAt)]];
        return dids.map((d) => [c.company || c.name, c.email, d.value, d.plan?.label || '', d.planCycle, c.minutesUsed || 0, d.plan?.min || '', status.label, fmtDate(c.createdAt)]);
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">My customers</h1>
          <p className="mt-1 text-sm text-[var(--body)]">
            Every account that signed up through your portal — with every plan and number they bought.
          </p>
          {usingDemo && <span className="overview-demo-pill mt-2 inline-block">Demo data</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCsv} className={toolbarButton}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" onClick={load} className={toolbarButton} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
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
              <p className="mt-0.5 text-xs text-[var(--body)]">Reconnect your reseller account to continue syncing customers.</p>
            </div>
            <button type="button" onClick={load} className="btn-primary text-sm shrink-0">Reconnect</button>
          </div>
        </div>
      )}

      {notice && (
        <div className={`text-sm rounded-[var(--radius)] px-3 py-2 border ${
          notice.tone === 'success'
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
        }`}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Total Customers" value={effectiveList === null ? '—' : effectiveList.length} hint={effectiveList?.length ? `${effectiveList.length} accounts on your portal` : undefined} />
        <KpiCard icon={Phone} label="Numbers Provisioned" value={effectiveList === null ? '—' : totalDids} hint={effectiveList?.length ? `${Math.round((totalDids / Math.max(1, effectiveList.length)) * 100) / 100} avg per customer` : undefined} />
        <KpiCard icon={CreditCard} label="Plans Sold" value={effectiveList === null ? '—' : totalDids} hint={effectiveList ? `${fmtMoney(totalMrr, currency)} MRR` : undefined} />
        <KpiCard icon={Clock} label="Average Minutes Used" value={effectiveList === null ? '—' : `${avgMinutes.toLocaleString('en-US')} min`} hint={effectiveList ? `${avgAllowanceRatio}% of allowance` : undefined} />
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--body)]" />
            <input
              className="input h-10 rounded-[var(--radius-sm)] pl-10 text-sm"
              placeholder="Search customer, email, phone, or DID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--body)] hover:text-[var(--foreground)]" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <CustomSelect value={planFilter} onChange={(v) => { setPlanFilter(v); setPage(1); }} options={planOptions} placeholder="Plan" />
          <CustomSelect
            value={cycleFilter}
            onChange={(v) => { setCycleFilter(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Cycles' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]}
            placeholder="Cycle"
          />
          <CustomSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'near-limit', label: 'Near Limit' }, { value: 'inactive', label: 'Inactive' }]}
            placeholder="Status"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Customer Growth</div>
              <p className="mt-1 text-xs text-[var(--body)]">New customers over time</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
              {GROWTH_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setGrowthRange(r.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                    growthRange === r.id ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} key={growthRange}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(203,213,225,0.72)', fontSize: 11 }} interval={growthRange === '7d' ? 0 : 'preserveStartEnd'} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(203,213,225,0.72)', fontSize: 11 }} allowDecimals={false} width={28} />
                <Tooltip content={<GrowthTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
                <Bar dataKey="count" fill={PRIMARY_HEX} radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--body)]">Usage Distribution</div>
          <p className="mt-1 text-xs text-[var(--body)]">Customers by minutes usage</p>

          <div className="mt-2 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<UsageDonutTooltip />} />
                <Pie data={usageDonut} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={3} isAnimationActive animationDuration={600}>
                  {usageDonut.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {usageDonut.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-[var(--body)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-semibold text-[var(--foreground)]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] p-1">
        {TOP_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setTopFilter(f.id); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
              topFilter === f.id ? 'bg-[var(--primary)] text-white' : 'text-[var(--body)] hover:text-[var(--foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Contact</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Plan &amp; Cycle</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Minutes Used</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Joined</th>
                <th className="text-right px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--body)] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {effectiveList === null && (
                <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-[var(--body)]">Loading…</td></tr>
              )}
              {effectiveList !== null && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--body)]">
                        <Users size={20} />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">No customers match your filters</div>
                      <p className="max-w-sm text-xs text-[var(--body)]">Try adjusting search, plan, cycle, or status filters.</p>
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  currency={currency}
                  onViewDetails={setSelected}
                  onSuspend={toggleSuspend}
                  onDelete={deleteCustomer}
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

      <DetailDrawer customer={selected} currency={currency} onClose={() => setSelected(null)} onSuspend={toggleSuspend} onDelete={deleteCustomer} />
    </div>
  );
}
