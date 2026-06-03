import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAT_CACHE_USER_KEY,
  clearChatLocalStorage,
  syncChatLocalStorageForUser,
} from '../src/lib/chat/localStorage';

class MemoryStorage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] || null;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test('clearChatLocalStorage removes only chat cache keys', () => {
  const storage = new MemoryStorage();
  storage.setItem('chat_session_id_gu-lie', 'session-a');
  storage.setItem('chat_history_gu-lie', '{}');
  storage.setItem('selected_character_id', 'gu-lie');
  storage.setItem('other_key', 'keep');

  clearChatLocalStorage(storage);

  assert.equal(storage.getItem('chat_session_id_gu-lie'), null);
  assert.equal(storage.getItem('chat_history_gu-lie'), null);
  assert.equal(storage.getItem('selected_character_id'), 'gu-lie');
  assert.equal(storage.getItem('other_key'), 'keep');
});

test('syncChatLocalStorageForUser clears chat cache when user changes', () => {
  const storage = new MemoryStorage();
  storage.setItem(CHAT_CACHE_USER_KEY, 'user-a');
  storage.setItem('chat_session_id_gu-lie', 'session-a');
  storage.setItem('chat_history_gu-lie', '{}');

  syncChatLocalStorageForUser('user-b', storage);

  assert.equal(storage.getItem('chat_session_id_gu-lie'), null);
  assert.equal(storage.getItem('chat_history_gu-lie'), null);
  assert.equal(storage.getItem(CHAT_CACHE_USER_KEY), 'user-b');
});
