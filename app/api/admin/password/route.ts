import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminCredential from '@/models/AdminCredential';
import { getAdminFromRequest, setAdminCookie, signAdminToken } from '@/lib/auth';
import { validateAdminPassword } from '@/lib/password-policy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');

export async function PATCH(req: NextRequest) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All password fields are required.' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password.' }, { status: 400 });
    }

    const policyError = validateAdminPassword(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    await connectDB();
    const settings = await AdminCredential.findOne({ key: 'singleton' });
    if (!settings?.passwordHash) {
      return NextResponse.json({ error: 'Admin is not initialized.' }, { status: 428 });
    }

    const currentValid = await bcrypt.compare(currentPassword, settings.passwordHash);
    if (!currentValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    settings.passwordHash = await bcrypt.hash(newPassword, 12);
    settings.passwordUpdatedAt = new Date();
    await settings.save();

    // Rotate admin session after password update.
    const rotatedToken = signAdminToken({ role: 'admin', scope: 'control-panel' });
    const response = NextResponse.json({ ok: true });
    setAdminCookie(response, rotatedToken);
    return response;
  } catch (error) {
    console.error('[Admin Password PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
