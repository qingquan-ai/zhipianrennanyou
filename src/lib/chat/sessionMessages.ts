import type { ChatMessage, MessageDirection, MessageType } from '@/types';

export type SessionMessageRole = 'user' | 'assistant' | 'system';

export type SessionMessageResponseItem = {
  id: string;
  role: SessionMessageRole;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
};

export function mapSessionMessageToChatMessage(
  message: SessionMessageResponseItem,
): ChatMessage | null {
  if (message.role === 'system') return null;

  const imageUrl = message.image_url || '';
  const audioUrl = message.audio_url || '';
  const type: MessageType = imageUrl ? 'image' : audioUrl ? 'voice' : 'text';
  const direction: MessageDirection = message.role === 'user' ? 'user' : 'character';

  return {
    id: message.id,
    direction,
    type,
    content: message.content || '',
    timestamp: new Date(message.created_at),
    ...(imageUrl ? { imageUrl, imageCaption: message.content || '' } : {}),
    ...(audioUrl ? { audioUrl } : {}),
  };
}

export function mapSessionMessageToChatMessages(
  message: SessionMessageResponseItem,
): ChatMessage[] {
  if (message.role === 'system') return [];

  const imageUrl = message.image_url || '';
  const hasText = Boolean(message.content?.trim());

  if (!imageUrl || !hasText) {
    const mappedMessage = mapSessionMessageToChatMessage(message);
    return mappedMessage ? [mappedMessage] : [];
  }

  const direction: MessageDirection = message.role === 'user' ? 'user' : 'character';
  const timestamp = new Date(message.created_at);

  return [
    {
      id: `${message.id}-text`,
      direction,
      type: 'text',
      content: message.content,
      timestamp,
    },
    {
      id: `${message.id}-image`,
      direction,
      type: 'image',
      content: '',
      timestamp,
      imageUrl,
      imageCaption: message.content,
    },
  ];
}
