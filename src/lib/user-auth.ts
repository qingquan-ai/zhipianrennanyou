import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { users } from '@/db/schema';

export const USER_SESSION_COOKIE = 'user_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type UserSession = {
  userId: string;
  expiresAt: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  status: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function createUserSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  cookieStore.set(USER_SESSION_COOKIE, createSessionToken({ userId, expiresAt }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const { db } = await import('@/db');
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.status !== 'active') return null;

  return {
    id: user.id,
    email: user.email || '',
    nickname: user.nickname || '',
    avatarUrl: user.avatarUrl || '',
    status: user.status,
  };
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

function createSessionToken(session: UserSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): UserSession | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !secureCompare(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<UserSession>;

    if (!session.userId) return null;
    if (typeof session.expiresAt !== 'number' || session.expiresAt < Date.now()) return null;

    return {
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  const secret =
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'demo-user-session-secret';

  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
