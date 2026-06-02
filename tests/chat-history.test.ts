import assert from 'node:assert/strict';
import test from 'node:test';

import { mapSessionMessageToChatMessage } from '../src/lib/chat/sessionMessages';

test('mapSessionMessageToChatMessage maps persisted user and assistant messages', () => {
  assert.deepEqual(
    mapSessionMessageToChatMessage({
      id: 'message-1',
      role: 'user',
      content: '你在干什么',
      image_url: null,
      audio_url: null,
      created_at: '2026-06-02T02:21:25.699Z',
    }),
    {
      id: 'message-1',
      direction: 'user',
      type: 'text',
      content: '你在干什么',
      timestamp: new Date('2026-06-02T02:21:25.699Z'),
    },
  );

  assert.deepEqual(
    mapSessionMessageToChatMessage({
      id: 'message-2',
      role: 'assistant',
      content: '在想你。',
      image_url: 'https://example.local/photo.jpg',
      audio_url: null,
      created_at: '2026-06-02T02:21:30.000Z',
    }),
    {
      id: 'message-2',
      direction: 'character',
      type: 'image',
      content: '在想你。',
      timestamp: new Date('2026-06-02T02:21:30.000Z'),
      imageUrl: 'https://example.local/photo.jpg',
      imageCaption: '在想你。',
    },
  );
});

test('mapSessionMessageToChatMessage skips system messages', () => {
  assert.equal(
    mapSessionMessageToChatMessage({
      id: 'message-3',
      role: 'system',
      content: 'system prompt',
      image_url: null,
      audio_url: null,
      created_at: '2026-06-02T02:21:35.000Z',
    }),
    null,
  );
});
