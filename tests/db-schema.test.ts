import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableColumns, getTableName } from 'drizzle-orm';

import { chatMessages, chatSessions, users } from '../src/db/schema';

test('defines the first-stage chat tables', () => {
  assert.equal(getTableName(users), 'users');
  assert.equal(getTableName(chatSessions), 'chat_sessions');
  assert.equal(getTableName(chatMessages), 'chat_messages');
});

test('defines the minimum user columns', () => {
  assert.deepEqual(Object.keys(getTableColumns(users)), [
    'id',
    'email',
    'nickname',
    'avatarUrl',
    'passwordHash',
    'status',
    'createdAt',
    'updatedAt',
  ]);
  assert.equal(getTableColumns(users).passwordHash.name, 'password_hash');
});

test('defines the minimum chat session columns', () => {
  const columns = getTableColumns(chatSessions);

  assert.deepEqual(Object.keys(columns), [
    'id',
    'userId',
    'characterId',
    'title',
    'createdAt',
    'updatedAt',
  ]);
  assert.equal(columns.characterId.name, 'character_id');
});

test('defines the minimum chat message columns', () => {
  assert.deepEqual(Object.keys(getTableColumns(chatMessages)), [
    'id',
    'sessionId',
    'role',
    'content',
    'imageUrl',
    'audioUrl',
    'createdAt',
  ]);
});
