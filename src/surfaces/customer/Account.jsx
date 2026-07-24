import { useState, useEffect } from 'react';
import { User, Lock, Save, Mail, Phone, AtSign } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';

export default function Account() {
  const { currentUser, demoMode, updateCurrentUser } = useApp();
  const DEMO_USER = { name: 'Demo User', company: 'Vozper Demo', email: 'demo@vozper.com', username: 'demo', phone: '+1 (555) 000-0000' };
  const user = currentUser || (demoMode ? DEMO_USER : {});

  const [profile, setProfile] = useState({ name: '', company: '', email: '', username: '', phone: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setProfile({
      name: user.name || '',
      company: user.company || '',
      email: user.email || '',
      username: user.username || '',
      phone: user.phone || '',
    });
  }, [user]);

  const initials = (user.name || 'DU').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setProfileMsg('Profile updated successfully!');
    setProfileBusy(false);
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { setPwMsg('Passwords do not match'); return; }
    setPwBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setPwMsg('Password changed successfully!');
    setPwBusy(false);
    setPw({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-[var(--body)]">Manage your profile, login, and contact details.</p>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Summary Card */}
        <div className="form-card flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4"
            style={{ background: 'linear-gradient(135deg, #046BD2, #0086F9)' }}>
            {initials}
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{user.name || 'Demo User'}</h3>
          <p className="text-xs text-[var(--body)] mt-1">{user.role === 'admin' ? 'Administrator' : 'Customer'}</p>
          <div className="w-full mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--muted)]">
              <Mail size={14} className="text-[var(--primary)]" />
              <span className="text-xs text-[var(--body)]">{user.email || 'demo@vozper.com'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--muted)]">
              <AtSign size={14} className="text-[var(--primary)]" />
              <span className="text-xs text-[var(--body)]">{user.username || 'demo'}</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--muted)]">
              <Phone size={14} className="text-[var(--primary)]" />
              <span className="text-xs text-[var(--body)]">{user.phone || '+1 (555) 000-0000'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Form */}
          <form onSubmit={saveProfile} className="form-card space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <User size={16} className="text-[var(--primary)]" /> Profile Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Company</label>
                <input className="input" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>
            {profileMsg && <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">{profileMsg}</div>}
            <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={profileBusy}>
              {profileBusy ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          {/* Password Form */}
          <form onSubmit={savePw} className="form-card space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Lock size={16} className="text-[var(--primary)]" /> Change Password
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Current Password</label>
                <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div>
                <label className="field-label">New Password</label>
                <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Confirm Password</label>
                <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
            </div>
            {pwMsg && <div className={`text-xs rounded-lg px-3 py-2 ${pwMsg.includes('match') ? 'text-red-400 bg-red-500/10 border border-red-500/30' : 'text-green-400 bg-green-500/10 border border-green-500/30'}`}>{pwMsg}</div>}
            <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={pwBusy}>
              {pwBusy ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}