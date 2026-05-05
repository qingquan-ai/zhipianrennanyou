// 角色类型定义
export interface Character {
  id: string;
  name: string;
  age: number;
  role: string;
  personality: string;
  speakingStyle: string;
  commonAddress: string[];
  emotionalExpression: string;
  ttsSpeaker: string;
  speechRate: number;
  appearance: string;
  keywords: string[];
  systemPrompt: string;
  statusTexts: string[];
}

// 关系阶段
export type RelationshipLevel = 'stranger' | 'familiar' | 'ambiguous' | 'intimate';

// 情绪状态
export type EmotionState = 
  | 'calm'
  | 'caring'
  | 'happy'
  | 'miss_you'
  | 'jealous'
  | 'heartbroken_for_user'
  | 'playful'
  | 'worried'
  | 'proud'
  | 'relaxed';

// 消息类型
export type MessageType = 'text' | 'voice' | 'image';

// 消息方向
export type MessageDirection = 'user' | 'character';

// 聊天消息
export interface ChatMessage {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  timestamp: Date;
  audioUrl?: string;
  imageUrl?: string;
  imageCaption?: string;
  isStreaming?: boolean;
  emotion?: EmotionState;
}

// 对话状态
export interface ConversationState {
  relationshipLevel: RelationshipLevel;
  emotionState: EmotionState;
  messageCount: number;
  lastImageSentTime?: Date;
  todayImageCount: number;
}

// API 返回的消息结构
export interface CharacterResponse {
  text: string;
  emotion: EmotionState;
  relationshipLevel: RelationshipLevel;
  sendVoice: boolean;
  sendImage: boolean;
  imageType?: 'selfie' | 'daily' | 'scene';
  imageMood?: 'happy' | 'relaxed' | 'miss_you' | 'caring';
  imageCaption?: string;
}

// 用户消息请求
export interface ChatRequest {
  characterId: string;
  userMessage: string;
  conversationHistory?: ChatMessage[];
  state: ConversationState;
}
