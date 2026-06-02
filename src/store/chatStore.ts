import { create } from 'zustand';
import { ChatMessage, Character, ConversationState, RelationshipLevel, EmotionState } from '@/types';

interface CharacterChatData {
  messages: ChatMessage[];
  conversationState: ConversationState;
}

const STORAGE_KEY_PREFIX = 'chat_history_';

interface ChatStore {
  currentCharacter: Character | null;
  setCurrentCharacter: (character: Character | null) => void;

  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateStreamingMessage: (id: string, content: string) => void;
  completeStreamingMessage: (id: string) => void;
  setMessageAudio: (id: string, audioUrl: string) => void;
  clearMessages: () => void;

  conversationState: ConversationState;
  updateRelationshipLevel: (level: RelationshipLevel) => void;
  updateEmotionState: (emotion: EmotionState) => void;
  incrementMessageCount: () => void;
  recordImageSent: () => void;

  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;

  reset: () => void;

  loadCharacterChat: (characterId: string) => void;
  saveCurrentChat: () => void;
}

const getStorageKey = (characterId: string) => `${STORAGE_KEY_PREFIX}${characterId}`;

const loadFromStorage = (characterId: string): CharacterChatData | null => {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(getStorageKey(characterId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }

  return null;
};

const saveToStorage = (characterId: string, data: CharacterChatData) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getStorageKey(characterId), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

const initialConversationState: ConversationState = {
  relationshipLevel: 'stranger',
  emotionState: 'calm',
  messageCount: 0,
  todayImageCount: 0,
};

export const normalizeConversationStateForToday = (
  state: ConversationState,
  now = new Date(),
): ConversationState => {
  const lastImageSentTime = state.lastImageSentTime as Date | string | undefined;
  if (!lastImageSentTime) return state;

  const lastImageSentDate = lastImageSentTime instanceof Date
    ? lastImageSentTime
    : new Date(lastImageSentTime);
  if (Number.isNaN(lastImageSentDate.getTime())) return state;

  const isSameDay =
    lastImageSentDate.getFullYear() === now.getFullYear() &&
    lastImageSentDate.getMonth() === now.getMonth() &&
    lastImageSentDate.getDate() === now.getDate();

  return isSameDay ? state : { ...state, todayImageCount: 0 };
};

export const useChatStore = create<ChatStore>((set, get) => {
  const persistCurrentCharacterChat = () => {
    const state = get();
    if (!state.currentCharacter) return;

    saveToStorage(state.currentCharacter.id, {
      messages: state.messages,
      conversationState: state.conversationState,
    });
  };

  return {
    currentCharacter: null,
    setCurrentCharacter: (character) => {
      const state = get();
      if (state.currentCharacter && state.currentCharacter.id !== character?.id) {
        saveToStorage(state.currentCharacter.id, {
          messages: state.messages,
          conversationState: state.conversationState,
        });
      }

      set({ currentCharacter: character });
    },

    messages: [],
    addMessage: (message) => {
      set((state) => ({
        messages: [...state.messages, message],
      }));
      persistCurrentCharacterChat();
    },
    updateStreamingMessage: (id, content) => {
      set((state) => {
        const message = state.messages.find((msg) => msg.id === id);
        if (!message) return state;

        return {
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + content } : msg,
          ),
        };
      });
      persistCurrentCharacterChat();
    },
    completeStreamingMessage: (id) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === id ? { ...msg, isStreaming: false } : msg,
        ),
      }));
      persistCurrentCharacterChat();
    },
    setMessageAudio: (id, audioUrl) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === id ? { ...msg, audioUrl } : msg,
        ),
      }));
      persistCurrentCharacterChat();
    },
    clearMessages: () => {
      set({ messages: [] });
      persistCurrentCharacterChat();
    },

    conversationState: initialConversationState,
    updateRelationshipLevel: (level) => {
      set((state) => ({
        conversationState: { ...state.conversationState, relationshipLevel: level },
      }));
      persistCurrentCharacterChat();
    },
    updateEmotionState: (emotion) => {
      set((state) => ({
        conversationState: { ...state.conversationState, emotionState: emotion },
      }));
      persistCurrentCharacterChat();
    },
    incrementMessageCount: () => {
      set((state) => ({
        conversationState: {
          ...state.conversationState,
          messageCount: state.conversationState.messageCount + 1,
        },
      }));
      persistCurrentCharacterChat();
    },
    recordImageSent: () => {
      set((state) => ({
        conversationState: {
          ...state.conversationState,
          todayImageCount: state.conversationState.todayImageCount + 1,
          lastImageSentTime: new Date(),
        },
      }));
      persistCurrentCharacterChat();
    },

    isTyping: false,
    setIsTyping: (typing) => set({ isTyping: typing }),

    reset: () => set({
      currentCharacter: null,
      messages: [],
      conversationState: initialConversationState,
      isTyping: false,
    }),

    loadCharacterChat: (characterId: string) => {
      const savedData = loadFromStorage(characterId);
      if (savedData) {
        const sanitizedMessages = (savedData.messages || []).filter((message) => {
          const isEmptyCompletedAssistantMessage =
            message.type === 'text' &&
            message.direction === 'character' &&
            !message.content.trim() &&
            !message.imageUrl &&
            message.isStreaming === false;

          return !isEmptyCompletedAssistantMessage;
        });

        set({
          messages: sanitizedMessages,
          conversationState: savedData.conversationState
            ? normalizeConversationStateForToday(savedData.conversationState)
            : initialConversationState,
        });
      } else {
        set({
          messages: [],
          conversationState: initialConversationState,
        });
      }
    },

    saveCurrentChat: () => {
      persistCurrentCharacterChat();
    },
  };
});
