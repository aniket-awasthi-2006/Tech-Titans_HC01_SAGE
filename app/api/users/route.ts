import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getTokenFromRequest, requireRole } from '@/lib/auth';

const SAFE_SELECT_BY_ROLE: Record<'doctor' | 'reception' | 'patient', string> = {
  doctor: 'name email role hospitalId specialization isAvailable createdAt',
  reception: 'name email role hospitalId createdAt',
  patient: 'name email phone role createdAt',
};

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'doctor').toLowerCase();
    const search = (searchParams.get('search') || '').trim();

    const allowedRolesByUser: Record<typeof user.role, string[]> = {
      patient: ['doctor'],
      doctor: ['doctor'],
      reception: ['doctor', 'patient', 'reception'],
    };

    if (!allowedRolesByUser[user.role].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { role };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const select =
      SAFE_SELECT_BY_ROLE[role as keyof typeof SAFE_SELECT_BY_ROLE] || SAFE_SELECT_BY_ROLE.doctor;

    const users = await User.find(query).select(select).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[Users GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = requireRole(req, ['reception']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const role = String(body?.role || '').toLowerCase();
    const specialization = body?.specialization ? String(body.specialization).trim() : undefined;
    const hospitalId = body?.hospitalId ? String(body.hospitalId).trim() : undefined;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    if (role !== 'doctor') {
      return NextResponse.json(
        { error: 'Reception can only add doctor profiles from this endpoint.' },
        { status: 403 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      specialization,
      ...(hospitalId ? { hospitalId } : {}),
    });
    const userObj = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = userObj as typeof userObj & { password: string };

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error('[Users POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
