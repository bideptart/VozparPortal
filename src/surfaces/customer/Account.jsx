import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AtSign, Building2, Lock, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";

import { useApp } from "../../AppContext.jsx";
import AccountDialog from "@/components/ui/ruixen-dialog";

const BRAND_GRADIENT = "bg-[linear-gradient(135deg,#0ea5e9_0%,#6366f1_55%,#8b5cf6_110%)]";

const initialsOf = (name) => {
  if (!name) return "NA";
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "NA";
};

const titleCase = (value) =>
  String(value || "user")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const detailRows = (user) => [
  { icon: Mail, label: "Email", value: user.email || "Not set" },
  { icon: AtSign, label: "Username", value: user.username || "Not set" },
  { icon: Phone, label: "Phone", value: user.phone || "Not set" },
  { icon: Building2, label: "Company", value: user.company || "Not set" },
];

export default function Account() {
  const {
    currentUser,
    updateCurrentUser,
    changePassword,
    deleteCurrentAccount,
    authError,
    setAuthError,
  } = useApp();
  const [searchParams] = useSearchParams();
  const passwordCardRef = useRef(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const user = currentUser || {};
  const accountType = titleCase(user.userType || user.role || "user");
  const initials = useMemo(() => initialsOf(user.name || user.company || user.email), [user]);

  useEffect(() => {
    if (searchParams.get("section") === "password" && passwordCardRef.current) {
      passwordCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  useEffect(() => {
    setAuthError("");
  }, [setAuthError]);

  const saveProfile = async (patch) => {
    setAuthError("");
    const ok = await updateCurrentUser(patch);
    if (ok) {
      setProfileMsg("Profile updated successfully.");
      setTimeout(() => setProfileMsg(""), 3000);
      return true;
    }
    return false;
  };

  const savePw = async (event) => {
    event.preventDefault();
    setPwMsg("");
    setAuthError("");

    if (pw.next !== pw.confirm) {
      setPwMsg("Passwords do not match.");
      return;
    }

    setPwBusy(true);
    const ok = await changePassword({ current: pw.current, next: pw.next });
    setPwBusy(false);

    if (ok) {
      setPwMsg("Password changed successfully.");
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwMsg(""), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete your account and release your number? This cannot be undone.");
    if (!confirmed) return;
    setDeleteBusy(true);
    try {
      await deleteCurrentAccount();
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Manage your profile details, contact information, and account security.</p>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
        <div className="space-y-6">
          <section className="form-card overflow-hidden p-0">
            <div className="h-36 bg-[radial-gradient(circle_at_top_left,rgba(37,117,252,0.8),transparent_38%),linear-gradient(135deg,#046BD2_0%,#0B1220_85%)]" />
            <div className="px-6 pb-6">
              <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--surface)] bg-[linear-gradient(135deg,#046BD2,#0086F9)] text-2xl font-bold text-white shadow-lg">
                    {initials}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl font-semibold text-[var(--foreground)]">{user.name || user.company || "Account"}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[rgba(4,107,210,0.25)] bg-[rgba(4,107,210,0.12)] px-2.5 py-1 font-medium text-[var(--primary)]">
                        {accountType}
                      </span>
                      {user.plan?.label && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--body)]">
                          {user.plan.label} plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <AccountDialog user={user} onSave={saveProfile} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {detailRows(user).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-[var(--muted)]/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--body)]/80">
                      <Icon size={14} className="text-[var(--primary)]" />
                      {label}
                    </div>
                    <div className="mt-2 text-sm text-[var(--foreground)]">{value}</div>
                  </div>
                ))}
              </div>

              {(profileMsg || authError) && (
                <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${authError ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-primary/25 bg-primary/10 text-primary"}`}>
                  {authError || profileMsg}
                </div>
              )}
            </div>
          </section>

          <section className="form-card">
            <div className="rounded-2xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04))] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-red-400">Danger Zone</div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteBusy}
                  className="inline-flex rounded-xl bg-[#ef2f2f] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(239,47,47,0.22)] transition hover:bg-[#ff3c3c] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleteBusy ? "Deleting..." : "Delete account & release number"}
                </button>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--body)]">
                Cancels your subscription, deletes your agent, and releases your phone number. Cannot be undone.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="form-card">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ShieldCheck size={16} className="text-[var(--primary)]" /> Account Snapshot
            </h3>
            <div className="mt-4 space-y-3 text-sm text-[var(--body)]">
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                <span>Account type</span>
                <span className="font-medium text-[var(--foreground)]">{accountType}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                <span>Company</span>
                <span className="font-medium text-[var(--foreground)]">{user.company || "Not set"}</span>
              </div>
              {user.plan?.label && (
                <div className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2">
                  <span>Current plan</span>
                  <span className="font-medium text-[var(--foreground)]">{user.plan.label}</span>
                </div>
              )}
            </div>
          </div>

          <form ref={passwordCardRef} onSubmit={savePw} className={`form-card space-y-4 ${searchParams.get("section") === "password" ? "ring-2 ring-[var(--primary)]/40" : ""}`}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Lock size={16} className="text-[var(--primary)]" /> Change Password
            </h3>

            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--muted)] px-4 py-3">
                <label className="mb-2 block text-sm font-medium text-[var(--body)]">Current Password</label>
                <input
                  className="input border-white/10 bg-[rgba(255,255,255,0.04)]"
                  type="password"
                  value={pw.current}
                  onChange={(event) => setPw((current) => ({ ...current, current: event.target.value }))}
                />
              </div>
              <div className="rounded-xl bg-[var(--muted)] px-4 py-3">
                <label className="mb-2 block text-sm font-medium text-[var(--body)]">New Password</label>
                <input
                  className="input border-white/10 bg-[rgba(255,255,255,0.04)]"
                  type="password"
                  value={pw.next}
                  onChange={(event) => setPw((current) => ({ ...current, next: event.target.value }))}
                />
              </div>
              <div className="rounded-xl bg-[var(--muted)] px-4 py-3">
                <label className="mb-2 block text-sm font-medium text-[var(--body)]">Confirm Password</label>
                <input
                  className="input border-white/10 bg-[rgba(255,255,255,0.04)]"
                  type="password"
                  value={pw.confirm}
                  onChange={(event) => setPw((current) => ({ ...current, confirm: event.target.value }))}
                />
              </div>
            </div>

            {(pwMsg || authError) && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${pwMsg && !pwMsg.includes("not match") ? "border-primary/25 bg-primary/10 text-primary" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                {pwMsg || authError}
              </div>
            )}

            <button
              type="submit"
              disabled={pwBusy}
              className="group relative overflow-hidden flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-full border border-white/25 transition duration-200 ease-out hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className={`absolute inset-0 ${BRAND_GRADIENT} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
              <Save size={14} className="relative" />
              <span className="relative">{pwBusy ? "Updating..." : "Update Password"}</span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
