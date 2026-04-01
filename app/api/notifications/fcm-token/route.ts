import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getTokenFromRequest } from '@/lib/auth';

function getTokenFromBody(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const token = (body as { fcmToken?: unknown }).fcmToken;
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 20 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fcmToken = getTokenFromBody(body);
    if (!fcmToken) {
      return NextResponse.json({ error: 'Valid fcmToken is required' }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(user.id, { $addToSet: { fcmTokens: fcmToken } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[FCM Token POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fcmToken = getTokenFromBody(body);
    if (!fcmToken) {
      return NextResponse.json({ error: 'Valid fcmToken is required' }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(user.id, { $pull: { fcmTokens: fcmToken } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[FCM Token DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
