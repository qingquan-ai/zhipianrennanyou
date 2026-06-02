import assert from 'node:assert/strict';
import test from 'node:test';

import {
  USER_SESSION_COOKIE,
  hashPassword,
  verifyPassword,
} from '../src/lib/user-auth';

test('uses a separate cookie for normal user sessions', () => {
  assert.equal(USER_SESSION_COOKIE, 'user_session');
});

test('hashPassword and verifyPassword validate user passwords', async () => {
  const hash = await hashPassword('secret123');

  assert.notEqual(hash, 'secret123');
  assert.equal(await verifyPassword('secret123', hash), true);
  assert.equal(await verifyPassword('wrong123', hash), false);
});
