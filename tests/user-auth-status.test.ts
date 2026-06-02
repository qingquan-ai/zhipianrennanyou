import assert from 'node:assert/strict';
import test from 'node:test';

import { getUserAuthDisplayName } from '../src/lib/user-auth-status';

test('uses nickname as the user auth display name first', () => {
  assert.equal(
    getUserAuthDisplayName({ email: 'demo@example.com', nickname: 'Demo User' }),
    'Demo User',
  );
});

test('falls back to email when nickname is empty', () => {
  assert.equal(
    getUserAuthDisplayName({ email: 'demo@example.com', nickname: '   ' }),
    'demo@example.com',
  );
});

test('falls back to a generic label without nickname or email', () => {
  assert.equal(getUserAuthDisplayName({ email: '', nickname: '' }), '用户');
});
