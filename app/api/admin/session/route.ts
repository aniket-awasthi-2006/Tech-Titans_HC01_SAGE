import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminCredential from '@/models/AdminCredential';
import { clearAdminCookie, getAdminFromRequest, setAdminCookie, signAdminToken } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');

type AttemptState = { failures: number; blockedUntil: number };

const RATE_LIMIT_MAX_FAILURES = 5;
const RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;

function getAttemptStore() {
  const g = global as typeof global & { __adminLoginAttempts?: Map<string, AttemptState> };
  if (!g.__adminLoginAttempts) {
    g.__adminLoginAttempts = new Map<string, AttemptState>();
  }
  return g.__adminLoginAttempts;
}

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(clientKey: string) {
  const store = getAttemptStore();
  const state = store.get(clientKey);
  if (!state) return { blocked: false as const };

  if (state.blockedUntil > Date.now()) {
    const retryAfterSeconds = Math.ceil((state.blockedUntil - Date.now()) / 1000);
    return { blocked: true as const, retryAfterSeconds };
  }

  return { blocked: false as const };
}

function recordFailure(clientKey: string) {
  const store = getAttemptStore();
  const state = store.get(clientKey) || { failures: 0, blockedUntil: 0 };
  state.failures += 1;

  if (state.failures >= RATE_LIMIT_MAX_FAILURES) {
    state.blockedUntil = Date.now() + RATE_LIMIT_BLOCK_MS;
    state.failures = 0;
  }

  store.set(clientKey, state);
}

function clearFailures(clientKey: string) {
  getAttemptStore().delete(clientKey);
}

export async function GET(req: NextRequest) {
  await connectDB();
  const settings = await AdminCredential.findOne({ key: 'singleton' })
    .select('passwordHash')
    .lean();

  const initialized = Boolean(settings?.passwordHash);
  const authenticated = initialized && Boolean(getAdminFromRequest(req));

  return NextResponse.json(
    { initialized, authenticated },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientKey = getClientKey(req);
    const rateLimitState = checkRateLimit(clientKey);
    if (rateLimitState.blocked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.', retryAfter: rateLimitState.retryAfterSeconds },
        { status: 429 }
      );
    }

    const body = await req.json();
    const password = String(body?.password || '');
    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    await connectDB();
    const settings = await AdminCredential.findOne({ key: 'singleton' });
    if (!settings?.passwordHash) {
      return NextResponse.json(
        { error: 'Admin password is not set yet. Complete first-time setup first.' },
        { status: 428 }
      );
    }

    const valid = await bcrypt.compare(password, settings.passwordHash);
    if (!valid) {
      recordFailure(clientKey);
      return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
    }

    clearFailures(clientKey);
    const token = signAdminToken({ role: 'admin', scope: 'control-panel' });
    const response = NextResponse.json({ ok: true });
    setAdminCookie(response, token);
    return response;
  } catch (error) {
    console.error('[Admin Session POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminCookie(response);
  return response;
}
