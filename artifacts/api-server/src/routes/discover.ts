import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, seriesTable, chaptersTable, usersTable, genresTable, followsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/genres", async (_req, res): Promise<void> => {
  const genres = await db.select().from(genresTable);

  const genresWithCount = await Promise.all(genres.map(async (g) => {
    const allSeries = await db.select().from(seriesTable);
    const count = allSeries.filter(s => s.genres && (s.genres as string[]).includes(g.slug)).length;
    return { ...g, seriesCount: count };
  }));

  res.json(genresWithCount);
});

router.get("/discover/trending", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "10"), 10);

  const trending = await db.select().from(seriesTable).orderBy(desc(seriesTable.viewCount)).limit(limit);

  const trendingWithAuthors = await Promise.all(trending.map(async (s) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
    const [chapterCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable).where(eq(chaptersTable.seriesId, s.id));
    return {
      ...s,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.avatar || null,
      chapterCount: chapterCount?.count || 0,
    };
  }));

  res.json(trendingWithAuthors);
});

router.get("/discover/latest-updates", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "20"), 10);

  const chapters = await db.select().from(chaptersTable).orderBy(desc(chaptersTable.createdAt)).limit(limit);

  const updates = await Promise.all(chapters.map(async (c) => {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, c.seriesId));
    if (!series) return null;
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, series.authorId));
    return {
      seriesId: series.id,
      seriesTitle: series.title,
      seriesCover: series.coverImage,
      seriesType: series.type,
      chapterId: c.id,
      chapterNumber: c.number,
      chapterTitle: c.title,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.avatar || null,
      publishedAt: c.publishedAt || c.createdAt,
    };
  }));

  res.json(updates.filter(Boolean));
});

router.get("/discover/top-authors", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "10"), 10);

  const authors = await db.select().from(usersTable).where(eq(usersTable.role, "author")).limit(limit);

  const authorsWithStats = await Promise.all(authors.map(async (a) => {
    const [seriesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable).where(eq(seriesTable.authorId, a.id));
    const [followersCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, a.id));
    const [totalViews] = await db.select({ total: sql<number>`coalesce(sum(view_count), 0)::int` }).from(seriesTable).where(eq(seriesTable.authorId, a.id));

    return {
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      avatar: a.avatar,
      bio: a.bio,
      role: a.role,
      seriesCount: seriesCount?.count || 0,
      followersCount: followersCountResult?.count || 0,
      followingCount: 0,
      totalViews: totalViews?.total || 0,
      createdAt: a.createdAt,
    };
  }));

  res.json(authorsWithStats);
});

router.get("/discover/stats", async (_req, res): Promise<void> => {
  const [totalSeries] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable);
  const [totalChapters] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable);
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalAuthors] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "author"));
  const [totalViews] = await db.select({ total: sql<number>`coalesce(sum(view_count), 0)::int` }).from(seriesTable);

  res.json({
    totalSeries: totalSeries?.count || 0,
    totalChapters: totalChapters?.count || 0,
    totalUsers: totalUsers?.count || 0,
    totalAuthors: totalAuthors?.count || 0,
    totalViews: totalViews?.total || 0,
  });
});

export default router;
