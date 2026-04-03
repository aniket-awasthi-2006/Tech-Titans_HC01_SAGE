import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminCredential from '@/models/AdminCredential';
import { setAdminCookie, signAdminToken } from '@/lib/auth';
import { validateAdminPassword } from '@/lib/password-policy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!password || !confirmPassword) {
      return NextResponse.json({ error: 'Password and confirm password are required.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const passwordError = validateAdminPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    await connectDB();
    const existing = await AdminCredential.findOne({ key: 'singleton' });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: 'Admin password is already initialized.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await AdminCredential.findOneAndUpdate(
      { key: 'singleton' },
      {
        $set: {
          key: 'singleton',
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = signAdminToken({ role: 'admin', scope: 'control-panel' });
    const response = NextResponse.json({ ok: true, initialized: true });
    setAdminCookie(response, token);
    return response;
  } catch (error) {
    console.error('[Admin Setup POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
