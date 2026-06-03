export const CHAT_CACHE_USER_KEY = 'chat_cache_user_id';

const CHAT_CACHE_PREFIXES = ['chat_session_id_', 'chat_history_'];

type ChatStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;

export function clearChatLocalStorage(storage: ChatStorage): void {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && CHAT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function clearChatLocalStorageForLogout(storage: ChatStorage): void {
  clearChatLocalStorage(storage);
  storage.removeItem(CHAT_CACHE_USER_KEY);
}

export function syncChatLocalStorageForUser(userId: string, storage: ChatStorage): void {
  const previousUserId = storage.getItem(CHAT_CACHE_USER_KEY);
  if (previousUserId !== userId) {
    clearChatLocalStorage(storage);
    storage.setItem(CHAT_CACHE_USER_KEY, userId);
  }
}
