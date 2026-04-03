import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAdminFromRequest } from '@/lib/auth';
import { validateStaffPassword } from '@/lib/password-policy';

function isStaffRole(role: string): role is 'doctor' | 'reception' {
  return role === 'doctor' || role === 'reception';
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const staff = await User.find({ role: { $in: ['doctor', 'reception'] } })
      .select('name email role hospitalId specialization isAvailable createdAt')
      .sort({ role: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('[Admin Staff GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const role = String(body?.role || '').trim().toLowerCase();
    const hospitalId = body?.hospitalId ? String(body.hospitalId).trim() : undefined;
    const specialization = body?.specialization ? String(body.specialization).trim() : undefined;

    if (!name || !email || !password || !isStaffRole(role)) {
      return NextResponse.json({ error: 'Name, email, password, and valid role are required.' }, { status: 400 });
    }

    const passwordError = validateStaffPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    await connectDB();
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
    }

    if (hospitalId) {
      const existingHospitalId = await User.findOne({ hospitalId, role: { $in: ['doctor', 'reception'] } });
      if (existingHospitalId) {
        return NextResponse.json({ error: 'Staff ID already exists.' }, { status: 409 });
      }
    }

    const created = await User.create({
      name,
      email,
      password,
      role,
      hospitalId,
      specialization: role === 'doctor' ? specialization : undefined,
      isAvailable: role === 'doctor' ? body?.isAvailable !== false : undefined,
    });

    const safe = created.toObject();

    return NextResponse.json(
      {
        staff: {
          _id: created._id.toString(),
          name: safe.name,
          email: safe.email,
          role: safe.role,
          hospitalId: safe.hospitalId || '',
          specialization: safe.specialization || '',
          isAvailable: safe.isAvailable ?? true,
          createdAt: safe.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Staff POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
