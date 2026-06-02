import { and, asc, count, desc, eq, ilike, isNotNull, ne, type SQL } from 'drizzle-orm';

import { chatMessages, chatSessions, users } from '@/db/schema';
import { buildPagination, type AdminListParams, type PaginationMeta } from '@/lib/admin/query';

type ChatSessionSelectRow = typeof chatSessions.$inferSelect;
type ChatMessageSelectRow = typeof chatMessages.$inferSelect;

export type AdminChatSessionListItem = {
  id: string;
  shortId: string;
  userId: string;
  userDisplayName: string;
  characterId: string;
  characterName: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminChatMessageItem = {
  role: string;
  content: string;
  imageUrl: string;
  audioUrl: string;
  createdAt: string;
};

export type AdminChatsResult = {
  rows: AdminChatSessionListItem[];
  pagination: PaginationMeta;
  characterOptions: string[];
  source: {
    ok: boolean;
    message?: string;
  };
};

export type AdminChatDetail = {
  session: AdminChatSessionListItem;
  messages: AdminChatMessageItem[];
  source: {
    ok: boolean;
    message?: string;
  };
};

type ChatSessionRow = Pick<
  ChatSessionSelectRow,
  'id' | 'userId' | 'characterId' | 'title' | 'createdAt' | 'updatedAt'
> & {
  messageCount: number;
  userEmail?: string | null;
  userNickname?: string | null;
};

const ADMIN_CHAT_CHARACTER_NAMES: Record<string, string> = {
  'gu-lie': '\u987e\u51bd',
  'lin-yu': '\u6797\u5c7f',
  'shen-mo': '\u6c88\u9ed8',
  'su-chen': '\u82cf\u6668',
};

export async function getAdminChats(params: AdminListParams): Promise<AdminChatsResult> {
  const empty = emptyChatsResult(params);
  if (!hasDatabaseUrl()) {
    return {
      ...empty,
      source: {
        ok: false,
        message: '未配置 DATABASE_URL/POSTGRES_URL，无法读取真实 chat_sessions 表。',
      },
    };
  }

  try {
    const { db } = await import('@/db');
    const where = buildChatsWhere(params);

    let countQuery = db.select({ value: count() }).from(chatSessions).$dynamic();
    if (where) countQuery = countQuery.where(where);
    const countRows = await countQuery;
    const total = Number(countRows[0]?.value || 0);
    const pagination = buildPagination({ page: params.page, pageSize: params.pageSize, total });

    let rowsQuery = db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        userEmail: users.email,
        userNickname: users.nickname,
        characterId: chatSessions.characterId,
        title: chatSessions.title,
        messageCount: count(chatMessages.id),
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .leftJoin(users, eq(users.id, chatSessions.userId))
      .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
      .groupBy(
        chatSessions.id,
        chatSessions.userId,
        users.email,
        users.nickname,
        chatSessions.characterId,
        chatSessions.title,
        chatSessions.createdAt,
        chatSessions.updatedAt,
      )
      .$dynamic();

    if (where) rowsQuery = rowsQuery.where(where);
    const rows = await rowsQuery
      .orderBy(desc(chatSessions.updatedAt), desc(chatSessions.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    return {
      rows: rows.map(mapAdminChatSession),
      pagination,
      characterOptions: await getCharacterOptions(),
      source: {
        ok: true,
      },
    };
  } catch (error) {
    return {
      ...empty,
      source: {
        ok: false,
        message: `chat_sessions 读取失败：${getErrorMessage(error)}`,
      },
    };
  }
}

export async function getAdminChatDetail(id: string): Promise<AdminChatDetail | null> {
  if (!hasDatabaseUrl()) return null;

  try {
    const { db } = await import('@/db');
    const [sessionRow] = await db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        userEmail: users.email,
        userNickname: users.nickname,
        characterId: chatSessions.characterId,
        title: chatSessions.title,
        messageCount: count(chatMessages.id),
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .leftJoin(users, eq(users.id, chatSessions.userId))
      .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
      .where(eq(chatSessions.id, id))
      .groupBy(
        chatSessions.id,
        chatSessions.userId,
        users.email,
        users.nickname,
        chatSessions.characterId,
        chatSessions.title,
        chatSessions.createdAt,
        chatSessions.updatedAt,
      )
      .limit(1);

    if (!sessionRow) return null;

    const messages = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
        imageUrl: chatMessages.imageUrl,
        audioUrl: chatMessages.audioUrl,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, id))
      .orderBy(asc(chatMessages.createdAt));

    return {
      session: mapAdminChatSession(sessionRow),
      messages: messages.map(mapAdminChatMessage),
      source: {
        ok: true,
      },
    };
  } catch {
    return null;
  }
}

export function mapAdminChatSession(row: ChatSessionRow): AdminChatSessionListItem {
  return {
    id: row.id,
    shortId: row.id.slice(0, 8),
    userId: row.userId || '',
    userDisplayName: getAdminChatUserDisplayName(row),
    characterId: row.characterId || '',
    characterName: getAdminChatCharacterName(row.characterId),
    title: row.title || '',
    messageCount: Number(row.messageCount || 0),
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  };
}

export function getAdminChatUserDisplayName(input: {
  userEmail?: string | null;
  userNickname?: string | null;
}): string {
  return input.userNickname?.trim() || input.userEmail?.trim() || '\u6e38\u5ba2';
}

export function getAdminChatCharacterName(characterId: string | null): string {
  if (!characterId) return '-';
  return ADMIN_CHAT_CHARACTER_NAMES[characterId] || characterId;
}

export function mapAdminChatMessage(
  row: Pick<ChatMessageSelectRow, 'role' | 'content' | 'imageUrl' | 'audioUrl' | 'createdAt'>,
): AdminChatMessageItem {
  return {
    role: row.role,
    content: row.content || '',
    imageUrl: row.imageUrl || '',
    audioUrl: row.audioUrl || '',
    createdAt: formatDate(row.createdAt),
  };
}

async function getCharacterOptions(): Promise<string[]> {
  const { db } = await import('@/db');
  const rows = await db
    .selectDistinct({ characterId: chatSessions.characterId })
    .from(chatSessions)
    .where(and(isNotNull(chatSessions.characterId), ne(chatSessions.characterId, '')))
    .orderBy(chatSessions.characterId);

  return rows.map((row) => row.characterId).filter(isDefinedString);
}

function buildChatsWhere(params: AdminListParams): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.search) {
    conditions.push(ilike(chatSessions.title, `%${params.search}%`));
  }

  if (params.status) {
    conditions.push(eq(chatSessions.characterId, params.status));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function emptyChatsResult(params: AdminListParams): AdminChatsResult {
  return {
    rows: [],
    pagination: buildPagination({ page: params.page, pageSize: params.pageSize, total: 0 }),
    characterOptions: [],
    source: {
      ok: false,
    },
  };
}

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isDefinedString(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0;
}
