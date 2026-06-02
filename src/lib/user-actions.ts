'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { users } from '@/db/schema';
import {
  createUserSession,
  hashPassword,
  logoutUser,
  verifyPassword,
} from '@/lib/user-auth';

export async function registerUserAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(getFormString(formData, 'email'));
  const password = getFormString(formData, 'password');
  const nickname = getFormString(formData, 'nickname').trim().slice(0, 60);

  if (!email) redirect('/register?error=email-required');
  if (password.length < 6) redirect('/register?error=password-too-short');

  const { db } = await import('@/db');
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    redirect('/register?error=email-exists');
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      nickname: nickname || null,
      passwordHash: await hashPassword(password),
      status: 'active',
      updatedAt: new Date(),
    })
    .returning({ id: users.id });

  if (!user?.id) {
    redirect('/register?error=failed');
  }

  await createUserSession(user.id);
  redirect('/');
}

export async function loginUserAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(getFormString(formData, 'email'));
  const password = getFormString(formData, 'password');

  if (!email || !password) redirect('/login?error=invalid');

  const { db } = await import('@/db');
  const [user] = await db
    .select({
      id: users.id,
      status: users.status,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.status !== 'active') {
    redirect('/login?error=invalid');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    redirect('/login?error=invalid');
  }

  await createUserSession(user.id);
  redirect('/');
}

export async function logoutUserAction(): Promise<void> {
  await logoutUser();
  redirect('/login');
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}
