'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthConfigured,
  requireAdmin,
  verifyAdminPassword,
} from '@/lib/admin/auth';
import { updateAdminOrderStatus } from '@/lib/admin/data';
import { updateAdminUserStatus } from '@/lib/admin/users';

export async function loginAdminAction(formData: FormData): Promise<void> {
  const returnTo = sanitizeAdminReturnTo(getFormString(formData, 'returnTo')) || '/admin';

  if (!isAdminAuthConfigured()) {
    redirect('/admin/login?error=not-configured');
  }

  if (!verifyAdminPassword(getFormString(formData, 'password'))) {
    redirect(`/admin/login?error=invalid&returnTo=${encodeURIComponent(returnTo)}`);
  }

  await createAdminSession();
  redirect(returnTo);
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function updateUserStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const returnTo = sanitizeAdminReturnTo(getFormString(formData, 'returnTo')) || '/admin/users';
  const id = getFormString(formData, 'id');
  const status = getFormString(formData, 'status');
  let error = '';

  try {
    await updateAdminUserStatus(id, status);
    revalidatePath('/admin/users');
    revalidatePath('/admin');
  } catch (caught) {
    error = getErrorMessage(caught);
  }

  redirect(withFeedback(returnTo, error ? { error } : { notice: 'updated' }));
}

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const returnTo = sanitizeAdminReturnTo(getFormString(formData, 'returnTo')) || '/admin/orders';
  const id = getFormString(formData, 'id');
  const status = getFormString(formData, 'status');
  let error = '';

  try {
    await updateAdminOrderStatus(id, status);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${encodeURIComponent(id)}`);
    revalidatePath('/admin');
  } catch (caught) {
    error = getErrorMessage(caught);
  }

  redirect(withFeedback(returnTo, error ? { error } : { notice: 'updated' }));
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function sanitizeAdminReturnTo(value: string): string {
  if (!value.startsWith('/admin')) return '';
  if (value.startsWith('/admin/login')) return '';
  return value;
}

function withFeedback(path: string, feedback: { notice?: string; error?: string }): string {
  const url = new URL(path, 'http://admin.local');
  url.searchParams.delete('notice');
  url.searchParams.delete('error');

  if (feedback.notice) url.searchParams.set('notice', feedback.notice);
  if (feedback.error) url.searchParams.set('error', feedback.error.slice(0, 160));

  return `${url.pathname}${url.search}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
