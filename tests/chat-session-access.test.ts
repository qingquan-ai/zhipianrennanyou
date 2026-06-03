import assert from 'node:assert/strict';
import test from 'node:test';

import { canReadChatSessionMessages } from '../src/lib/chat/sessionAccess';

test('canReadChatSessionMessages allows only matching logged-in users', () => {
  assert.equal(canReadChatSessionMessages('user-a', 'user-a'), true);
  assert.equal(canReadChatSessionMessages('user-b', 'user-a'), false);
});

test('canReadChatSessionMessages keeps guest sessions out of logged-in accounts', () => {
  assert.equal(canReadChatSessionMessages('user-b', null), false);
  assert.equal(canReadChatSessionMessages(null, null), true);
  assert.equal(canReadChatSessionMessages(null, 'user-a'), false);
});
