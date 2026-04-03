import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Token from '@/models/Token';
import { getAdminFromRequest } from '@/lib/auth';
import { validateStaffPassword } from '@/lib/password-policy';

type Params = { id: string };

function isStaffRole(role: string): role is 'doctor' | 'reception' {
  return role === 'doctor' || role === 'reception';
}

function toSafeStaff(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  hospitalId?: string;
  specialization?: string;
  isAvailable?: boolean;
  createdAt: unknown;
  updatedAt?: unknown;
}) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId || '',
    specialization: user.specialization || '',
    isAvailable: user.isAvailable ?? true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid staff ID.' }, { status: 400 });
    }

    await connectDB();
    const staff = await User.findOne({ _id: id, role: { $in: ['doctor', 'reception'] } });
    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found.' }, { status: 404 });
    }

    const body = await req.json();
    const nextName = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const nextEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const nextPassword = typeof body?.password === 'string' ? body.password : undefined;
    const nextRole = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : undefined;
    const nextHospitalId = typeof body?.hospitalId === 'string' ? body.hospitalId.trim() : undefined;
    const nextSpecialization =
      typeof body?.specialization === 'string' ? body.specialization.trim() : undefined;
    const hasAvailability = typeof body?.isAvailable === 'boolean';

    if (typeof nextRole !== 'undefined' && !isStaffRole(nextRole)) {
      return NextResponse.json({ error: 'Role must be doctor or reception.' }, { status: 400 });
    }

    if (nextName !== undefined) {
      if (!nextName) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      staff.name = nextName;
    }

    if (nextEmail !== undefined) {
      if (!nextEmail) return NextResponse.json({ error: 'Email cannot be empty.' }, { status: 400 });
      const existingEmail = await User.findOne({ email: nextEmail, _id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
      }
      staff.email = nextEmail;
    }

    if (nextHospitalId !== undefined) {
      if (nextHospitalId) {
        const existingHospitalId = await User.findOne({
          hospitalId: nextHospitalId,
          _id: { $ne: id },
          role: { $in: ['doctor', 'reception'] },
        });
        if (existingHospitalId) {
          return NextResponse.json({ error: 'Staff ID already exists.' }, { status: 409 });
        }
      }
      staff.hospitalId = nextHospitalId || undefined;
    }

    if (nextRole !== undefined) {
      staff.role = nextRole;
      if (nextRole === 'reception') {
        staff.specialization = undefined;
        staff.isAvailable = true;
      }
    }

    if (nextSpecialization !== undefined && (nextRole || staff.role) === 'doctor') {
      staff.specialization = nextSpecialization || undefined;
    }

    if (hasAvailability && staff.role === 'doctor') {
      staff.isAvailable = body.isAvailable;
    }

    if (nextPassword !== undefined && nextPassword.length > 0) {
      const passwordError = validateStaffPassword(nextPassword);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      staff.password = nextPassword;
    }

    await staff.save();
    return NextResponse.json({ staff: toSafeStaff(staff.toObject()) });
  } catch (error) {
    console.error('[Admin Staff PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid staff ID.' }, { status: 400 });
    }

    await connectDB();
    const staff = await User.findOne({ _id: id, role: { $in: ['doctor', 'reception'] } })
      .select('role name')
      .lean();
    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found.' }, { status: 404 });
    }

    if (staff.role === 'doctor') {
      const activeTokenCount = await Token.countDocuments({
        doctorId: id,
        status: { $in: ['waiting', 'in-progress'] },
      });
      if (activeTokenCount > 0) {
        return NextResponse.json(
          { error: `Doctor has ${activeTokenCount} active queue token(s). Resolve them before deletion.` },
          { status: 409 }
        );
      }
    }

    await User.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Admin Staff DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
