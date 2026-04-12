import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, settingsTable, notificationsTable, readingHistoryTable, chaptersTable, seriesTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.session.userId!));

  if (!settings) {
    [settings] = await db.insert(settingsTable).values({ userId: req.session.userId! }).returning();
  }

  res.json(settings);
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.theme !== undefined) updateData.theme = parsed.data.theme;
  if (parsed.data.language !== undefined) updateData.language = parsed.data.language;
  if (parsed.data.emailNotifications !== undefined) updateData.emailNotifications = parsed.data.emailNotifications;
  if (parsed.data.pushNotifications !== undefined) updateData.pushNotifications = parsed.data.pushNotifications;
  if (parsed.data.matureContent !== undefined) updateData.matureContent = parsed.data.matureContent;
  if (parsed.data.readingDirection !== undefined) updateData.readingDirection = parsed.data.readingDirection;
  if (parsed.data.autoNextChapter !== undefined) updateData.autoNextChapter = parsed.data.autoNextChapter;
  if (parsed.data.pageLayout !== undefined) updateData.pageLayout = parsed.data.pageLayout;

  let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.session.userId!));

  if (settings) {
    [settings] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.userId, req.session.userId!)).returning();
  } else {
    [settings] = await db.insert(settingsTable).values({ userId: req.session.userId!, ...updateData } as any).returning();
  }

  res.json(settings);
});

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const unreadOnly = req.query.unreadOnly === "true";

  let notifications;
  if (unreadOnly) {
    notifications = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userId, req.session.userId!), eq(notificationsTable.read, false)))
      .orderBy(desc(notificationsTable.createdAt));
  } else {
    notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.session.userId!))
      .orderBy(desc(notificationsTable.createdAt));
  }

  res.json(notifications);
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, req.session.userId!));
  res.json({ message: "All notifications marked as read" });
});

router.post("/notifications/:notificationId/read", requireAuth, async (req, res): Promise<void> => {
  const notificationId = parseInt(Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId, 10);
  if (isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, notificationId));
  res.json({ message: "Notification marked as read" });
});

router.get("/reading-history", requireAuth, async (req, res): Promise<void> => {
  const history = await db.select().from(readingHistoryTable)
    .where(eq(readingHistoryTable.userId, req.session.userId!))
    .orderBy(desc(readingHistoryTable.readAt));

  const historyWithDetails = await Promise.all(history.map(async (h) => {
    const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, h.chapterId));
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, h.seriesId));
    return {
      id: h.id,
      seriesId: h.seriesId,
      seriesTitle: series?.title || "Unknown",
      seriesCover: series?.coverImage || null,
      chapterId: h.chapterId,
      chapterNumber: chapter?.number || 0,
      chapterTitle: chapter?.title || "Unknown",
      readAt: h.readAt,
    };
  }));

  res.json(historyWithDetails);
});

router.post("/reading-history/:chapterId", requireAuth, async (req, res): Promise<void> => {
  const chapterId = parseInt(Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId, 10);
  if (isNaN(chapterId)) {
    res.status(400).json({ error: "Invalid chapter ID" });
    return;
  }

  const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, chapterId));
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const existing = await db.select().from(readingHistoryTable)
    .where(and(
      eq(readingHistoryTable.userId, req.session.userId!),
      eq(readingHistoryTable.chapterId, chapterId),
    ));

  if (existing.length > 0) {
    await db.update(readingHistoryTable).set({ readAt: new Date() })
      .where(and(
        eq(readingHistoryTable.userId, req.session.userId!),
        eq(readingHistoryTable.chapterId, chapterId),
      ));
  } else {
    await db.insert(readingHistoryTable).values({
      userId: req.session.userId!,
      seriesId: chapter.seriesId,
      chapterId,
    });
  }

  res.json({ message: "Reading tracked" });
});

export default router;
