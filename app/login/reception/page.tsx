'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function ReceptionLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--auth-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px',
    }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 4000 }}>
        <ThemeToggle />
      </div>

      {/* Back link */}
      <Link href="/login" style={{
        position: 'fixed', top: 24, left: 24,
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none',
        background: 'var(--theme-toggle-bg)',
        border: '1px solid var(--theme-toggle-border)',
        borderRadius: 10, padding: '8px 14px',
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#6366F1'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--theme-toggle-border)'; }}
      >
        ← Back
      </Link>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 20px',
            boxShadow: 'var(--shadow-brand-indigo-lg)',
          }}>🏥</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Reception Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Manage tokens, intake forms &amp; the live OPD queue
          </p>
        </div>

        {/* Info badge */}
        <div style={{
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔐</span>
          <span style={{ fontSize: 13, color: 'var(--text-accent)' }}>Staff access only — authorised personnel</span>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--auth-card-bg)',
          border: '1px solid var(--auth-card-border)',
          borderRadius: 24, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-surface-lg)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.04em' }}>
                STAFF EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="reception@hospital.com"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--input-text)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--input-border)'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--input-text)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.7)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--input-border)'; }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '12px 16px',
                color: '#FCA5A5', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : 'var(--shadow-brand-indigo-md)',
                transition: 'all 0.2s', letterSpacing: '0.01em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in as Receptionist →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
