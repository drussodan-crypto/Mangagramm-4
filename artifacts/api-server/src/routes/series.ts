import { Router, type IRouter } from "express";
import { eq, sql, desc, asc, ilike, and } from "drizzle-orm";
import { db, usersTable, seriesTable, chaptersTable } from "@workspace/db";
import { CreateSeriesBody, UpdateSeriesBody, ListSeriesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

router.get("/series", async (req, res): Promise<void> => {
  const params = ListSeriesQueryParams.safeParse(req.query);
  const { genre, status, type, sort, search, limit = 20, offset = 0 } = params.success ? params.data : {} as any;

  const conditions = [];
  if (status) conditions.push(eq(seriesTable.status, status));
  if (type) conditions.push(eq(seriesTable.type, type));
  if (search) conditions.push(ilike(seriesTable.title, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case "popular": orderBy = desc(seriesTable.viewCount); break;
    case "trending": orderBy = desc(seriesTable.likeCount); break;
    default: orderBy = desc(seriesTable.createdAt);
  }

  const allSeries = await db.select().from(seriesTable).where(where).orderBy(orderBy).limit(limit || 20).offset(offset || 0);

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable).where(where);
  const total = countResult?.count || 0;

  const seriesWithAuthors = await Promise.all(allSeries.map(async (s) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
    const [chapterCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable).where(eq(chaptersTable.seriesId, s.id));
    return {
      ...s,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.avatar || null,
      chapterCount: chapterCount?.count || 0,
    };
  }));

  let filteredSeries = seriesWithAuthors;
  if (genre) {
    filteredSeries = seriesWithAuthors.filter(s => s.genres && (s.genres as string[]).includes(genre));
  }

  res.json({
    series: filteredSeries,
    total,
    hasMore: (offset || 0) + (limit || 20) < total,
  });
});

router.post("/series", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSeriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug = slugify(parsed.data.title) + "-" + Date.now().toString(36);

  const [series] = await db.insert(seriesTable).values({
    title: parsed.data.title,
    slug,
    description: parsed.data.description || null,
    coverImage: parsed.data.coverImage || null,
    bannerImage: parsed.data.bannerImage || null,
    type: parsed.data.type,
    status: parsed.data.status || "ongoing",
    genres: parsed.data.genres || [],
    authorId: req.session.userId!,
    mature: parsed.data.mature || false,
  }).returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  res.status(201).json({
    ...series,
    authorName: author?.displayName || author?.username || "Unknown",
    authorAvatar: author?.avatar || null,
    chapterCount: 0,
  });
});

router.get("/series/:seriesId", async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, seriesId));
  if (!series) {
    res.status(404).json({ error: "Series not found" });
    return;
  }

  await db.update(seriesTable).set({ viewCount: sql`${seriesTable.viewCount} + 1` }).where(eq(seriesTable.id, seriesId));

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, series.authorId));
  const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.seriesId, seriesId)).orderBy(asc(chaptersTable.number));
  const [chapterCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable).where(eq(chaptersTable.seriesId, seriesId));

  res.json({
    ...series,
    authorName: author?.displayName || author?.username || "Unknown",
    authorAvatar: author?.avatar || null,
    chapterCount: chapterCount?.count || 0,
    chapters: chapters.map(c => ({
      ...c,
      pageCount: 0,
    })),
  });
});

router.put("/series/:seriesId", requireAuth, async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const [existing] = await db.select().from(seriesTable).where(eq(seriesTable.id, seriesId));
  if (!existing || existing.authorId !== req.session.userId!) {
    res.status(404).json({ error: "Series not found" });
    return;
  }

  const parsed = UpdateSeriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.coverImage !== undefined) updateData.coverImage = parsed.data.coverImage;
  if (parsed.data.bannerImage !== undefined) updateData.bannerImage = parsed.data.bannerImage;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.genres !== undefined) updateData.genres = parsed.data.genres;
  if (parsed.data.mature !== undefined) updateData.mature = parsed.data.mature;

  const [series] = await db.update(seriesTable).set(updateData).where(eq(seriesTable.id, seriesId)).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, series.authorId));

  res.json({
    ...series,
    authorName: author?.displayName || author?.username || "Unknown",
    authorAvatar: author?.avatar || null,
    chapterCount: 0,
  });
});

router.delete("/series/:seriesId", requireAuth, async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const [existing] = await db.select().from(seriesTable).where(eq(seriesTable.id, seriesId));
  if (!existing || existing.authorId !== req.session.userId!) {
    res.status(404).json({ error: "Series not found" });
    return;
  }

  await db.delete(seriesTable).where(eq(seriesTable.id, seriesId));
  res.json({ message: "Series deleted" });
});

export default router;
