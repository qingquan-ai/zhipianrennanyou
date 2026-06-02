import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { users } from '@/db/schema';
import { buildPagination, type AdminListParams, type PaginationMeta } from '@/lib/admin/query';

export type AdminUserListItem = {
  id: string;
  email: string;
  nickname: string;
  status: string;
  createdAt: string;
};

export type AdminUsersResult = {
  rows: AdminUserListItem[];
  pagination: PaginationMeta;
  statusOptions: string[];
  source: {
    ok: boolean;
    message?: string;
  };
};

type UserSelectRow = typeof users.$inferSelect;

const USER_STATUS_DEFAULTS = ['active', 'inactive', 'suspended', 'banned'];

export async function getAdminUsers(params: AdminListParams): Promise<AdminUsersResult> {
  const empty = emptyUsersResult(params);
  if (!hasDatabaseUrl()) {
    return {
      ...empty,
      source: {
        ok: false,
        message: '未配置 DATABASE_URL/POSTGRES_URL，无法读取真实 users 表。',
      },
    };
  }

  try {
    const { db } = await import('@/db');
    const where = buildUsersWhere(params);

    let countQuery = db.select({ value: count() }).from(users).$dynamic();
    if (where) countQuery = countQuery.where(where);
    const countRows = await countQuery;
    const total = Number(countRows[0]?.value || 0);
    const pagination = buildPagination({ page: params.page, pageSize: params.pageSize, total });

    let rowsQuery = db.select().from(users).$dynamic();
    if (where) rowsQuery = rowsQuery.where(where);
    const rows = await rowsQuery
      .orderBy(desc(users.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    return {
      rows: rows.map(mapAdminUser),
      pagination,
      statusOptions: await getUserStatusOptions(),
      source: {
        ok: true,
      },
    };
  } catch (error) {
    return {
      ...empty,
      source: {
        ok: false,
        message: `users 表读取失败：${getErrorMessage(error)}`,
      },
    };
  }
}

export async function updateAdminUserStatus(id: string, status: string): Promise<void> {
  const cleanStatus = status.trim().slice(0, 60);
  if (!id || !cleanStatus) throw new Error('缺少要更新的用户状态。');

  const { db } = await import('@/db');
  const updated = await db
    .update(users)
    .set({
      status: cleanStatus,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (updated.length === 0) {
    throw new Error('没有找到要更新的用户。');
  }
}

export function mapAdminUser(row: Pick<UserSelectRow, 'id' | 'email' | 'nickname' | 'status' | 'createdAt'>): AdminUserListItem {
  return {
    id: row.id,
    email: row.email || '',
    nickname: row.nickname || '',
    status: row.status,
    createdAt: formatDate(row.createdAt),
  };
}

export function buildUserStatusOptions(statuses: string[]): string[] {
  return Array.from(
    new Set([
      ...USER_STATUS_DEFAULTS,
      ...statuses.map((status) => status.trim()).filter(Boolean),
    ]),
  );
}

async function getUserStatusOptions(): Promise<string[]> {
  const { db } = await import('@/db');
  const rows = await db
    .selectDistinct({ status: users.status })
    .from(users)
    .orderBy(users.status);

  return buildUserStatusOptions(rows.map((row) => row.status));
}

function buildUsersWhere(params: AdminListParams): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.search) {
    const keyword = `%${params.search}%`;
    const searchCondition = or(
      ilike(users.email, keyword),
      ilike(users.nickname, keyword),
    );

    if (searchCondition) conditions.push(searchCondition);
  }

  if (params.status) {
    conditions.push(eq(users.status, params.status));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function emptyUsersResult(params: AdminListParams): AdminUsersResult {
  return {
    rows: [],
    pagination: buildPagination({ page: params.page, pageSize: params.pageSize, total: 0 }),
    statusOptions: USER_STATUS_DEFAULTS,
    source: {
      ok: false,
    },
  };
}

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
