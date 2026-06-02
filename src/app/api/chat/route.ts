import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { chatMessages, chatSessions } from '@/db/schema';
import { getCharacterById, getCharacterSystemPrompt, getRandomCachedPhoto } from '@/lib/characters';
import { getCurrentUser } from '@/lib/user-auth';
import { ChatMessage, ChatRequest, EmotionState, RelationshipLevel } from '@/types';

type ChatProviderMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AppDb = typeof import('@/db')['db'];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324';
const OPENROUTER_MAX_TOKENS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

const PHOTO_KEYWORDS = [
  '照片',
  '自拍',
  '看看你',
  '看看妳',
  '长什么样',
  '发张',
  '发个',
  '帅照',
];

export async function POST(request: NextRequest) {
  try {
    const {
      characterId,
      userMessage,
      conversationHistory,
      state,
      sessionId: requestSessionId,
    } = (await request.json()) as ChatRequest;

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    let sessionId = normalizeSessionId(requestSessionId);
    let dbSaved = false;
    let canSaveAssistantMessage = false;

    try {
      sessionId = await saveUserChatMessage({
        sessionId,
        characterId,
        userMessage,
      });
      dbSaved = true;
      canSaveAssistantMessage = true;
    } catch (error) {
      console.error('[chat] failed to save user message', error);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const timeStr = `${currentHour}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isDaytime = currentHour >= 6 && currentHour < 18;
    const currentEmotion = inferEmotion(userMessage);
    const relationshipLevel = updateRelationshipLevel(
      state?.relationshipLevel || 'stranger',
      (state?.messageCount || 0) + 1,
    );

    const messages: ChatProviderMessage[] = [
      {
        role: 'system',
        content: getCharacterSystemPrompt(character, {
          relationshipLevel,
          emotionState: currentEmotion,
          currentTime: timeStr,
          timeOfDay: isDaytime ? '白天' : '晚上',
        }),
      },
    ];

    const recentHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10)
      : [];

    recentHistory.forEach((msg: ChatMessage) => {
      if (!msg.content || msg.type === 'image') return;

      messages.push({
        role: msg.direction === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });

    messages.push({ role: 'user', content: userMessage });

    const fullText = await invokeOpenRouterChat(messages, {
      model: OPENROUTER_MODEL,
      temperature: 0.5,
      maxTokens: OPENROUTER_MAX_TOKENS,
    });

    const wantsImage = shouldSendImage(userMessage, state?.todayImageCount || 0);
    const imageUrl = wantsImage ? getRandomCachedPhoto(character.id) : '';
    const sendImage = Boolean(imageUrl);
    console.log("[chat-image] shouldSendImageResult", { sendImage, imageUrl });
    const imagePrompt = '';

    const imageStyle = sendImage ? '今日自拍' : '';
    const imageDescription = sendImage ? `${character.name}发来的一张照片` : '';
    const cleanedText = sanitizeChatContent(fullText, sendImage);
    const content = cleanedText || (sendImage ? '给你发张照片。' : fullText.trim());

    if (canSaveAssistantMessage && sessionId) {
      try {
        console.log("[chat-image] before save assistant", { sessionId, imageUrl, hasImageUrl: Boolean(imageUrl) });
        await saveAssistantChatMessage({
          sessionId,
          content,
          imageUrl,
        });
        dbSaved = true;
      } catch (error) {
        dbSaved = false;
        console.error('[chat] failed to save assistant message', error);
      }
    }

    return NextResponse.json({
      type: 'done',
      sessionId,
      dbSaved,
      content,
      emotion: currentEmotion,
      relationshipLevel,
      sendVoice: false,
      sendImage,
      imageType: sendImage ? 'selfie' : '',
      imageStyle,
      imageDescription,
      imageUrl,
      imagePrompt,
    });
  } catch (error) {
    console.error('[chat] request failed', error);

    return NextResponse.json(
      {
        error: 'Chat model request failed',
        message: getPublicChatErrorMessage(error),
      },
      { status: 502 },
    );
  }
}

function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function buildSessionTitle(userMessage: string): string | null {
  const title = userMessage.trim().replace(/\s+/g, ' ').slice(0, 20);
  return title || null;
}

async function getDb(): Promise<AppDb> {
  const database = await import('@/db');
  return database.db;
}

async function saveUserChatMessage(input: {
  sessionId: string | null;
  characterId: string;
  userMessage: string;
}): Promise<string> {
  const database = await getDb();
  const currentUserId = await getCurrentUserId();
  const sessionId = input.sessionId || await createChatSession(database, {
    characterId: input.characterId,
    userMessage: input.userMessage,
    userId: currentUserId,
  });

  if (input.sessionId && currentUserId) {
    await attachAnonymousSessionToUser(database, sessionId, currentUserId);
  }

  await database.insert(chatMessages).values({
    sessionId,
    role: 'user',
    content: input.userMessage,
  });

  return sessionId;
}

async function createChatSession(
  database: AppDb,
  input: {
    characterId: string;
    userMessage: string;
    userId: string | null;
  },
): Promise<string> {
  const [session] = await database
    .insert(chatSessions)
    .values({
      userId: input.userId,
      characterId: input.characterId,
      title: buildSessionTitle(input.userMessage),
    })
    .returning({ id: chatSessions.id });

  if (!session?.id) {
    throw new Error('Failed to create chat session');
  }

  return session.id;
}

async function attachAnonymousSessionToUser(
  database: AppDb,
  sessionId: string,
  userId: string,
): Promise<void> {
  await database
    .update(chatSessions)
    .set({
      userId,
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.userId)));
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const currentUser = await getCurrentUser();
    return currentUser?.id || null;
  } catch (error) {
    console.error('[chat] failed to resolve current user', error);
    return null;
  }
}

async function saveAssistantChatMessage(input: {
  sessionId: string;
  content: string;
  imageUrl?: string | null;
}): Promise<void> {
  const database = await getDb();

  console.log("[chat-image] insert assistant", { sessionId: input.sessionId, imageUrl: input.imageUrl });
  await database.insert(chatMessages).values({
    sessionId: input.sessionId,
    role: 'assistant',
    content: input.content,
    imageUrl: input.imageUrl || null,
  });
}

function inferEmotion(userMessage: string): EmotionState {
  const msg = userMessage.toLowerCase();

  if (msg.includes('想你') || msg.includes('想念')) return 'miss_you';
  if (msg.includes('开心') || msg.includes('高兴') || msg.includes('哈哈')) return 'happy';
  if (msg.includes('难过') || msg.includes('伤心') || msg.includes('哭')) return 'heartbroken_for_user';
  if (msg.includes('累') || msg.includes('困') || msg.includes('休息')) return 'caring';

  return 'calm';
}

function updateRelationshipLevel(
  _currentLevel: RelationshipLevel,
  messageCount: number,
): RelationshipLevel {
  if (messageCount >= 20) return 'intimate';
  if (messageCount >= 10) return 'ambiguous';
  if (messageCount >= 5) return 'familiar';
  return 'stranger';
}

function shouldSendImage(userMessage: string, todayImageCount: number): boolean {
  if (todayImageCount >= 5) return false;
  return PHOTO_KEYWORDS.some((keyword) => userMessage.includes(keyword));
}

async function invokeOpenRouterChat(
  messages: ChatProviderMessage[],
  options: { model: string; temperature: number; maxTokens: number },
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    console.log('[chat] OpenRouter request start', {
      provider: 'openrouter',
      model: options.model,
      messageCount: messages.length,
    });

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: messages.map((message) => ({
          role: message.role,
          content: [
            {
              type: 'text',
              text: message.content,
            },
          ],
        })),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    const durationMs = Date.now() - startedAt;

    console.log('[chat] OpenRouter request end', {
      provider: 'openrouter',
      model: options.model,
      status: response.status,
      durationMs,
    });

    if (!response.ok) {
      console.error('[chat] OpenRouter error response', {
        status: response.status,
        body: responseText.slice(0, 300),
      });
      throw new Error(`OpenRouter chat failed: ${response.status} ${responseText.slice(0, 300)}`);
    }

    const content = extractChatContent(responseText);
    if (!content.trim()) {
      throw new Error(`OpenRouter chat returned empty content: ${responseText.slice(0, 500)}`);
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenRouter chat timeout');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildImagePrompt(input: {
  characterName: string;
  characterRole: string;
  characterAppearance: string;
  userMessage: string;
  relationshipLevel: RelationshipLevel;
  emotion: EmotionState;
  isDaytime: boolean;
}): string {
  const relationshipText = getRelationshipPromptText(input.relationshipLevel);
  const emotionText = getEmotionPromptText(input.emotion);
  const timeText = input.isDaytime ? '白天自然光环境' : '夜晚室内暖光环境';

  return [
    '生成一张适合恋爱聊天场景的真实感人物照片。',
    `人物名称：${input.characterName}。`,
    `人物身份：${input.characterRole}。`,
    `人物外貌气质：${input.characterAppearance}。`,
    `关系阶段：${relationshipText}。`,
    `情绪状态：${emotionText}。`,
    `时间场景：${timeText}。`,
    `用户刚才的话是：${input.userMessage}。`,
    '要求像手机随手拍的生活照片或自拍，不要海报感，不要文字水印，不要多人，不要夸张构图。',
    '重点表现人物自然、亲近、适合私聊分享的状态。',
  ].join('');
}

function getRelationshipPromptText(level: RelationshipLevel): string {
  switch (level) {
    case 'familiar':
      return '已经熟悉，互动自然';
    case 'ambiguous':
      return '暧昧期，亲近感更强';
    case 'intimate':
      return '亲密关系，氛围甜蜜';
    default:
      return '刚认识，克制自然';
  }
}

function getEmotionPromptText(emotion: EmotionState): string {
  switch (emotion) {
    case 'happy':
      return '轻松开心';
    case 'miss_you':
      return '想念对方，温柔亲近';
    case 'caring':
      return '关心对方，温和体贴';
    case 'heartbroken_for_user':
      return '心疼对方，安慰感强';
    default:
      return '平静自然';
  }
}

function extractChatContent(responseText: string): string {
  const trimmed = responseText.trim();
  if (!trimmed) return '';

  try {
    return extractContentFromJson(JSON.parse(trimmed));
  } catch {
    // Keep compatibility in case an upstream provider returns line-delimited payloads.
  }

  let content = '';
  for (const line of trimmed.split(/\r?\n/)) {
    const payload = line.trim().replace(/^data:\s*/, '');
    if (!payload || payload === '[DONE]' || payload.startsWith(':')) continue;

    try {
      content += extractContentFromJson(JSON.parse(payload));
    } catch {
      content += payload;
    }
  }

  return content;
}

function sanitizeChatContent(content: string, hasImage: boolean): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  if (extractImageJsonOnlyContent(trimmed) !== null) {
    return hasImage ? '给你发张照片。' : '';
  }

  const withoutJsonBlocks = content.replace(/\{[\s\S]*?\}/g, (match) => {
    return extractImageJsonOnlyContent(match) !== null ? '' : match;
  });

  const withoutImageUrls = withoutJsonBlocks.replace(
    /https?:\/\/[^\s"'<>]+/gi,
    (url) => (looksLikeImageUrl(url) ? '' : url),
  );

  const normalized = withoutImageUrls
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (!hasImage) {
    return normalized;
  }

  const textWithoutImageDescription = removeImageDescriptionParagraphs(normalized);
  return textWithoutImageDescription || '给你发张照片。';
}

function removeImageDescriptionParagraphs(content: string): string {
  const paragraphs = content
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const filtered = paragraphs.filter((paragraph) => !shouldRemoveImageDescriptionParagraph(paragraph));
  return filtered.join('\n').trim();
}

function shouldRemoveImageDescriptionParagraph(paragraph: string): boolean {
  if (/^(照片|图片|场景|画面)\s*[：:]/.test(paragraph)) {
    return true;
  }

  const visualKeywords = ['穿着', '背景', '光线', '镜头', '构图', '视角', '表情', '姿势', '环境'];
  const matchedKeywordCount = visualKeywords.filter((keyword) => paragraph.includes(keyword)).length;

  if (matchedKeywordCount >= 2) {
    return true;
  }

  if (paragraph.length >= 30 && matchedKeywordCount >= 1) {
    return true;
  }

  return false;
}

function extractImageJsonOnlyContent(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    if (!isRecord(parsed)) return null;

    const imageValue = parsed.photo ?? parsed.imageUrl ?? parsed.image_url ?? parsed.url;
    if (typeof imageValue === 'string' && looksLikeImageUrl(imageValue)) {
      return imageValue;
    }

    return null;
  } catch {
    return null;
  }
}

function looksLikeImageUrl(url: string): boolean {
  return /^https?:\/\/[^\s"'<>]+\.(png|jpe?g|gif|webp|bmp|svg)(\?[^\s"'<>]*)?$/i.test(url)
    || /^https?:\/\/[^\s"'<>]+\?(?:[^#]*)(sign=|x-oss-process=|x-tos-|response-content-type=image)/i.test(url)
    || /\/image\/|\/images\/|image\//i.test(url);
}

function extractChatContentItem(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'text' in item) {
        const text = (item as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .join('');
}

function extractContentFromJson(data: unknown): string {
  if (!data || typeof data !== 'object') return '';

  const root = data as Record<string, unknown>;
  const choice = Array.isArray(root.choices) && isRecord(root.choices[0])
    ? root.choices[0]
    : undefined;
  const message = isRecord(root.message) ? root.message : undefined;
  const dataField = isRecord(root.data) ? root.data : undefined;
  const choiceMessage = isRecord(choice?.message) ? choice.message : undefined;
  const choiceDelta = isRecord(choice?.delta) ? choice.delta : undefined;
  const dataMessage = isRecord(dataField?.message) ? dataField.message : undefined;
  const candidates = [
    choiceMessage?.content,
    choiceDelta?.content,
    message?.content,
    dataMessage?.content,
    dataField?.content,
    root.content,
    root.output_text,
    root.text,
  ];

  for (const candidate of candidates) {
    const content = extractChatContentItem(candidate);
    if (content) return content;
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getPublicChatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('ENOTFOUND') || message.includes('fetch failed')) {
    return '模型服务地址无法访问，请稍后重试。';
  }

  if (message.includes('timeout')) {
    return '模型响应超时，请稍后再试。';
  }

  if (message.includes('401') || message.includes('403') || message.includes('API key')) {
    return '模型服务认证失败，请检查 OPENROUTER_API_KEY 是否正确。';
  }

  if (message.includes('429')) {
    return '模型服务请求过于频繁，请稍后再试。';
  }

  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return '模型服务暂时不可用，请稍后再试。';
  }

  return '模型服务暂时没有返回有效回复，请稍后重试。';
}
