import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_SESSION_COOKIE = 'admin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  role: 'admin';
  expiresAt: number;
};

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return session;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isAdminAuthConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  return session;
}

export function verifyAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  return secureCompare(input, password);
}

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken({ role: 'admin', expiresAt }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 0,
  });
}

function createSessionToken(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): AdminSession | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !secureCompare(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<AdminSession>;

    if (session.role !== 'admin') return null;
    if (typeof session.expiresAt !== 'number' || session.expiresAt < Date.now()) return null;

    return {
      role: 'admin',
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  // TODO: Replace this env-password guard with the project's real auth/role system once it exists.
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
