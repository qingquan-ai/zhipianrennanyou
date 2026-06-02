import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUserStatusOptions,
  mapAdminUser,
} from '../src/lib/admin/users';

test('mapAdminUser exposes real users table fields for the admin list', () => {
  const createdAt = new Date('2026-06-01T08:30:00.000Z');

  assert.deepEqual(
    mapAdminUser({
      id: 'user-1',
      email: 'alice@example.local',
      nickname: 'Alice',
      status: 'active',
      createdAt,
    }),
    {
      id: 'user-1',
      email: 'alice@example.local',
      nickname: 'Alice',
      status: 'active',
      createdAt: '2026-06-01 08:30:00',
    },
  );
});

test('buildUserStatusOptions keeps existing statuses and default active option', () => {
  assert.deepEqual(buildUserStatusOptions(['inactive', 'active', 'inactive']), [
    'active',
    'inactive',
    'suspended',
    'banned',
  ]);
});
