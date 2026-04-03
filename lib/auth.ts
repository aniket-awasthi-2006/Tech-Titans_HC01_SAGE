import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'opd_session';
export const ADMIN_COOKIE_NAME = 'opd_admin_session';

const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export interface JWTPayload {
  id: string;
  email: string;
  role: 'patient' | 'reception' | 'doctor';
  name: string;
}

export interface AdminSessionPayload {
  role: 'admin';
  scope: 'control-panel';
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong value (at least 32 characters).');
  }
  return secret;
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

function extractBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1]?.trim();
  return token || null;
}

export function signToken(
  payload: JWTPayload,
  expiresIn: SignOptions['expiresIn'] = '7d'
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function signAdminToken(
  payload: AdminSessionPayload,
  expiresIn: SignOptions['expiresIn'] = '8h'
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string): AdminSessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminSessionPayload;
    if (payload.role !== 'admin' || payload.scope !== 'control-panel') return null;
    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): JWTPayload | null {
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) {
    const cookieUser = verifyToken(cookieToken);
    if (cookieUser) return cookieUser;
  }

  const bearerToken = extractBearerToken(req);
  if (!bearerToken) return null;
  return verifyToken(bearerToken);
}

export function getAdminFromRequest(req: NextRequest): AdminSessionPayload | null {
  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!adminToken) return null;
  return verifyAdminToken(adminToken);
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    ...getCookieOptions(USER_SESSION_MAX_AGE_SECONDS),
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    ...getCookieOptions(0),
  });
}

export function setAdminCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    ...getCookieOptions(ADMIN_SESSION_MAX_AGE_SECONDS),
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    ...getCookieOptions(0),
  });
}

export function requireRole(
  req: NextRequest,
  allowedRoles: Array<'patient' | 'reception' | 'doctor'>
): { user: JWTPayload } | { error: string; status: number } {
  const user = getTokenFromRequest(req);
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!allowedRoles.includes(user.role)) return { error: 'Forbidden', status: 403 };
  return { user };
}
