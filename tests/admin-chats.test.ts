import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAdminChatCharacterName,
  getAdminChatUserDisplayName,
  mapAdminChatMessage,
  mapAdminChatSession,
} from '../src/lib/admin/chats';

test('mapAdminChatSession exposes readable chat session list fields', () => {
  const createdAt = new Date('2026-06-02T02:21:25.699Z');
  const updatedAt = new Date('2026-06-02T02:22:10.000Z');

  assert.deepEqual(
    mapAdminChatSession({
      id: '12345678-1234-1234-1234-123456789abc',
      userId: 'user-1',
      userEmail: 'demo@example.com',
      userNickname: '\u5c0f\u590f',
      characterId: 'gu-lie',
      title: 'hello',
      messageCount: 2,
      createdAt,
      updatedAt,
    }),
    {
      id: '12345678-1234-1234-1234-123456789abc',
      shortId: '12345678',
      userId: 'user-1',
      userDisplayName: '\u5c0f\u590f',
      characterId: 'gu-lie',
      characterName: '\u987e\u51bd',
      title: 'hello',
      messageCount: 2,
      createdAt: '2026-06-02 02:21:25',
      updatedAt: '2026-06-02 02:22:10',
    },
  );
});

test('getAdminChatUserDisplayName prefers nickname, then email, then guest label', () => {
  assert.equal(
    getAdminChatUserDisplayName({ userEmail: 'demo@example.com', userNickname: '\u5c0f\u590f' }),
    '\u5c0f\u590f',
  );
  assert.equal(
    getAdminChatUserDisplayName({ userEmail: 'demo@example.com', userNickname: '   ' }),
    'demo@example.com',
  );
  assert.equal(getAdminChatUserDisplayName({ userEmail: null, userNickname: null }), '\u6e38\u5ba2');
});

test('getAdminChatCharacterName maps known character ids and keeps unknown ids', () => {
  assert.equal(getAdminChatCharacterName('gu-lie'), '\u987e\u51bd');
  assert.equal(getAdminChatCharacterName('lin-yu'), '\u6797\u5c7f');
  assert.equal(getAdminChatCharacterName('shen-mo'), '\u6c88\u9ed8');
  assert.equal(getAdminChatCharacterName('su-chen'), '\u82cf\u6668');
  assert.equal(getAdminChatCharacterName('custom-character'), 'custom-character');
});

test('mapAdminChatMessage exposes persisted message fields', () => {
  const createdAt = new Date('2026-06-02T02:21:30.000Z');

  assert.deepEqual(
    mapAdminChatMessage({
      role: 'assistant',
      content: 'thinking of you',
      imageUrl: null,
      audioUrl: 'https://example.local/audio.mp3',
      createdAt,
    }),
    {
      role: 'assistant',
      content: 'thinking of you',
      imageUrl: '',
      audioUrl: 'https://example.local/audio.mp3',
      createdAt: '2026-06-02 02:21:30',
    },
  );
});
