import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldSendImage } from '../src/app/api/chat/route';
import { normalizeConversationStateForToday } from '../src/store/chatStore';
import type { ConversationState } from '../src/types';

test('shouldSendImage matches follow-up photo requests before the daily limit', () => {
  for (const message of ['再来一张', '再发一张', '来一张']) {
    assert.equal(shouldSendImage(message, 0), true, message);
  }
});

test('shouldSendImage keeps the five-image daily limit', () => {
  assert.equal(shouldSendImage('再来一张', 5), false);
});

test('normalizeConversationStateForToday resets image count from a previous day only', () => {
  const baseState: ConversationState = {
    relationshipLevel: 'stranger',
    emotionState: 'calm',
    messageCount: 7,
    todayImageCount: 5,
    lastImageSentTime: new Date('2026-06-01T10:00:00.000Z'),
  };

  assert.deepEqual(
    normalizeConversationStateForToday(baseState, new Date('2026-06-02T10:00:00.000Z')),
    {
      ...baseState,
      todayImageCount: 0,
    },
  );

  assert.deepEqual(
    normalizeConversationStateForToday(
      {
        ...baseState,
        lastImageSentTime: new Date('2026-06-02T09:00:00.000Z'),
      },
      new Date('2026-06-02T10:00:00.000Z'),
    ),
    {
      ...baseState,
      lastImageSentTime: new Date('2026-06-02T09:00:00.000Z'),
    },
  );
});
