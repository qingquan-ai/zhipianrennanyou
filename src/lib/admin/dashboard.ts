import { count } from 'drizzle-orm';

import type { AdminDashboard, AdminMetric } from '@/lib/admin/data';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return {
      metrics: [],
      sourceMessages: ['未配置 DATABASE_URL/POSTGRES_URL，后台不会读取或伪造业务数据。'],
    };
  }

  try {
    const { db } = await import('@/db');
    const { chatMessages, chatSessions, users } = await import('@/db/schema');
    const [userCount, sessionCount, messageCount] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(chatSessions),
      db.select({ value: count() }).from(chatMessages),
    ]);

    return {
      metrics: [
        metric('用户数', userCount[0]?.value || 0),
        metric('会话数', sessionCount[0]?.value || 0),
        metric('消息数', messageCount[0]?.value || 0),
      ],
      sourceMessages: [],
    };
  } catch (error) {
    return {
      metrics: [],
      sourceMessages: [`后台概览读取失败：${getErrorMessage(error)}`],
    };
  }
}

function metric(label: string, value: number): AdminMetric {
  return {
    label,
    value: new Intl.NumberFormat('zh-CN').format(value),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
