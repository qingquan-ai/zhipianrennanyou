import assert from 'node:assert/strict';
import test from 'node:test';

import type { ChatRequest } from '../src/types';

test('ChatRequest accepts an optional sessionId for persisted chat sessions', () => {
  const request = {
    sessionId: '00000000-0000-0000-0000-000000000001',
    characterId: 'gu-lie',
    userMessage: 'hello',
    conversationHistory: [],
    state: {
      relationshipLevel: 'stranger',
      emotionState: 'calm',
      messageCount: 0,
      todayImageCount: 0,
    },
  } satisfies ChatRequest;

  assert.equal(request.sessionId, '00000000-0000-0000-0000-000000000001');
});
