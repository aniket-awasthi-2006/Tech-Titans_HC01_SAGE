'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  BarChart3,
  ClipboardList,
  LogOut,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPlus2,
  Users,
} from 'lucide-react';

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

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--auth-bg)',
  padding: '20px 16px 28px',
};

const panelStyle: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 18,
  background: 'color-mix(in srgb, var(--surface-2) 86%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow-elevated)',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-primary)',
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: '-0.01em',
};

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--input-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'var(--input-bg)',
  color: 'var(--input-text)',
  fontSize: 14,
  outline: 'none',
};

const primaryButton: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-brand-indigo-sm)',
};

const ghostButton: CSSProperties = {
  border: '1px solid var(--input-border)',
  borderRadius: 10,
  padding: '9px 12px',
  background: 'color-mix(in srgb, var(--surface) 75%, transparent)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerButton: CSSProperties = {
  ...ghostButton,
  borderColor: 'rgba(239,68,68,0.45)',
  color: '#FCA5A5',
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

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
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

  const loadSession = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to check admin state.');

      if (!data.initialized) {
        setScreen('setup');
        return;
      }

      if (!data.authenticated) {
        setScreen('login');
        return;
      }

      setScreen('dashboard');
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin state');
      setScreen('login');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await run(async () => {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: setupPassword, confirmPassword: setupConfirm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Setup failed');
      });
      toast.success('Admin password set.');
      setScreen('dashboard');
      setSetupPassword('');
      setSetupConfirm('');
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    }
  };

  const doLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await run(async () => {
        const res = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: loginPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Login failed');
      });
      toast.success('Admin access granted.');
      setScreen('dashboard');
      setLoginPassword('');
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const doLogout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setScreen('login');
    setStaff([]);
    setAnalytics(null);
  };

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await run(async () => {
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStaff),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Unable to create profile');
      });
      toast.success('Profile created.');
      setNewStaff(emptyStaffForm);
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create profile');
    }
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
    try {
      await run(async () => {
        const res = await fetch(`/api/admin/staff/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editDraft),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Unable to update profile');
      });
      toast.success('Profile updated.');
      setEditingId(null);
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile');
    }
  };

  const removeStaff = async (row: Staff) => {
    if (!confirm(`Delete ${row.name} (${row.role})?`)) return;
    try {
      await run(async () => {
        const res = await fetch(`/api/admin/staff/${row._id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Unable to delete profile');
      });
      toast.success('Profile deleted.');
      await Promise.all([loadStaff(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete profile');
    }
  };

  const summary = useMemo(
    () =>
      analytics?.summary || {
        doctorsCount: 0,
        receptionCount: 0,
        patientsCount: 0,
        totalTokensToday: 0,
        waitingNow: 0,
        completedToday: 0,
        consultationsToday: 0,
        averageConsultationMinutes: 0,
      },
    [analytics]
  );

  if (screen === 'loading') {
    return (
      <CenteredShell
        title="Loading Admin Workspace"
        subtitle="Checking admin session and secure state..."
      >
        <LoaderLabel label="Preparing control panel..." />
      </CenteredShell>
    );
  }

  if (screen === 'setup') {
    return (
      <CenteredShell
        title="Admin First-Time Setup"
        subtitle="Create the one admin password for this deployment."
      >
        <form onSubmit={doSetup} style={{ display: 'grid', gap: 10, width: '100%' }}>
          <input
            type="password"
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
            placeholder="Admin password"
            style={fieldStyle}
            required
          />
          <input
            type="password"
            value={setupConfirm}
            onChange={(e) => setSetupConfirm(e.target.value)}
            placeholder="Confirm password"
            style={fieldStyle}
            required
          />
          <button type="submit" style={primaryButton} disabled={busy}>
            {busy ? 'Saving...' : 'Initialize Admin'}
          </button>
        </form>
        <Link
          href="/login"
          style={{
            marginTop: 12,
            color: 'var(--text-accent)',
            fontSize: 13,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          &larr; Back to sign in
        </Link>
      </CenteredShell>
    );
  }

  if (screen === 'login') {
    return (
      <CenteredShell title="Admin Access" subtitle="Enter the admin password to unlock panel">
        <form onSubmit={doLogin} style={{ display: 'grid', gap: 10, width: '100%' }}>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Admin password"
            style={fieldStyle}
            required
          />
          <button type="submit" style={primaryButton} disabled={busy}>
            {busy ? 'Checking...' : 'Unlock Panel'}
          </button>
        </form>
        <Link
          href="/login"
          style={{
            marginTop: 12,
            color: 'var(--text-accent)',
            fontSize: 13,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          &larr; Back to sign in
        </Link>
      </CenteredShell>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 14 }}>
        <header
          style={{
            ...panelStyle,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(37,99,235,0.13)',
                border: '1px solid rgba(37,99,235,0.25)',
                color: 'var(--text-accent)',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <ShieldCheck size={14} />
              Secure Control Panel
            </div>
            <h1 style={{ ...sectionTitleStyle, fontSize: 28 }}>Admin Panel</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Manage doctor/reception profiles and monitor patient queue analytics.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                void Promise.all([loadStaff(), loadAnalytics()]);
              }}
              style={ghostButton}
              disabled={busy}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} /> Refresh
              </span>
            </button>
            <button type="button" onClick={doLogout} style={dangerButton}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={14} /> Sign Out
              </span>
            </button>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <MiniMetric
            icon={<Stethoscope size={16} />}
            label="Doctors"
            value={summary.doctorsCount}
            accent="rgba(34,197,94,0.85)"
          />
          <MiniMetric
            icon={<Users size={16} />}
            label="Receptionists"
            value={summary.receptionCount}
            accent="rgba(99,102,241,0.9)"
          />
          <MiniMetric
            icon={<UserPlus2 size={16} />}
            label="Patients"
            value={summary.patientsCount}
            accent="rgba(245,158,11,0.95)"
          />
          <MiniMetric
            icon={<ClipboardList size={16} />}
            label="Tokens Today"
            value={summary.totalTokensToday}
            accent="rgba(14,165,233,0.95)"
          />
          <MiniMetric
            icon={<Activity size={16} />}
            label="Waiting Now"
            value={summary.waitingNow}
            accent="rgba(239,68,68,0.9)"
          />
        </section>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <article style={{ ...panelStyle, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <UserPlus2 size={18} color="#0EA5E9" />
              <h2 style={sectionTitleStyle}>Add Staff</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 10 }}>
              Create doctor and reception profiles with role-specific details.
            </p>
            <form onSubmit={createStaff} style={{ display: 'grid', gap: 8 }}>
              <select
                value={newStaff.role}
                onChange={(e) =>
                  setNewStaff((prev) => ({ ...prev, role: e.target.value as StaffRole }))
                }
                style={fieldStyle}
              >
                <option value="doctor">Doctor</option>
                <option value="reception">Reception</option>
              </select>
              <input
                value={newStaff.name}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                style={fieldStyle}
                required
              />
              <input
                value={newStaff.email}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                style={fieldStyle}
                required
              />
              <input
                value={newStaff.hospitalId}
                onChange={(e) =>
                  setNewStaff((prev) => ({ ...prev, hospitalId: e.target.value }))
                }
                placeholder="Staff ID (optional)"
                style={fieldStyle}
              />
              {newStaff.role === 'doctor' && (
                <input
                  value={newStaff.specialization}
                  onChange={(e) =>
                    setNewStaff((prev) => ({ ...prev, specialization: e.target.value }))
                  }
                  placeholder="Specialization"
                  style={fieldStyle}
                />
              )}
              <input
                type="password"
                value={newStaff.password}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Temporary password"
                style={fieldStyle}
                required
              />
              <button type="submit" style={primaryButton} disabled={busy}>
                {busy ? 'Saving...' : 'Create Profile'}
              </button>
            </form>
          </article>

          <article style={{ ...panelStyle, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Users size={18} color="#6366F1" />
              <h2 style={sectionTitleStyle}>Manage Staff</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 10 }}>
              Edit profile details, reset passwords, or remove staff accounts.
            </p>
            {staffBusy ? (
              <LoaderLabel label="Loading staff list..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Role', 'Email', 'Staff ID', 'Specialization', 'Actions'].map(
                        (title) => (
                          <th
                            key={title}
                            style={{
                              textAlign: 'left',
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              padding: '8px 6px',
                            }}
                          >
                            {title}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((row) => (
                      <tr
                        key={row._id}
                        style={{
                          borderTop: '1px solid var(--table-border)',
                          verticalAlign: 'top',
                        }}
                      >
                        <td style={cellStyle}>
                          {editingId === row._id ? (
                            <input
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((prev) => ({ ...prev, name: e.target.value }))
                              }
                              style={fieldStyle}
                            />
                          ) : (
                            row.name
                          )}
                        </td>
                        <td style={cellStyle}>
                          {editingId === row._id ? (
                            <select
                              value={editDraft.role}
                              onChange={(e) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  role: e.target.value as StaffRole,
                                }))
                              }
                              style={fieldStyle}
                            >
                              <option value="doctor">Doctor</option>
                              <option value="reception">Reception</option>
                            </select>
                          ) : (
                            row.role
                          )}
                        </td>
                        <td style={cellStyle}>
                          {editingId === row._id ? (
                            <input
                              value={editDraft.email}
                              onChange={(e) =>
                                setEditDraft((prev) => ({ ...prev, email: e.target.value }))
                              }
                              style={fieldStyle}
                            />
                          ) : (
                            row.email
                          )}
                        </td>
                        <td style={cellStyle}>
                          {editingId === row._id ? (
                            <input
                              value={editDraft.hospitalId}
                              onChange={(e) =>
                                setEditDraft((prev) => ({ ...prev, hospitalId: e.target.value }))
                              }
                              style={fieldStyle}
                            />
                          ) : (
                            row.hospitalId || '-'
                          )}
                        </td>
                        <td style={cellStyle}>
                          {editingId === row._id ? (
                            editDraft.role === 'doctor' ? (
                              <input
                                value={editDraft.specialization}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    specialization: e.target.value,
                                  }))
                                }
                                style={fieldStyle}
                              />
                            ) : (
                              '-'
                            )
                          ) : row.role === 'doctor' ? (
                            row.specialization || '-'
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ ...cellStyle, minWidth: 212 }}>
                          {editingId === row._id ? (
                            <div style={{ display: 'grid', gap: 6 }}>
                              <input
                                type="password"
                                placeholder="New password (optional)"
                                value={editDraft.password}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    password: e.target.value,
                                  }))
                                }
                                style={fieldStyle}
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void saveEdit(row._id);
                                  }}
                                  style={ghostButton}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  style={ghostButton}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                style={ghostButton}
                              >
                                <span
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  <Pencil size={12} /> Edit
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void removeStaff(row);
                                }}
                                style={dangerButton}
                              >
                                <span
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  <Trash2 size={12} /> Delete
                                </span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article style={{ ...panelStyle, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <BarChart3 size={18} color="#22C55E" />
              <h2 style={sectionTitleStyle}>Patient Analytics</h2>
            </div>
            {!analytics ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No analytics yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 8,
                  }}
                >
                  <MiniStat label="Waiting" value={summary.waitingNow} />
                  <MiniStat label="Completed" value={summary.completedToday} />
                  <MiniStat label="Consultations" value={summary.consultationsToday} />
                  <MiniStat label="Avg Minutes" value={summary.averageConsultationMinutes} />
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 10,
                    background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
                  }}
                >
                  <p style={listHeadingStyle}>Top Doctors</p>
                  {analytics.topDoctors.length === 0 ? (
                    <p style={listEmptyStyle}>No records.</p>
                  ) : (
                    analytics.topDoctors.map((doctor) => (
                      <p key={doctor.doctorId} style={listItemStyle}>
                        {doctor.doctorName}:{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {doctor.completedCount}
                        </strong>
                      </p>
                    ))
                  )}
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 10,
                    background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
                  }}
                >
                  <p style={listHeadingStyle}>Gender Mix</p>
                  {analytics.genderDistribution.length === 0 ? (
                    <p style={listEmptyStyle}>No records.</p>
                  ) : (
                    analytics.genderDistribution.map((gender) => (
                      <p
                        key={gender.gender}
                        style={{ ...listItemStyle, textTransform: 'capitalize' }}
                      >
                        {gender.gender}:{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{gender.count}</strong>
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

function CenteredShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--auth-bg)',
      }}
    >
      <div
        style={{
          ...panelStyle,
          maxWidth: 460,
          width: '100%',
          padding: 22,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              marginBottom: 12,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              boxShadow: 'var(--shadow-brand-indigo-md)',
            }}
          >
            <ShieldCheck size={22} color="#FFFFFF" />
          </div>
          <h1 style={{ ...sectionTitleStyle, marginBottom: 4 }}>{title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'grid' }}>{children}</div>
      </div>
    </div>
  );
}

function LoaderLabel({ label }: { label: string }) {
  return (
    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
      {label}
    </p>
  );
}

function MiniMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: '12px 13px',
        borderRadius: 14,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: accent,
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {icon}
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 900 }}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 8,
        background: 'color-mix(in srgb, var(--surface) 74%, transparent)',
      }}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 3px' }}>{label}</p>
      <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

const cellStyle: CSSProperties = {
  padding: '8px 6px',
  fontSize: 13,
  color: 'var(--text-primary)',
};

const listHeadingStyle: CSSProperties = {
  margin: '0 0 6px',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 700,
};

const listEmptyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text-secondary)',
  fontSize: 12,
};

const listItemStyle: CSSProperties = {
  margin: '0 0 5px',
  color: 'var(--text-secondary)',
  fontSize: 12,
};
