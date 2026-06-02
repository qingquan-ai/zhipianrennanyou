import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPagination,
  parseAdminListParams,
  resolveOrderFieldMapping,
  resolveUserFieldMapping,
} from '../src/lib/admin/query';

test('parseAdminListParams normalizes search, status, and page values', () => {
  assert.deepEqual(
    parseAdminListParams({
      page: '0',
      search: '  Alice  ',
      status: 'all',
    }),
    {
      page: 1,
      pageSize: 20,
      search: 'Alice',
      status: '',
    },
  );
});

test('resolveUserFieldMapping prefers the closest real user columns', () => {
  assert.deepEqual(
    resolveUserFieldMapping([
      'uuid',
      'nickname',
      'email',
      'created_on',
      'account_status',
    ]),
    {
      id: 'uuid',
      name: 'nickname',
      email: 'email',
      createdAt: 'created_on',
      status: 'account_status',
    },
  );
});

test('resolveOrderFieldMapping maps common order and relation columns', () => {
  assert.deepEqual(
    resolveOrderFieldMapping([
      'id',
      'order_number',
      'customer_id',
      'total_amount',
      'order_status',
      'created_at',
      'notes',
    ]),
    {
      id: 'id',
      orderNo: 'order_number',
      userId: 'customer_id',
      amount: 'total_amount',
      status: 'order_status',
      createdAt: 'created_at',
      remark: 'notes',
    },
  );
});

test('buildPagination reports stable pagination metadata', () => {
  assert.deepEqual(buildPagination({ page: 3, pageSize: 20, total: 45 }), {
    page: 3,
    pageSize: 20,
    total: 45,
    totalPages: 3,
    hasPrevious: true,
    hasNext: false,
  });
});
