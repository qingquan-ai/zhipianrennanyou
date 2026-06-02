import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });

async function main() {
  const { db, pool } = await import('../src/db');
  const { chatMessages, chatSessions, users } = await import('../src/db/schema');
  const verifyId = Date.now();

  const [user] = await db
    .insert(users)
    .values({
      email: `codex-db-verify-${verifyId}@example.local`,
      nickname: `DB verify ${verifyId}`,
    })
    .returning({ id: users.id });

  const [session] = await db
    .insert(chatSessions)
    .values({
      userId: user.id,
      title: `DB verify session ${verifyId}`,
    })
    .returning({ id: chatSessions.id });

  const [message] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      role: 'user',
      content: `DB verify message ${verifyId}`,
    })
    .returning({ id: chatMessages.id });

  const insertedUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: {
      chatSessions: {
        with: {
          messages: true,
        },
      },
    },
  });

  await pool.end();

  console.log(
    JSON.stringify(
      {
        ok: Boolean(insertedUser?.chatSessions[0]?.messages[0]),
        userId: user.id,
        sessionId: session.id,
        messageId: message.id,
        queriedEmail: insertedUser?.email,
        queriedSessionCount: insertedUser?.chatSessions.length || 0,
        queriedMessageCount: insertedUser?.chatSessions[0]?.messages.length || 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
