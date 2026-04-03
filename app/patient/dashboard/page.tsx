'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSocket } from '@/components/providers/SocketProvider';
import { calculateWaitTime, formatWaitTime } from '@/lib/wait-time';
import toast from 'react-hot-toast';
import {
  Hash, UserCircle, Users, Stethoscope, Clock, CheckCircle2,
  AlertCircle, CalendarDays, FileText,
  UserPlus, RefreshCw, Mars, Venus, CircleDot,
} from 'lucide-react';
import PrescriptionDisplay from '@/components/ui/PrescriptionDisplay';

interface Token {
  _id: string;
  tokenNumber: number;
  patientName: string;
  patientId?: string;
  bookedById?: string;
  relationship?: 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'other';
  patientGender?: 'male' | 'female' | 'other';
  status: 'waiting' | 'in-progress' | 'done' | 'cancelled';
  doctorId: { _id: string; name: string; specialization?: string } | string;
}

interface Consultation {
  _id: string;
  diagnosis: string;
  prescription: string;
  doctorName: string;
  date: string;
  notes?: string;
  patientName?: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
  isAvailable?: boolean;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Myself', spouse: 'Spouse', parent: 'Parent',
  child: 'Child', sibling: 'Sibling', other: 'Other',
};

const defaultJoinForm = {
  forSelf: true, familyName: '', familyRelationship: 'spouse',
  age: '', gender: '', doctorId: '',
};

export default function PatientDashboard() {
  const { user, token } = useAuth();
  const { socket } = useSocket();

  const [allTokens, setAllTokens]   = useState<Token[]>([]);
  const [myTokens, setMyTokens]     = useState<Token[]>([]);
  const [history, setHistory]       = useState<Consultation[]>([]);
  const [doctors, setDoctors]       = useState<Doctor[]>([]);
  const [avgDuration, setAvgDuration] = useState(10);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm]     = useState(defaultJoinForm);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isJoining, setIsJoining]   = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [animateQueue, setAnimateQueue] = useState(false);
  const [unavailableNotice, setUnavailableNotice] = useState<{ doctorId: string; doctorName: string } | null>(null);
  // Stable ref so socket handler always has fresh myTokens
  const myTokensRef = useRef<Token[]>([]);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [tRes, consRes, dRes] = await Promise.all([
        fetch('/api/tokens',            { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/consultations',     { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users?role=doctor', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [tData, consData, dData] = await Promise.all([tRes.json(), consRes.json(), dRes.json()]);

      const allT: Token[] = tData.tokens || [];
      setAllTokens(allT);
      const mt = allT.filter((t: Token) =>
        (t.bookedById === user.id || t.patientId === user.id) &&
        ['waiting', 'in-progress'].includes(t.status)
      );
      setMyTokens(mt);
      myTokensRef.current = mt;
      setHistory(consData.consultations || []);
      const doctorList: Doctor[] = dData.users || [];
      setDoctors(doctorList);
      setAvgDuration(consData.avgDuration || 10);

      const waitingMine = mt.filter(t => t.status === 'waiting');
      const unavailable = waitingMine
        .map((t) => {
          const tDocId = typeof t.doctorId === 'object' ? t.doctorId._id : t.doctorId;
          const doctor = doctorList.find(d => d._id === tDocId);
          return doctor && doctor.isAvailable === false
            ? { doctorId: doctor._id, doctorName: doctor.name }
            : null;
        })
        .find(Boolean) || null;
      setUnavailableNotice(unavailable);
    } catch { toast.error('Failed to load data'); }
    finally { setIsPageLoading(false); }
  }, [token, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { setAnimateQueue(true); setTimeout(() => setAnimateQueue(false), 600); fetchData(); };
    const handleAvailability = ({ doctorId, isAvailable, doctorName }: { doctorId: string; isAvailable: boolean; doctorName: string }) => {
      if (!isAvailable) {
        const affected = myTokensRef.current.some(t => {
          const tDocId = typeof t.doctorId === 'object' ? t.doctorId._id : t.doctorId;
          return tDocId === doctorId && t.status === 'waiting';
        });
        if (affected) setUnavailableNotice({ doctorId, doctorName });
      } else {
        setUnavailableNotice(prev => (prev?.doctorId === doctorId ? null : prev));
      }
      fetchData();
    };
    ['queue_updated','token_updated','token_created','doctor_called_next','consultation_completed'].forEach(e => socket.on(e, refresh));
    socket.on('doctor_availability_changed', handleAvailability);
    return () => {
      ['queue_updated','token_updated','token_created','doctor_called_next','consultation_completed'].forEach(e => socket.off(e, refresh));
      socket.off('doctor_availability_changed', handleAvailability);
    };
  }, [socket, fetchData]);

  const joinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinForm.gender)  { toast.error('Please select gender'); return; }
    if (!joinForm.doctorId){ toast.error('Please select a doctor'); return; }
    if (!joinForm.forSelf && !joinForm.familyName.trim()) { toast.error("Enter family member's name"); return; }

    setIsJoining(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          forSelf: joinForm.forSelf,
          familyName: joinForm.familyName,
          familyRelationship: joinForm.familyRelationship,
          patientAge: joinForm.age ? parseInt(joinForm.age) : undefined,
          patientGender: joinForm.gender,
          doctorId: joinForm.doctorId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Joined queue — Token #${data.token?.tokenNumber}`);
        setShowJoinModal(false); setJoinForm(defaultJoinForm); fetchData();
      } else { toast.error(data.error || 'Failed to join'); }
    } catch { toast.error('Network error'); }
    setIsJoining(false);
  };

  const leaveQueue = async (tokenId: string) => {
    if (!confirm('Leave the queue? Your token will be cancelled.')) return;
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) { toast.success('You have left the queue.'); fetchData(); }
      else {
        const d = await res.json();
        toast.error(d.error || 'Failed to leave queue');
      }
    } catch { toast.error('Network error'); }
  };

  const waiting = allTokens.filter(t => t.status === 'waiting');

  const getStatusInfo = (tok: Token, pos: number) => {
    if (tok.status === 'in-progress') return { text: 'Being seen now', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', Icon: Stethoscope };
    if (pos === 0) return { text: 'Next up — go to the doctor', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', Icon: AlertCircle };
    return { text: `${pos} ahead of you`, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Clock };
  };

  const GenderIcon = ({ g }: { g?: string }) => {
    if (g === 'male')   return <Mars   size={13} color="#60A5FA" />;
    if (g === 'female') return <Venus  size={13} color="#F472B6" />;
    return <CircleDot size={13} color="var(--text-secondary)" />;
  };

  const maskPatientName = (name: string) => {
    if (!name) return '';
    const safeName = name.trim();
    if (!safeName) return '';
    const hiddenCount = Math.max(0, Math.min(safeName.length - 1, 5));
    return `${safeName.charAt(0)}${'•'.repeat(hiddenCount)}`;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: isMobile ? '11px 12px' : '12px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-primary)', fontSize: isMobile ? 13 : 14, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.07em',
  };

  if (isPageLoading) return (
    <DashboardLayout title={`Hello, ${user?.name?.split(' ')[0] ?? ''}`} subtitle="Your OPD status" requiredRole="patient">
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: isMobile ? 40 : 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={`Hello, ${user?.name?.split(' ')[0]}`} subtitle="Your OPD status" requiredRole="patient">
      <div style={{ maxWidth: isMobile ? '100%' : 660, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>

        {/* ── Active Tokens ── */}
        {myTokens.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {myTokens.map(tok => {
              const pos = waiting.findIndex(w => w._id === tok._id);
              const wait = pos >= 0 ? calculateWaitTime(pos, avgDuration) : 0;
              const info = getStatusInfo(tok, pos);
              const doc = typeof tok.doctorId === 'object' ? tok.doctorId : null;
              const isSelf = tok.relationship === 'self' || tok.patientId === user?.id;

              return (
                <div key={tok._id} className={tok.status === 'in-progress' ? 'animate-pulse-glow' : ''} style={{
                  background: tok.status === 'in-progress' ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))' : 'rgba(255,255,255,0.04)',
                  border: tok.status === 'in-progress' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 20, padding: isMobile ? '18px 14px' : '28px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                }}>
                  {/* Who */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    {isSelf ? <UserCircle size={16} color="var(--text-secondary)" /> : <Users size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isSelf ? 'You (Self)' : `${tok.patientName} — ${RELATIONSHIP_LABELS[tok.relationship || 'other']}`}
                    </span>
                    {tok.patientGender && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        <GenderIcon g={tok.patientGender} /> {tok.patientGender}
                      </span>
                    )}
                  </div>

                  {/* Token # */}
                  <div className={animateQueue ? 'animate-count-up' : ''} style={{
                    fontSize: isMobile ? 'clamp(48px, 18vw, 62px)' : 80, fontWeight: 900, lineHeight: 1,
                    background: tok.status === 'in-progress' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16,
                  }}>
                    #{tok.tokenNumber}
                  </div>

                  {/* Doctor */}
                  {doc && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMobile ? '6px 12px' : '7px 16px', borderRadius: 30, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: isMobile ? 12 : 13, color: '#C4B5FD', marginBottom: 16, maxWidth: '100%', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'center' }}>
                      <Stethoscope size={14} /> {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ''}
                    </div>
                  )}

                  {/* Status */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMobile ? '8px 14px' : '9px 20px', borderRadius: 30, background: info.bg, border: `1px solid ${info.border}`, color: info.color, fontSize: isMobile ? 13 : 14, fontWeight: 600, marginBottom: tok.status === 'waiting' && pos >= 0 ? 20 : 0, textAlign: 'center' }}>
                    <info.Icon size={15} /> {info.text}
                  </div>

                  {/* Wait Stats */}
                  {tok.status === 'waiting' && pos >= 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {[
                        { label: 'Position',  value: `#${pos + 1}`,           color: '#6366F1' },
                        { label: 'Est. Wait', value: formatWaitTime(wait),    color: '#F59E0B' },
                        { label: 'In Queue',  value: waiting.length,          color: '#22C55E' },
                      ].map((s, i) => (
                        <div key={i} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                          <div style={{ fontSize: isMobile ? 19 : 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leave Queue button */}
                  {tok.status === 'waiting' && (
                    <div style={{ marginTop: 16 }}>
                      <button
                        onClick={() => leaveQueue(tok._id)}
                        style={{
                          padding: isMobile ? '8px 16px' : '8px 22px', borderRadius: 10,
                          border: '1px solid rgba(239,68,68,0.35)',
                          background: 'rgba(239,68,68,0.08)', color: '#FCA5A5',
                          fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        🚪 Leave Queue
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={() => { setJoinForm(defaultJoinForm); setShowJoinModal(true); }} style={{ padding: isMobile ? '11px 10px' : '12px', borderRadius: 12, border: '1px dashed rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.06)', color: 'var(--text-accent)', fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <UserPlus size={16} /> Add another family member
            </button>
          </div>
        ) : (
          /* Not in queue */
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: isMobile ? '28px 16px' : '40px 32px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Stethoscope size={32} color="#6366F1" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Not in Queue</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
              Join the OPD queue for yourself or a family member.
            </p>
            <button onClick={() => { setJoinForm(defaultJoinForm); setShowJoinModal(true); }} style={{ padding: isMobile ? '12px 22px' : '14px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white', fontSize: isMobile ? 14 : 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-brand-indigo-md)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} /> Join OPD Queue
            </button>
          </div>
        )}

        {/* ── Live Queue Snapshot ── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: isMobile ? '16px 14px' : '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 14 }}>
            <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} color="#22C55E" /> Live Queue
            </h3>
            <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#22C55E', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', padding: isMobile ? '3px 8px' : '3px 10px', borderRadius: 20 }}>
              {waiting.length} waiting
            </span>
          </div>
          {waiting.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? 12 : 13, textAlign: 'center', padding: '12px 0' }}>Queue is empty - walk straight in!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {waiting.slice(0, 6).map((t, i) => {
                const isMe = myTokens.some(m => m._id === t._id);
                return (
                  <div key={t._id} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto auto minmax(0,1fr)' : 'auto auto minmax(0,1fr) auto auto', alignItems: 'center', gap: isMobile ? 8 : 10, padding: isMobile ? '9px 9px' : '9px 12px', borderRadius: 10, background: isMe ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: isMe ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.04)' }}>
                    <Hash size={isMobile ? 12 : 14} color={i === 0 ? 'var(--text-accent)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: i === 0 ? 'var(--text-accent)' : 'var(--text-muted)', minWidth: isMobile ? 24 : 28 }}>{t.tokenNumber}</span>
                    <span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {maskPatientName(t.patientName)}
                      {isMe && <span style={{ marginLeft: 6, fontSize: isMobile ? 9 : 10, color: '#818CF8', fontWeight: 700 }}>(you)</span>}
                    </span>
                    <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, justifySelf: 'end', gridColumn: isMobile ? '2 / 4' : 'auto' }}>
                      <Clock size={11} /> ~{calculateWaitTime(i, avgDuration)}m
                    </span>
                    {i === 0 && <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: '#6366F1', background: 'rgba(99,102,241,0.15)', padding: isMobile ? '2px 6px' : '2px 8px', borderRadius: 20, justifySelf: 'end' }}>NEXT</span>}
                  </div>
                );
              })}
              {waiting.length > 6 && <p style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0' }}>+{waiting.length - 6} more</p>}
            </div>
          )}
        </div>

        {/* ── Consultation History ── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: isMobile ? '16px 14px' : '20px 24px' }}>
          <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="var(--text-secondary)" /> Consultation History
          </h3>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? 12 : 13, textAlign: 'center', padding: '12px 0' }}>No past consultations yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.slice(0, 5).map(c => (
                <div key={c._id} style={{ padding: isMobile ? '12px 11px' : '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CalendarDays size={11} /> {new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: isMobile ? 10 : 11, color: '#C4B5FD', fontWeight: 600 }}>{c.doctorName}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stethoscope size={13} color="var(--text-accent)" /> {c.diagnosis}
                  </div>
                  <div style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ marginTop: 2, flexShrink: 0 }}>💊</span>
                    <PrescriptionDisplay prescription={c.prescription} compact />
                  </div>
                  {c.notes && <div style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={12} /> {c.notes}
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Join Modal ── */}
      {showJoinModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? 12 : 20, overflowY: 'auto' }}
          onClick={e => e.target === e.currentTarget && setShowJoinModal(false)}>
          <div style={{ background: '#13192B', border: '1px solid rgba(99,102,241,0.25)', borderRadius: isMobile ? 16 : 22, padding: isMobile ? '18px 14px' : '30px 26px', width: '100%', maxWidth: 500, marginTop: isMobile ? 12 : 0, maxHeight: isMobile ? 'calc(100dvh - 24px)' : 'none', overflowY: isMobile ? 'auto' : 'visible', boxShadow: 'var(--shadow-surface-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: isMobile ? 16 : 22 }}>
              <h2 style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={isMobile ? 18 : 20} color="#6366F1" /> Join OPD Queue
              </h2>
              <button onClick={() => setShowJoinModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: isMobile ? 20 : 22, padding: 0 }}>✕</button>
            </div>

            <form onSubmit={joinQueue} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14 }}>
              {/* Self / Family toggle */}
              <div>
                <label style={labelStyle}>BOOKING FOR</label>
                <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                  {[{ val: true, label: 'Myself', Icon: UserCircle }, { val: false, label: 'Family Member', Icon: Users }].map(({ val, label, Icon }) => (
                    <button key={String(val)} type="button"
                      onClick={() => setJoinForm(f => ({ ...f, forSelf: val, familyName: '', familyRelationship: 'spouse' }))}
                      style={{ flex: 1, padding: isMobile ? '10px 8px' : '10px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: joinForm.forSelf === val ? '1.5px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.1)', background: joinForm.forSelf === val ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)', color: joinForm.forSelf === val ? 'var(--text-accent)' : 'var(--text-secondary)', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Icon size={isMobile ? 14 : 15} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Family fields */}
              {!joinForm.forSelf && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>FAMILY MEMBER NAME *</label>
                    <input type="text" placeholder="e.g. Sunita Sharma" value={joinForm.familyName} onChange={e => setJoinForm(f => ({ ...f, familyName: e.target.value }))} required={!joinForm.forSelf} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>RELATIONSHIP</label>
                    <select value={joinForm.familyRelationship} onChange={e => setJoinForm(f => ({ ...f, familyRelationship: e.target.value }))}
                      style={{ ...inputStyle, background: '#1A2035', cursor: 'pointer' }}>
                      {[['spouse','Spouse'],['parent','Parent'],['child','Child'],['sibling','Sibling'],['other','Other']].map(([v,l]) => (
                        <option key={v} value={v} style={{ background: '#1A2035' }}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Self name */}
              {joinForm.forSelf && (
                <div>
                  <label style={labelStyle}>PATIENT NAME</label>
                  <div style={{ ...inputStyle, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}>{user?.name}</div>
                </div>
              )}

              {/* Gender + Age */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>GENDER *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['male', Mars, '#60A5FA'], ['female', Venus, '#F472B6'], ['other', CircleDot, 'var(--text-secondary)']] as [string, React.ElementType, string][]).map(([v, Icon, col]) => (
                      <button key={v} type="button"
                        onClick={() => setJoinForm(f => ({ ...f, gender: v }))}
                        style={{ flex: 1, padding: isMobile ? '9px 2px' : '10px 4px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: joinForm.gender === v ? '1.5px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.1)', background: joinForm.gender === v ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)', color: joinForm.gender === v ? 'var(--text-accent)' : 'var(--text-secondary)', fontSize: isMobile ? 9 : 10, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <Icon size={isMobile ? 15 : 16} color={joinForm.gender === v ? col : 'var(--text-muted)'} />
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>AGE</label>
                  <input type="number" min="1" max="120" placeholder="e.g. 32" value={joinForm.age} onChange={e => setJoinForm(f => ({ ...f, age: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Doctor */}
              <div>
                <label style={labelStyle}>SELECT DOCTOR *</label>
                <select value={joinForm.doctorId} onChange={e => setJoinForm(f => ({ ...f, doctorId: e.target.value }))} required style={{ ...inputStyle, background: '#1A2035', cursor: 'pointer' }}>
                  <option value="">Choose a doctor...</option>
                  {doctors.map(d => (
                    <option key={d._id} value={d._id} style={{ background: '#1A2035' }}>
                      {d.name}{d.specialization ? ` — ${d.specialization}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: 10, marginTop: 2 }}>
                <button type="button" onClick={() => setShowJoinModal(false)} style={{ flex: 1, width: '100%', padding: isMobile ? '12px' : '13px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isJoining} style={{ flex: 2, width: '100%', padding: isMobile ? '12px' : '13px', borderRadius: 10, border: 'none', background: isJoining ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white', fontSize: isMobile ? 13 : 14, fontWeight: 700, cursor: isJoining ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isJoining ? (<><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Joining...</>) : (<><CheckCircle2 size={16} /> Join Queue</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Doctor Unavailability Emergency Notice ── */}
      {unavailableNotice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 14 : 24,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1A0A0A, #1A0808)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: isMobile ? 18 : 24, padding: isMobile ? '26px 18px' : '40px 36px', textAlign: 'center',
            maxWidth: 440, width: '100%',
            boxShadow: 'var(--shadow-danger-xl)',
          }}>
            <div style={{ fontSize: isMobile ? 44 : 56, marginBottom: 16 }}>🚨</div>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#FCA5A5', marginBottom: 12 }}>
              Doctor Is Currently Unavailable
            </h2>
            <p style={{ fontSize: isMobile ? 13 : 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{unavailableNotice.doctorName}</strong> is currently unavailable.
              Queue updates will resume automatically once the doctor is available again.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

