import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { setAuthCookie, signToken } from '@/lib/auth';

type MongoLikeError = {
  code?: number;
  message?: string;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
};

function isDuplicateEmailIndexError(error: unknown) {
  const mongoError = error as MongoLikeError;
  const message = String(mongoError?.message || '');
  const keyPattern = mongoError?.keyPattern || {};
  return (
    mongoError?.code === 11000 &&
    (Boolean(keyPattern.email) || /email_1/i.test(message))
  );
}

function parseCreateUserError(error: unknown): { status: number; message: string } | null {
  const mongoError = error as MongoLikeError;
  const message = String(mongoError?.message || '');
  const keyPattern = mongoError?.keyPattern || {};
  const keyValue = mongoError?.keyValue || {};

  if (mongoError?.code === 11000) {
    if (keyPattern.phone || keyValue.phone) {
      return { status: 409, message: 'Phone number already registered' };
    }
    if (keyPattern.email || keyValue.email) {
      return { status: 409, message: 'Email already registered' };
    }
    return { status: 409, message: 'An account with these details already exists' };
  }

  if (/validation/i.test(message)) {
    return { status: 400, message: 'Please check the registration details and try again' };
  }

  return null;
}

async function ensureSparseEmailIndex() {
  const users = User.collection;
  const indexes = await users.indexes();
  const emailIndex = indexes.find((idx) => idx.name === 'email_1');

  if (emailIndex?.unique && emailIndex?.sparse) return;

  if (emailIndex) {
    await users.dropIndex('email_1');
  }

  await users.createIndex({ email: 1 }, { name: 'email_1', unique: true, sparse: true });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = body?.email ? String(body.email).trim().toLowerCase() : '';
    const phone = body?.phone ? String(body.phone).trim() : '';
    const password = String(body?.password || '');
    const requestedRole = body?.role ? String(body.role).trim().toLowerCase() : 'patient';

    // Public registration endpoint is patient-only.
    if (requestedRole !== 'patient') {
      return NextResponse.json({ error: 'Only patient self-registration is allowed here.' }, { status: 403 });
    }

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required for patient registration' }, { status: 400 });
    }

    // Check uniqueness
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
      }
    }

    const userPayload = {
      name,
      ...(email ? { email: email.toLowerCase() } : {}),
      ...(phone ? { phone } : {}),
      password,
      role: 'patient' as const,
    };

    let user;
    try {
      user = await User.create(userPayload);
    } catch (createError) {
      // One-time self-heal for legacy DBs where `email_1` is unique but not sparse.
      if (!email && isDuplicateEmailIndexError(createError)) {
        try {
          await ensureSparseEmailIndex();
          user = await User.create(userPayload);
        } catch (retryError) {
          const parsedRetry = parseCreateUserError(retryError);
          if (parsedRetry) {
            return NextResponse.json({ error: parsedRetry.message }, { status: parsedRetry.status });
          }
          throw retryError;
        }
      } else {
        const parsedCreate = parseCreateUserError(createError);
        if (parsedCreate) {
          return NextResponse.json({ error: parsedCreate.message }, { status: parsedCreate.status });
        }
        throw createError;
      }
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email || '',
      role: 'patient' as const,
      name: user.name,
    };
    const token = signToken(tokenPayload);

    const response = NextResponse.json(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email || null,
          phone: user.phone || null,
          role: user.role,
        },
      },
      { status: 201 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('[Auth Register]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
