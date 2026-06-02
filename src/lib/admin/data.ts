import type { PoolClient, QueryResultRow } from 'pg';

import {
  AdminListParams,
  OrderFieldMapping,
  PaginationMeta,
  UserFieldMapping,
  buildPagination,
  resolveOrderFieldMapping,
  resolveUserFieldMapping,
} from '@/lib/admin/query';

type PgPool = import('pg').Pool;

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
};

export type AdminSourceInfo = {
  ok: boolean;
  message?: string;
  table?: string;
  mapping?: Record<string, string | undefined>;
};

export type AdminMetric = {
  label: string;
  value: string;
  description?: string;
};

export type AdminListResult<T> = {
  rows: T[];
  pagination: PaginationMeta;
  statusOptions: string[];
  source: AdminSourceInfo;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
};

export type AdminOrderUser = {
  id: string;
  name: string;
  email: string;
};

export type AdminOrder = {
  id: string;
  orderNo: string;
  user: AdminOrderUser | null;
  amount?: string;
  status: string;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrder & {
  remark?: string;
  rawFields: Array<{
    name: string;
    value: string;
  }>;
  statusOptions: string[];
  source: AdminSourceInfo;
};

export type AdminDashboard = {
  metrics: AdminMetric[];
  sourceMessages: string[];
};

const USER_TABLE_CANDIDATES = ['users', 'user', 'profiles', 'profile'];
const ORDER_TABLE_CANDIDATES = ['orders', 'order'];
const USER_DEFAULT_STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'banned'];
const ORDER_DEFAULT_STATUS_OPTIONS = [
  'pending',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'refunded',
];
const RECENT_DAYS = 7;

let pool: PgPool | null = null;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const database = await getPool();
  if (!database) {
    return {
      metrics: [],
      sourceMessages: [missingDatabaseMessage()],
    };
  }

  const client = await database.connect();
  try {
    const sourceMessages: string[] = [];
    const metrics: AdminMetric[] = [];

    const userTable = await findTable(client, USER_TABLE_CANDIDATES);
    if (userTable) {
      const userColumns = await getColumns(client, userTable);
      const userMapping = resolveUserFieldMapping(userColumns.map((column) => column.column_name));
      metrics.push({
        label: '用户总数',
        value: formatInteger(await countRows(client, userTable)),
      });

      if (userMapping.createdAt) {
        metrics.push({
          label: '最近新增用户',
          value: formatInteger(await countRecentRows(client, userTable, userMapping.createdAt)),
          description: `近 ${RECENT_DAYS} 天`,
        });
      }
    } else {
      sourceMessages.push('未找到 users/profiles 用户表，已跳过用户指标。');
    }

    const orderTable = await findTable(client, ORDER_TABLE_CANDIDATES);
    if (orderTable) {
      const orderColumns = await getColumns(client, orderTable);
      const orderMapping = resolveOrderFieldMapping(orderColumns.map((column) => column.column_name));
      metrics.push({
        label: '订单总数',
        value: formatInteger(await countRows(client, orderTable)),
      });

      if (orderMapping.createdAt) {
        metrics.push({
          label: '最近订单数',
          value: formatInteger(await countRecentRows(client, orderTable, orderMapping.createdAt)),
          description: `近 ${RECENT_DAYS} 天`,
        });
      }

      if (orderMapping.amount && isNumericColumn(orderColumns, orderMapping.amount)) {
        metrics.push({
          label: '总成交额',
          value: formatAmount(await sumColumn(client, orderTable, orderMapping.amount)),
        });
      }
    } else {
      sourceMessages.push('未找到 orders 订单表，已跳过订单指标。');
    }

    return { metrics, sourceMessages };
  } catch (error) {
    return {
      metrics: [],
      sourceMessages: [`后台数据读取失败：${getErrorMessage(error)}`],
    };
  } finally {
    client.release();
  }
}

export async function getAdminUsers(
  params: AdminListParams,
): Promise<AdminListResult<AdminUser>> {
  const empty = emptyListResult<AdminUser>(params);
  const database = await getPool();
  if (!database) {
    return {
      ...empty,
      source: {
        ok: false,
        message: missingDatabaseMessage(),
      },
    };
  }

  const client = await database.connect();
  try {
    const table = await findTable(client, USER_TABLE_CANDIDATES);
    if (!table) {
      return {
        ...empty,
        source: {
          ok: false,
          message: '未找到 users/profiles 用户表。',
        },
      };
    }

    const columns = await getColumns(client, table);
    const mapping = resolveUserFieldMapping(columns.map((column) => column.column_name));
    if (!mapping.id) {
      return {
        ...empty,
        source: {
          ok: false,
          table,
          mapping,
          message: '用户表缺少可识别的 id 字段。',
        },
      };
    }

    const where: string[] = [];
    const values: unknown[] = [];
    addTextSearch(where, values, [mapping.name, mapping.email], params.search);
    addStatusFilter(where, values, mapping.status, params.status);

    const whereSql = buildWhereSql(where);
    const total = await countRows(client, table, whereSql, values);
    const pagination = buildPagination({ page: params.page, pageSize: params.pageSize, total });
    const limitPlaceholder = pushValue(values, pagination.pageSize);
    const offsetPlaceholder = pushValue(values, (pagination.page - 1) * pagination.pageSize);
    const rows = await client.query<QueryResultRow>(
      `SELECT * FROM ${quoteIdentifier(table)} ${whereSql} ${buildOrderSql(mapping.createdAt || mapping.id)} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      values,
    );

    return {
      rows: rows.rows.map((row) => mapUserRow(row, mapping)),
      pagination,
      statusOptions: await getStatusOptions(
        client,
        table,
        columns,
        mapping.status,
        USER_DEFAULT_STATUS_OPTIONS,
      ),
      source: {
        ok: true,
        table,
        mapping,
      },
    };
  } catch (error) {
    return {
      ...empty,
      source: {
        ok: false,
        message: `用户列表读取失败：${getErrorMessage(error)}`,
      },
    };
  } finally {
    client.release();
  }
}

export async function getAdminOrders(
  params: AdminListParams,
): Promise<AdminListResult<AdminOrder>> {
  const empty = emptyListResult<AdminOrder>(params);
  const database = await getPool();
  if (!database) {
    return {
      ...empty,
      source: {
        ok: false,
        message: missingDatabaseMessage(),
      },
    };
  }

  const client = await database.connect();
  try {
    const table = await findTable(client, ORDER_TABLE_CANDIDATES);
    if (!table) {
      return {
        ...empty,
        source: {
          ok: false,
          message: '未找到 orders 订单表。',
        },
      };
    }

    const columns = await getColumns(client, table);
    const mapping = resolveOrderFieldMapping(columns.map((column) => column.column_name));
    if (!mapping.id) {
      return {
        ...empty,
        source: {
          ok: false,
          table,
          mapping,
          message: '订单表缺少可识别的 id 字段。',
        },
      };
    }

    const userTable = await getUserTableInfo(client);
    const where: string[] = [];
    const values: unknown[] = [];
    await addOrderSearch(client, userTable, where, values, mapping, params.search);
    addStatusFilter(where, values, mapping.status, params.status);

    const whereSql = buildWhereSql(where);
    const total = await countRows(client, table, whereSql, values);
    const pagination = buildPagination({ page: params.page, pageSize: params.pageSize, total });
    const limitPlaceholder = pushValue(values, pagination.pageSize);
    const offsetPlaceholder = pushValue(values, (pagination.page - 1) * pagination.pageSize);
    const rows = await client.query<QueryResultRow>(
      `SELECT * FROM ${quoteIdentifier(table)} ${whereSql} ${buildOrderSql(mapping.createdAt || mapping.id)} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      values,
    );
    const usersById = await fetchUsersByIds(client, userTable, getOrderUserIds(rows.rows, mapping));

    return {
      rows: rows.rows.map((row) => mapOrderRow(row, mapping, usersById)),
      pagination,
      statusOptions: await getStatusOptions(
        client,
        table,
        columns,
        mapping.status,
        ORDER_DEFAULT_STATUS_OPTIONS,
      ),
      source: {
        ok: true,
        table,
        mapping,
      },
    };
  } catch (error) {
    return {
      ...empty,
      source: {
        ok: false,
        message: `订单列表读取失败：${getErrorMessage(error)}`,
      },
    };
  } finally {
    client.release();
  }
}

export async function getAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const database = await getPool();
  if (!database) return null;

  const client = await database.connect();
  try {
    const table = await findTable(client, ORDER_TABLE_CANDIDATES);
    if (!table) return null;

    const columns = await getColumns(client, table);
    const mapping = resolveOrderFieldMapping(columns.map((column) => column.column_name));
    if (!mapping.id) return null;

    const result = await client.query<QueryResultRow>(
      `SELECT * FROM ${quoteIdentifier(table)} WHERE CAST(${quoteIdentifier(mapping.id)} AS TEXT) = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;

    const userTable = await getUserTableInfo(client);
    const usersById = await fetchUsersByIds(client, userTable, getOrderUserIds([row], mapping));
    const order = mapOrderRow(row, mapping, usersById);

    return {
      ...order,
      remark: mapping.remark ? formatValue(row[mapping.remark]) : '',
      rawFields: Object.entries(row).map(([name, value]) => ({
        name,
        value: formatValue(value),
      })),
      statusOptions: await getStatusOptions(
        client,
        table,
        columns,
        mapping.status,
        ORDER_DEFAULT_STATUS_OPTIONS,
      ),
      source: {
        ok: true,
        table,
        mapping,
      },
    };
  } catch {
    return null;
  } finally {
    client.release();
  }
}

export async function updateAdminUserStatus(id: string, status: string): Promise<void> {
  await updateStatus({
    id,
    status,
    tableCandidates: USER_TABLE_CANDIDATES,
    resolveMapping: resolveUserFieldMapping,
    missingTableMessage: '未找到 users/profiles 用户表。',
    missingStatusMessage: '用户表没有可编辑的 status 字段。',
  });
}

export async function updateAdminOrderStatus(id: string, status: string): Promise<void> {
  await updateStatus({
    id,
    status,
    tableCandidates: ORDER_TABLE_CANDIDATES,
    resolveMapping: resolveOrderFieldMapping,
    missingTableMessage: '未找到 orders 订单表。',
    missingStatusMessage: '订单表没有可编辑的 status 字段。',
  });
}

async function updateStatus(input: {
  id: string;
  status: string;
  tableCandidates: string[];
  resolveMapping: (columns: string[]) => { id?: string; status?: string };
  missingTableMessage: string;
  missingStatusMessage: string;
}): Promise<void> {
  const database = await getPool();
  if (!database) throw new Error(missingDatabaseMessage());

  const cleanStatus = input.status.trim().slice(0, 60);
  if (!input.id || !cleanStatus) throw new Error('缺少要更新的状态。');

  const client = await database.connect();
  try {
    const table = await findTable(client, input.tableCandidates);
    if (!table) throw new Error(input.missingTableMessage);

    const columns = await getColumns(client, table);
    const mapping = input.resolveMapping(columns.map((column) => column.column_name));
    if (!mapping.id) throw new Error('数据表缺少可识别的 id 字段。');
    if (!mapping.status) throw new Error(input.missingStatusMessage);

    const result = await client.query(
      `UPDATE ${quoteIdentifier(table)} SET ${quoteIdentifier(mapping.status)} = $1 WHERE CAST(${quoteIdentifier(mapping.id)} AS TEXT) = $2`,
      [cleanStatus, input.id],
    );

    if (result.rowCount === 0) {
      throw new Error('没有找到要更新的记录。');
    }
  } finally {
    client.release();
  }
}

async function getPool(): Promise<PgPool | null> {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;

  if (!pool) {
    const { Pool } = await import('pg');
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

async function getUserTableInfo(client: PoolClient): Promise<{
  table: string;
  mapping: UserFieldMapping;
} | null> {
  const table = await findTable(client, USER_TABLE_CANDIDATES);
  if (!table) return null;

  const columns = await getColumns(client, table);
  const mapping = resolveUserFieldMapping(columns.map((column) => column.column_name));
  if (!mapping.id) return null;

  return { table, mapping };
}

async function findTable(client: PoolClient, candidates: string[]): Promise<string | null> {
  const result = await client.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND lower(table_name) = ANY($1)`,
    [candidates.map((candidate) => candidate.toLowerCase())],
  );
  const found = new Set(result.rows.map((row) => row.table_name.toLowerCase()));
  return candidates.find((candidate) => found.has(candidate.toLowerCase())) || null;
}

async function getColumns(client: PoolClient, table: string): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return result.rows;
}

async function countRows(
  client: PoolClient,
  table: string,
  whereSql = '',
  values: unknown[] = [],
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(table)} ${whereSql}`,
    values,
  );
  return Number.parseInt(result.rows[0]?.count || '0', 10);
}

async function countRecentRows(
  client: PoolClient,
  table: string,
  createdAtField: string,
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM ${quoteIdentifier(table)}
     WHERE ${quoteIdentifier(createdAtField)} >= NOW() - ($1::text || ' days')::interval`,
    [RECENT_DAYS],
  );
  return Number.parseInt(result.rows[0]?.count || '0', 10);
}

async function sumColumn(
  client: PoolClient,
  table: string,
  column: string,
): Promise<number> {
  const result = await client.query<{ total: string }>(
    `SELECT COALESCE(SUM(${quoteIdentifier(column)}), 0)::text AS total FROM ${quoteIdentifier(table)}`,
  );
  return Number(result.rows[0]?.total || 0);
}

async function getStatusOptions(
  client: PoolClient,
  table: string,
  columns: ColumnInfo[],
  statusField: string | undefined,
  defaults: string[],
): Promise<string[]> {
  if (!statusField) return [];

  const column = columns.find((item) => item.column_name === statusField);
  if (column?.udt_name) {
    const enumResult = await client.query<{ enumlabel: string }>(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = $1
       ORDER BY e.enumsortorder`,
      [column.udt_name],
    );

    if (enumResult.rows.length > 0) {
      return enumResult.rows.map((row) => row.enumlabel);
    }
  }

  const result = await client.query<{ status: string }>(
    `SELECT DISTINCT CAST(${quoteIdentifier(statusField)} AS TEXT) AS status
     FROM ${quoteIdentifier(table)}
     WHERE ${quoteIdentifier(statusField)} IS NOT NULL
       AND CAST(${quoteIdentifier(statusField)} AS TEXT) <> ''
     ORDER BY status
     LIMIT 30`,
  );
  const existing = result.rows.map((row) => row.status);
  return existing.length > 0 ? existing : defaults;
}

async function addOrderSearch(
  client: PoolClient,
  userTable: { table: string; mapping: UserFieldMapping } | null,
  where: string[],
  values: unknown[],
  mapping: OrderFieldMapping,
  search: string,
): Promise<void> {
  if (!search) return;

  const searchValue = `%${search}%`;
  const searchClauses: string[] = [];
  const searchPlaceholder = pushValue(values, searchValue);

  for (const field of [mapping.orderNo, mapping.id]) {
    if (field) {
      searchClauses.push(`CAST(${quoteIdentifier(field)} AS TEXT) ILIKE ${searchPlaceholder}`);
    }
  }

  const matchingUserIds = await findMatchingUserIds(client, userTable, searchValue);
  if (mapping.userId && matchingUserIds.length > 0) {
    searchClauses.push(
      `CAST(${quoteIdentifier(mapping.userId)} AS TEXT) = ANY(${pushValue(values, matchingUserIds)})`,
    );
  }

  if (searchClauses.length > 0) {
    where.push(`(${searchClauses.join(' OR ')})`);
  }
}

async function findMatchingUserIds(
  client: PoolClient,
  userTable: { table: string; mapping: UserFieldMapping } | null,
  searchValue: string,
): Promise<string[]> {
  if (!userTable?.mapping.id) return [];

  const clauses = [userTable.mapping.name, userTable.mapping.email]
    .filter(isDefinedString)
    .map((field) => `CAST(${quoteIdentifier(field)} AS TEXT) ILIKE $1`);

  if (clauses.length === 0) return [];

  const result = await client.query<QueryResultRow>(
    `SELECT ${quoteIdentifier(userTable.mapping.id)} AS id
     FROM ${quoteIdentifier(userTable.table)}
     WHERE ${clauses.join(' OR ')}
     LIMIT 200`,
    [searchValue],
  );

  return result.rows.map((row) => formatValue(row.id)).filter(Boolean);
}

async function fetchUsersByIds(
  client: PoolClient,
  userTable: { table: string; mapping: UserFieldMapping } | null,
  userIds: string[],
): Promise<Map<string, AdminOrderUser>> {
  const users = new Map<string, AdminOrderUser>();
  if (!userTable?.mapping.id || userIds.length === 0) return users;

  const result = await client.query<QueryResultRow>(
    `SELECT *
     FROM ${quoteIdentifier(userTable.table)}
     WHERE CAST(${quoteIdentifier(userTable.mapping.id)} AS TEXT) = ANY($1)`,
    [Array.from(new Set(userIds))],
  );

  for (const row of result.rows) {
    const user = mapOrderUser(row, userTable.mapping);
    users.set(user.id, user);
  }

  return users;
}

function addTextSearch(
  where: string[],
  values: unknown[],
  fields: Array<string | undefined>,
  search: string,
): void {
  if (!search) return;

  const clauses = fields
    .filter(isDefinedString)
    .map((field) => `CAST(${quoteIdentifier(field)} AS TEXT) ILIKE ${pushValue(values, `%${search}%`)}`);

  if (clauses.length > 0) {
    where.push(`(${clauses.join(' OR ')})`);
  }
}

function addStatusFilter(
  where: string[],
  values: unknown[],
  statusField: string | undefined,
  status: string,
): void {
  if (!status || !statusField) return;
  where.push(`${quoteIdentifier(statusField)} = ${pushValue(values, status)}`);
}

function buildWhereSql(where: string[]): string {
  return where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
}

function buildOrderSql(field: string | undefined): string {
  return field ? `ORDER BY ${quoteIdentifier(field)} DESC NULLS LAST` : '';
}

function pushValue(values: unknown[], value: unknown): string {
  values.push(value);
  return `$${values.length}`;
}

function mapUserRow(row: QueryResultRow, mapping: UserFieldMapping): AdminUser {
  return {
    id: mapping.id ? formatValue(row[mapping.id]) : '',
    name: mapping.name ? formatValue(row[mapping.name]) : '',
    email: mapping.email ? formatValue(row[mapping.email]) : '',
    createdAt: mapping.createdAt ? formatDateValue(row[mapping.createdAt]) : '',
    status: mapping.status ? formatValue(row[mapping.status]) : '',
  };
}

function mapOrderRow(
  row: QueryResultRow,
  mapping: OrderFieldMapping,
  usersById: Map<string, AdminOrderUser>,
): AdminOrder {
  const userId = mapping.userId ? formatValue(row[mapping.userId]) : '';

  return {
    id: mapping.id ? formatValue(row[mapping.id]) : '',
    orderNo: mapping.orderNo ? formatValue(row[mapping.orderNo]) : mapping.id ? formatValue(row[mapping.id]) : '',
    user: userId ? usersById.get(userId) || { id: userId, name: '', email: '' } : null,
    amount: mapping.amount ? formatAmountValue(row[mapping.amount]) : undefined,
    status: mapping.status ? formatValue(row[mapping.status]) : '',
    createdAt: mapping.createdAt ? formatDateValue(row[mapping.createdAt]) : '',
  };
}

function mapOrderUser(row: QueryResultRow, mapping: UserFieldMapping): AdminOrderUser {
  return {
    id: mapping.id ? formatValue(row[mapping.id]) : '',
    name: mapping.name ? formatValue(row[mapping.name]) : '',
    email: mapping.email ? formatValue(row[mapping.email]) : '',
  };
}

function getOrderUserIds(rows: QueryResultRow[], mapping: OrderFieldMapping): string[] {
  const userIdField = mapping.userId;
  if (!userIdField) return [];

  return rows
    .map((row) => formatValue(row[userIdField]))
    .filter(Boolean);
}

function isDefinedString(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function emptyListResult<T>(params: AdminListParams): AdminListResult<T> {
  return {
    rows: [],
    pagination: buildPagination({ page: params.page, pageSize: params.pageSize, total: 0 }),
    statusOptions: [],
    source: {
      ok: false,
    },
  };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function isNumericColumn(columns: ColumnInfo[], field: string): boolean {
  const column = columns.find((item) => item.column_name === field);
  return Boolean(
    column &&
      [
        'smallint',
        'integer',
        'bigint',
        'decimal',
        'numeric',
        'real',
        'double precision',
      ].includes(column.data_type),
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDateValue(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return formatValue(value);

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatAmountValue(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return formatValue(value);
  return formatAmount(numeric);
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function missingDatabaseMessage(): string {
  return '未配置 DATABASE_URL/POSTGRES_URL，后台不会读取或伪造业务数据。';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
