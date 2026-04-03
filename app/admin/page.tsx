'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Screen = 'loading' | 'setup' | 'login' | 'dashboard';

type StaffRole = 'doctor' | 'reception';

type Staff = {
  _id: string;
  name: string;
  email: string;
  role: StaffRole;
  hospitalId?: string;
  specialization?: string;
  isAvailable?: boolean;
};

type Analytics = {
  summary: {
    doctorsCount: number;
    receptionCount: number;
    patientsCount: number;
    totalTokensToday: number;
    waitingNow: number;
    completedToday: number;
    consultationsToday: number;
    averageConsultationMinutes: number;
  };
  topDoctors: Array<{ doctorId: string; doctorName: string; completedCount: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
};

type StaffForm = {
  role: StaffRole;
  name: string;
  email: string;
  hospitalId: string;
  specialization: string;
  password: string;
  isAvailable: boolean;
};

const emptyStaffForm: StaffForm = {
  role: 'doctor',
  name: '',
  email: '',
  hospitalId: '',
  specialization: '',
  password: '',
  isAvailable: true,
};

const card: React.CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 14,
  background: 'var(--surface-2)',
  padding: 16,
};

const input: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--input-border)',
  borderRadius: 9,
  padding: '9px 10px',
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
};

const primaryButton: React.CSSProperties = {
  border: 'none',
  borderRadius: 9,
  padding: '9px 12px',
  background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const softButton: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.3)',
  borderRadius: 9,
  padding: '8px 10px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

export default function AdminPage() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [busy, setBusy] = useState(false);
  const [staffBusy, setStaffBusy] = useState(false);

  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [newStaff, setNewStaff] = useState<StaffForm>(emptyStaffForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<StaffForm>(emptyStaffForm);

  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [nextAdminPassword, setNextAdminPassword] = useState('');
  const [confirmNextAdminPassword, setConfirmNextAdminPassword] = useState('');

  const loadSession = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to check admin state.');

      if (!data.initialized) {
        setScreen('setup');
      } else if (!data.authenticated) {
        setScreen('login');
      } else {
        setScreen('dashboard');
        await Promise.all([loadStaff(), loadAnalytics()]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin state');
      setScreen('login');
    } finally {
      setBusy(false);
    }
  };

  const loadStaff = async () => {
    setStaffBusy(true);
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load staff.');
      setStaff(data.staff || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff');
    } finally {
      setStaffBusy(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load analytics.');
      setAnalytics(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load analytics');
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const doSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: setupPassword, confirmPassword: setupConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Setup failed');
      toast.success('Admin password set.');
      setScreen('dashboard');
      await Promise.all([loadStaff(), loadAnalytics()]);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Setup failed'));
  };

  const doLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      toast.success('Admin access granted.');
      setScreen('dashboard');
      setLoginPassword('');
      await Promise.all([loadStaff(), loadAnalytics()]);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Login failed'));
  };

  const doLogout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setScreen('login');
    setStaff([]);
    setAnalytics(null);
  };

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to create profile');
      toast.success('Profile created.');
      setNewStaff(emptyStaffForm);
      await Promise.all([loadStaff(), loadAnalytics()]);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to create profile'));
  };

  const startEdit = (row: Staff) => {
    setEditingId(row._id);
    setEditDraft({
      role: row.role,
      name: row.name,
      email: row.email,
      hospitalId: row.hospitalId || '',
      specialization: row.specialization || '',
      password: '',
      isAvailable: row.isAvailable !== false,
    });
  };

  const saveEdit = async (id: string) => {
    await run(async () => {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to update profile');
      toast.success('Profile updated.');
      setEditingId(null);
      await Promise.all([loadStaff(), loadAnalytics()]);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to update profile'));
  };

  const removeStaff = async (row: Staff) => {
    if (!confirm(`Delete ${row.name} (${row.role})?`)) return;
    await run(async () => {
      const res = await fetch(`/api/admin/staff/${row._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to delete profile');
      toast.success('Profile deleted.');
      await Promise.all([loadStaff(), loadAnalytics()]);
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to delete profile'));
  };

  const changeAdminPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const res = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentAdminPassword,
          newPassword: nextAdminPassword,
          confirmPassword: confirmNextAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to change admin password');
      toast.success('Admin password updated.');
      setCurrentAdminPassword('');
      setNextAdminPassword('');
      setConfirmNextAdminPassword('');
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to change admin password'));
  };

  if (screen === 'loading') {
    return <CenteredShell>Loading secure admin panel...</CenteredShell>;
  }

  if (screen === 'setup') {
    return (
      <CenteredShell>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Admin First-Time Setup</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Set the admin password once.</p>
        <form onSubmit={doSetup} style={{ display: 'grid', gap: 10, width: '100%' }}>
          <input type="password" value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} placeholder="Admin password" style={input} required />
          <input type="password" value={setupConfirm} onChange={(e) => setSetupConfirm(e.target.value)} placeholder="Confirm password" style={input} required />
          <button type="submit" style={primaryButton} disabled={busy}>{busy ? 'Saving...' : 'Initialize Admin'}</button>
        </form>
        <Link href="/login" style={{ marginTop: 12, color: '#22D3EE', fontSize: 13, textDecoration: 'none' }}>← Back to sign in</Link>
      </CenteredShell>
    );
  }

  if (screen === 'login') {
    return (
      <CenteredShell>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Admin Access</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Enter admin password.</p>
        <form onSubmit={doLogin} style={{ display: 'grid', gap: 10, width: '100%' }}>
          <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Admin password" style={input} required />
          <button type="submit" style={primaryButton} disabled={busy}>{busy ? 'Checking...' : 'Unlock Panel'}</button>
        </form>
        <Link href="/login" style={{ marginTop: 12, color: '#22D3EE', fontSize: 13, textDecoration: 'none' }}>← Back to sign in</Link>
      </CenteredShell>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: 18 }}>
      <div style={{ maxWidth: 1150, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', marginBottom: 4 }}>Admin Panel</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Manage doctors, receptionists, passwords, and patient analytics.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => Promise.all([loadStaff(), loadAnalytics()])} style={softButton}>Refresh</button>
            <button onClick={doLogout} style={{ ...softButton, color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.35)' }}>Sign Out</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <MiniCount label="Doctors" value={analytics?.summary.doctorsCount || 0} color="#22C55E" />
          <MiniCount label="Receptionists" value={analytics?.summary.receptionCount || 0} color="#6366F1" />
          <MiniCount label="Patients" value={analytics?.summary.patientsCount || 0} color="#F59E0B" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
          <section style={card}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 10 }}>Add Staff</h2>
            <form onSubmit={createStaff} style={{ display: 'grid', gap: 8 }}>
              <select value={newStaff.role} onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value as StaffRole }))} style={input}>
                <option value="doctor">Doctor</option>
                <option value="reception">Reception</option>
              </select>
              <input value={newStaff.name} onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))} placeholder="Name" style={input} required />
              <input value={newStaff.email} onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))} placeholder="Email" style={input} required />
              <input value={newStaff.hospitalId} onChange={(e) => setNewStaff((p) => ({ ...p, hospitalId: e.target.value }))} placeholder="Staff ID (optional)" style={input} />
              {newStaff.role === 'doctor' && <input value={newStaff.specialization} onChange={(e) => setNewStaff((p) => ({ ...p, specialization: e.target.value }))} placeholder="Specialization" style={input} />}
              <input type="password" value={newStaff.password} onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))} placeholder="Password" style={input} required />
              <button type="submit" style={primaryButton} disabled={busy}>{busy ? 'Saving...' : 'Create Profile'}</button>
            </form>
          </section>

          <section style={card}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 10 }}>Edit / Delete Staff</h2>
            {staffBusy ? <p style={{ color: 'var(--text-secondary)' }}>Loading staff...</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Role', 'Email', 'Staff ID', 'Specialization', 'Actions'].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', padding: '7px 4px' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((row) => (
                      <tr key={row._id} style={{ borderTop: '1px solid var(--table-border)' }}>
                        <td style={{ padding: '7px 4px', fontSize: 13, color: 'var(--text-primary)' }}>{editingId === row._id ? <input value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} style={input} /> : row.name}</td>
                        <td style={{ padding: '7px 4px', fontSize: 13, color: 'var(--text-primary)' }}>{editingId === row._id ? <select value={editDraft.role} onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value as StaffRole }))} style={input}><option value="doctor">Doctor</option><option value="reception">Reception</option></select> : row.role}</td>
                        <td style={{ padding: '7px 4px', fontSize: 13, color: 'var(--text-primary)' }}>{editingId === row._id ? <input value={editDraft.email} onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))} style={input} /> : row.email}</td>
                        <td style={{ padding: '7px 4px', fontSize: 13, color: 'var(--text-primary)' }}>{editingId === row._id ? <input value={editDraft.hospitalId} onChange={(e) => setEditDraft((p) => ({ ...p, hospitalId: e.target.value }))} style={input} /> : row.hospitalId || '-'}</td>
                        <td style={{ padding: '7px 4px', fontSize: 13, color: 'var(--text-primary)' }}>
                          {editingId === row._id ? (
                            editDraft.role === 'doctor' ? (
                              <input value={editDraft.specialization} onChange={(e) => setEditDraft((p) => ({ ...p, specialization: e.target.value }))} style={input} />
                            ) : (
                              '-'
                            )
                          ) : row.role === 'doctor' ? (row.specialization || '-') : '-'}
                        </td>
                        <td style={{ padding: '7px 4px' }}>
                          {editingId === row._id ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input type="password" placeholder="New password" value={editDraft.password} onChange={(e) => setEditDraft((p) => ({ ...p, password: e.target.value }))} style={{ ...input, minWidth: 130 }} />
                              <button onClick={() => saveEdit(row._id)} style={softButton}>Save</button>
                              <button onClick={() => setEditingId(null)} style={softButton}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => startEdit(row)} style={softButton}>Edit</button>
                              <button onClick={() => removeStaff(row)} style={{ ...softButton, color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.35)' }}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
          <section style={card}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 10 }}>Change Admin Password</h2>
            <form onSubmit={changeAdminPassword} style={{ display: 'grid', gap: 8 }}>
              <input type="password" value={currentAdminPassword} onChange={(e) => setCurrentAdminPassword(e.target.value)} placeholder="Current password" style={input} required />
              <input type="password" value={nextAdminPassword} onChange={(e) => setNextAdminPassword(e.target.value)} placeholder="New password" style={input} required />
              <input type="password" value={confirmNextAdminPassword} onChange={(e) => setConfirmNextAdminPassword(e.target.value)} placeholder="Confirm new password" style={input} required />
              <button type="submit" style={primaryButton} disabled={busy}>{busy ? 'Updating...' : 'Update Password'}</button>
            </form>
          </section>

          <section style={card}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 10 }}>Patient Analytics</h2>
            {!analytics ? (
              <p style={{ color: 'var(--text-secondary)' }}>No analytics yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <Stat label="Tokens Today" value={analytics.summary.totalTokensToday} />
                  <Stat label="Waiting Now" value={analytics.summary.waitingNow} />
                  <Stat label="Completed" value={analytics.summary.completedToday} />
                  <Stat label="Consultations" value={analytics.summary.consultationsToday} />
                  <Stat label="Avg Min" value={analytics.summary.averageConsultationMinutes} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ ...card, padding: 10 }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: 13, marginBottom: 6 }}>Top Doctors</p>
                    {analytics.topDoctors.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No records.</p> : analytics.topDoctors.map((d) => <p key={d.doctorId} style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.doctorName}: <strong style={{ color: 'var(--text-primary)' }}>{d.completedCount}</strong></p>)}
                  </div>
                  <div style={{ ...card, padding: 10 }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: 13, marginBottom: 6 }}>Gender Mix</p>
                    {analytics.genderDistribution.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No records.</p> : analytics.genderDistribution.map((g) => <p key={g.gender} style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize' }}>{g.gender}: <strong style={{ color: 'var(--text-primary)' }}>{g.count}</strong></p>)}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--auth-bg)' }}>
      <div style={{ ...card, maxWidth: 460, width: '100%' }}>{children}</div>
    </div>
  );
}

function MiniCount({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={card}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</p>
      <p style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 8 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{label}</p>
      <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{value}</p>
    </div>
  );
}
