import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { chatMessages } from '@/db/schema';
import type { SessionMessageResponseItem } from '@/lib/chat/sessionMessages';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = decodeURIComponent(id || '').trim();

  if (!sessionId) {
    return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
  }

  try {
    const { db } = await import('@/db');
    const rows = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        imageUrl: chatMessages.imageUrl,
        audioUrl: chatMessages.audioUrl,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    const messages: SessionMessageResponseItem[] = rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      image_url: row.imageUrl,
      audio_url: row.audioUrl,
      created_at: row.createdAt.toISOString(),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[chat session messages] request failed', error);
    return NextResponse.json(
      { error: 'Chat session messages request failed' },
      { status: 500 },
    );
  }
}
