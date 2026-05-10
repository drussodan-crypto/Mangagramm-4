import { Router, type IRouter } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { db, messageThreadsTable, messagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Get all DM threads for current user
router.get("/messages/threads", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const threads = await db
    .select()
    .from(messageThreadsTable)
    .where(or(eq(messageThreadsTable.user1Id, userId), eq(messageThreadsTable.user2Id, userId)))
    .orderBy(desc(messageThreadsTable.lastMessageAt));

  const enriched = await Promise.all(threads.map(async (t) => {
    const otherId = t.user1Id === userId ? t.user2Id : t.user1Id;
    const [other] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.threadId, t.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    const [unread] = await db.select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(and(eq(messagesTable.threadId, t.id), eq(messagesTable.read, false), eq(messagesTable.senderId, otherId)));
    return {
      ...t,
      other: other ? { id: other.id, username: other.username, displayName: other.displayName, avatar: other.avatar } : null,
      lastMessage: lastMsg || null,
      unreadCount: unread?.count || 0,
    };
  }));

  res.json(enriched);
});

// Get or create thread with a user
router.post("/messages/threads", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { recipientId } = req.body;
  if (!recipientId || isNaN(Number(recipientId))) {
    res.status(400).json({ error: "recipientId required" });
    return;
  }
  const rId = Number(recipientId);
  if (rId === userId) { res.status(400).json({ error: "Cannot message yourself" }); return; }

  const [existing] = await db.select().from(messageThreadsTable).where(
    or(
      and(eq(messageThreadsTable.user1Id, userId), eq(messageThreadsTable.user2Id, rId)),
      and(eq(messageThreadsTable.user1Id, rId), eq(messageThreadsTable.user2Id, userId)),
    )
  );

  if (existing) { res.json(existing); return; }

  const [thread] = await db.insert(messageThreadsTable).values({ user1Id: userId, user2Id: rId }).returning();
  res.status(201).json(thread);
});

// Get messages in a thread
router.get("/messages/threads/:threadId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const threadId = parseInt(req.params.threadId, 10);
  if (isNaN(threadId)) { res.status(400).json({ error: "Invalid thread ID" }); return; }

  const [thread] = await db.select().from(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
  if (!thread || (thread.user1Id !== userId && thread.user2Id !== userId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.threadId, threadId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  // Mark as read
  await db.update(messagesTable)
    .set({ read: true })
    .where(and(eq(messagesTable.threadId, threadId), eq(messagesTable.read, false)));

  res.json(messages.reverse());
});

// Send a message
router.post("/messages/threads/:threadId/send", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const threadId = parseInt(req.params.threadId, 10);
  if (isNaN(threadId)) { res.status(400).json({ error: "Invalid thread ID" }); return; }

  const [thread] = await db.select().from(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
  if (!thread || (thread.user1Id !== userId && thread.user2Id !== userId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { content, imageUrl } = req.body;
  if (!content && !imageUrl) { res.status(400).json({ error: "content or imageUrl required" }); return; }

  const [msg] = await db.insert(messagesTable).values({ threadId, senderId: userId, content: content || null, imageUrl: imageUrl || null }).returning();
  await db.update(messageThreadsTable).set({ lastMessageAt: new Date() }).where(eq(messageThreadsTable.id, threadId));

  res.status(201).json(msg);
});

// Unread count
router.get("/messages/unread-count", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const threads = await db.select({ id: messageThreadsTable.id, user1Id: messageThreadsTable.user1Id, user2Id: messageThreadsTable.user2Id })
    .from(messageThreadsTable)
    .where(or(eq(messageThreadsTable.user1Id, userId), eq(messageThreadsTable.user2Id, userId)));

  let total = 0;
  for (const t of threads) {
    const otherId = t.user1Id === userId ? t.user2Id : t.user1Id;
    const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(messagesTable)
      .where(and(eq(messagesTable.threadId, t.id), eq(messagesTable.read, false), eq(messagesTable.senderId, otherId)));
    total += r?.count || 0;
  }
  res.json({ count: total });
});

export default router;
