import { Router, type IRouter } from "express";
import { eq, sql, asc, and, gt, lt } from "drizzle-orm";
import { db, chaptersTable, pagesTable, seriesTable } from "@workspace/db";
import { CreateChapterBody, UpdateChapterBody, AddPagesBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/series/:seriesId/chapters", async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.seriesId, seriesId)).orderBy(asc(chaptersTable.number));

  const chaptersWithPages = await Promise.all(chapters.map(async (c) => {
    const [pageCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pagesTable).where(eq(pagesTable.chapterId, c.id));
    return { ...c, pageCount: pageCount?.count || 0 };
  }));

  res.json(chaptersWithPages);
});

router.post("/series/:seriesId/chapters", requireAuth, async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, seriesId));
  if (!series || series.authorId !== req.session.userId!) {
    res.status(404).json({ error: "Series not found" });
    return;
  }

  const parsed = CreateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [chapter] = await db.insert(chaptersTable).values({
    seriesId,
    number: parsed.data.number,
    title: parsed.data.title,
    published: parsed.data.published ?? true,
    publishedAt: parsed.data.published !== false ? new Date() : null,
  }).returning();

  await db.update(seriesTable).set({ updatedAt: new Date() }).where(eq(seriesTable.id, seriesId));

  res.status(201).json({ ...chapter, pageCount: 0 });
});

router.get("/chapters/:chapterId", async (req, res): Promise<void> => {
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

  await db.update(chaptersTable).set({ viewCount: sql`${chaptersTable.viewCount} + 1` }).where(eq(chaptersTable.id, chapterId));

  const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, chapter.seriesId));
  const pages = await db.select().from(pagesTable).where(eq(pagesTable.chapterId, chapterId)).orderBy(asc(pagesTable.pageNumber));

  const [prevChapter] = await db.select({ id: chaptersTable.id }).from(chaptersTable)
    .where(and(eq(chaptersTable.seriesId, chapter.seriesId), lt(chaptersTable.number, chapter.number)))
    .orderBy(asc(chaptersTable.number))
    .limit(1);

  const [nextChapter] = await db.select({ id: chaptersTable.id }).from(chaptersTable)
    .where(and(eq(chaptersTable.seriesId, chapter.seriesId), gt(chaptersTable.number, chapter.number)))
    .orderBy(asc(chaptersTable.number))
    .limit(1);

  res.json({
    ...chapter,
    seriesTitle: series?.title || "Unknown",
    pages,
    previousChapterId: prevChapter?.id || null,
    nextChapterId: nextChapter?.id || null,
    pageCount: pages.length,
  });
});

router.put("/chapters/:chapterId", requireAuth, async (req, res): Promise<void> => {
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

  const parsed = UpdateChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.published !== undefined) {
    updateData.published = parsed.data.published;
    if (parsed.data.published) updateData.publishedAt = new Date();
  }

  const [updated] = await db.update(chaptersTable).set(updateData).where(eq(chaptersTable.id, chapterId)).returning();
  const [pageCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pagesTable).where(eq(pagesTable.chapterId, chapterId));

  res.json({ ...updated, pageCount: pageCount?.count || 0 });
});

router.delete("/chapters/:chapterId", requireAuth, async (req, res): Promise<void> => {
  const chapterId = parseInt(Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId, 10);
  if (isNaN(chapterId)) {
    res.status(400).json({ error: "Invalid chapter ID" });
    return;
  }

  await db.delete(chaptersTable).where(eq(chaptersTable.id, chapterId));
  res.json({ message: "Chapter deleted" });
});

router.post("/chapters/:chapterId/pages", requireAuth, async (req, res): Promise<void> => {
  const chapterId = parseInt(Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId, 10);
  if (isNaN(chapterId)) {
    res.status(400).json({ error: "Invalid chapter ID" });
    return;
  }

  const parsed = AddPagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const insertedPages = await Promise.all(parsed.data.pages.map(async (p) => {
    const [page] = await db.insert(pagesTable).values({
      chapterId,
      pageNumber: p.pageNumber,
      imageUrl: p.imageUrl,
      width: p.width || null,
      height: p.height || null,
    }).returning();
    return page;
  }));

  res.status(201).json(insertedPages);
});

export default router;
