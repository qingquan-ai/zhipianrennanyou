export type SearchParamsInput = Record<string, string | string[] | undefined>;

export type AdminListParams = {
  page: number;
  pageSize: number;
  search: string;
  status: string;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type UserFieldMapping = {
  id?: string;
  name?: string;
  email?: string;
  createdAt?: string;
  status?: string;
};

export type OrderFieldMapping = {
  id?: string;
  orderNo?: string;
  userId?: string;
  amount?: string;
  status?: string;
  createdAt?: string;
  remark?: string;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_SEARCH_LENGTH = 100;

export function parseAdminListParams(
  searchParams: SearchParamsInput,
  pageSize = DEFAULT_PAGE_SIZE,
): AdminListParams {
  const rawPage = Number.parseInt(getSearchParam(searchParams, 'page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
  const search = getSearchParam(searchParams, 'search').trim().slice(0, MAX_SEARCH_LENGTH);
  const status = normalizeFilterValue(getSearchParam(searchParams, 'status'));

  return {
    page,
    pageSize: normalizedPageSize,
    search,
    status,
  };
}

export function buildPagination(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages);

  return {
    page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

export function resolveUserFieldMapping(columns: string[]): UserFieldMapping {
  return {
    id: pickColumn(columns, ['id', 'user_id', 'uuid']),
    name: pickColumn(columns, ['name', 'nickname', 'full_name', 'username', 'display_name']),
    email: pickColumn(columns, ['email', 'email_address']),
    createdAt: pickColumn(columns, ['created_at', 'createdAt', 'created_on', 'inserted_at']),
    status: pickColumn(columns, ['status', 'state', 'account_status', 'user_status']),
  };
}

export function resolveOrderFieldMapping(columns: string[]): OrderFieldMapping {
  return {
    id: pickColumn(columns, ['id', 'order_id', 'uuid']),
    orderNo: pickColumn(columns, ['order_no', 'order_number', 'no', 'code', 'number']),
    userId: pickColumn(columns, ['user_id', 'customer_id', 'buyer_id', 'member_id']),
    amount: pickColumn(columns, [
      'amount',
      'total_amount',
      'total',
      'price',
      'pay_amount',
      'paid_amount',
    ]),
    status: pickColumn(columns, ['status', 'state', 'order_status', 'payment_status']),
    createdAt: pickColumn(columns, ['created_at', 'createdAt', 'created_on', 'inserted_at']),
    remark: pickColumn(columns, ['remark', 'remarks', 'note', 'notes', 'comment', 'description']),
  };
}

export function getSearchParam(searchParams: SearchParamsInput, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function normalizeFilterValue(value: string): string {
  const trimmed = value.trim();
  return trimmed === 'all' ? '' : trimmed.slice(0, 60);
}

function pickColumn(columns: string[], candidates: string[]): string | undefined {
  const byLowerName = new Map(columns.map((column) => [column.toLowerCase(), column]));

  for (const candidate of candidates) {
    const match = byLowerName.get(candidate.toLowerCase());
    if (match) return match;
  }

  return undefined;
}
