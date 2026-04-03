'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import Link from 'next/link';
import Image from 'next/image';
import SupportChatbot from '@/components/ui/SupportChatbot';
import ThemeToggle from '@/components/ui/ThemeToggle';

const roles = [
  {
    key: 'patient',
    label: 'Patient',
    icon: '🙋',
    desc: 'Join the queue, track your position & view prescriptions',
    gradient: 'linear-gradient(135deg, #06B6D4, #0EA5E9)',
    hoverShadow: 'var(--shadow-brand-cyan-md)',
    lightHoverShadow: '0 18px 40px rgba(14,165,233,0.18)',
    iconShadow: 'var(--shadow-brand-cyan-md)',
    pillShadow: 'var(--shadow-brand-cyan-sm)',
    border: 'rgba(6,182,212,0.3)',
    lightBorder: 'rgba(6,182,212,0.34)',
    href: '/login/patient',
  },
  {
    key: 'reception',
    label: 'Receptionist',
    icon: '🏥',
    desc: 'Manage tokens, intake forms & the live OPD queue',
    gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    hoverShadow: 'var(--shadow-brand-indigo-md)',
    lightHoverShadow: '0 18px 40px rgba(37,99,235,0.18)',
    iconShadow: 'var(--shadow-brand-indigo-md)',
    pillShadow: 'var(--shadow-brand-indigo-sm)',
    border: 'rgba(99,102,241,0.3)',
    lightBorder: 'rgba(99,102,241,0.3)',
    href: '/login/reception',
  },
  {
    key: 'doctor',
    label: 'Doctor',
    icon: '👨‍⚕️',
    desc: 'View your queue, call patients & write prescriptions',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    hoverShadow: 'var(--shadow-brand-emerald-md)',
    lightHoverShadow: '0 18px 40px rgba(16,185,129,0.17)',
    iconShadow: 'var(--shadow-brand-emerald-md)',
    pillShadow: 'var(--shadow-brand-emerald-sm)',
    border: 'rgba(16,185,129,0.3)',
    lightBorder: 'rgba(16,185,129,0.3)',
    href: '/login/doctor',
  },
];

export default function LoginPortal() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const isLight = theme === 'light';
  const logoTapState = useRef({ count: 0, lastTapAt: 0 });

  useEffect(() => {
    if (!isLoading && user) {
      const map: Record<string, string> = {
        reception: '/reception/dashboard',
        doctor: '/doctor/dashboard',
        patient: '/patient/dashboard',
      };
      router.replace(map[user.role] || '/login');
    }
  }, [user, isLoading, router]);

  const handleSecretAdminAccess = () => {
    const now = Date.now();
    const withinComboWindow = now - logoTapState.current.lastTapAt <= 900;

    logoTapState.current = {
      count: withinComboWindow ? logoTapState.current.count + 1 : 1,
      lastTapAt: now,
    };

    if (logoTapState.current.count >= 5) {
      logoTapState.current = { count: 0, lastTapAt: 0 };
      router.push('/admin');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--auth-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 4000 }}>
        <ThemeToggle />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ margin: '0 auto 20px', width: 96, height: 96 }}>
          <button
            type="button"
            onClick={handleSecretAdminAccess}
            aria-label="MediQueue logo"
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              borderRadius: 24,
            }}
          >
            <Image
              src="/logo.png"
              alt="MediQueue Logo"
              width={96}
              height={96}
              style={{ borderRadius: 24, boxShadow: 'var(--shadow-brand-indigo-lg)' }}
            />
          </button>
        </div>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 900,
            color: 'var(--text-primary)',
            marginBottom: 10,
            letterSpacing: '-0.02em',
          }}
        >
          MediQueue
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
          Real-time hospital queue management. Select your role to continue.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          width: '100%',
          maxWidth: 900,
        }}
      >
        {roles.map((role) => (
          <Link key={role.key} href={role.href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: 32,
                borderRadius: 20,
                background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isLight ? role.lightBorder : role.border}`,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = isLight
                  ? role.lightHoverShadow
                  : role.hoverShadow;
                (e.currentTarget as HTMLDivElement).style.background = isLight
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.background = isLight
                  ? 'rgba(255,255,255,0.82)'
                  : 'rgba(255,255,255,0.04)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: role.gradient,
                  opacity: 0.08,
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: role.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  margin: '0 auto 20px',
                  boxShadow: role.iconShadow,
                }}
              >
                {role.icon}
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                {role.label}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                {role.desc}
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  borderRadius: 30,
                  background: role.gradient,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: role.pillShadow,
                }}
              >
                Sign in as {role.label} →
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 40, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        New patient?{' '}
        <Link
          href="/register"
          style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}
        >
          Register here
        </Link>
      </p>

      <SupportChatbot />
    </div>
  );
}
