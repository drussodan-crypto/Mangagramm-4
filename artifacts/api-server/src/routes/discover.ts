import { Router, type IRouter } from "express";
import { eq, sql, desc, gte, and, inArray } from "drizzle-orm";
import {
  db, seriesTable, chaptersTable, usersTable, genresTable, followsTable,
  reactionsTable, readingHistoryTable, favoritesTable,
} from "@workspace/db";

const router: IRouter = Router();

/* ── Genres ────────────────────────────────────────────────────── */
router.get("/genres", async (_req, res): Promise<void> => {
  const genres = await db.select().from(genresTable);
  const allSeries = await db.select({ genres: seriesTable.genres }).from(seriesTable);
  const genresWithCount = genres.map((g) => ({
    ...g,
    seriesCount: allSeries.filter(s => s.genres && (s.genres as string[]).includes(g.slug)).length,
  }));
  res.json(genresWithCount);
});

/* ── Trending ──────────────────────────────────────────────────── */
router.get("/discover/trending", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "10"), 10);
  const trending = await db.select().from(seriesTable).orderBy(desc(seriesTable.viewCount)).limit(limit);
  const result = await Promise.all(trending.map(async (s) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
    const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable).where(eq(chaptersTable.seriesId, s.id));
    return { ...s, authorName: author?.displayName || author?.username || "Unknown", authorAvatar: author?.avatar || null, chapterCount: cc?.count || 0 };
  }));
  res.json(result);
});

/* ── Latest updates ────────────────────────────────────────────── */
router.get("/discover/latest-updates", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "20"), 10);
  const chapters = await db.select().from(chaptersTable).orderBy(desc(chaptersTable.createdAt)).limit(limit);
  const updates = await Promise.all(chapters.map(async (c) => {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, c.seriesId));
    if (!series) return null;
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, series.authorId));
    return {
      seriesId: series.id, seriesTitle: series.title, seriesCover: series.coverImage, seriesType: series.type,
      chapterId: c.id, chapterNumber: c.number, chapterTitle: c.title,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.avatar || null, publishedAt: c.publishedAt || c.createdAt,
    };
  }));
  res.json(updates.filter(Boolean));
});

/* ── Top 24h ───────────────────────────────────────────────────── */
router.get("/discover/top24h", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "8"), 10);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentChapters = await db.select({ seriesId: chaptersTable.seriesId }).from(chaptersTable).where(gte(chaptersTable.createdAt, since));
  const recentSeriesIds = [...new Set(recentChapters.map(c => c.seriesId))];
  let top: any[];
  if (recentSeriesIds.length > 0) {
    top = await db.select().from(seriesTable).where(inArray(seriesTable.id, recentSeriesIds)).orderBy(desc(seriesTable.viewCount)).limit(limit);
  } else {
    top = await db.select().from(seriesTable).orderBy(desc(seriesTable.viewCount)).limit(limit);
  }
  const result = await Promise.all(top.map(async (s) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
    const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable).where(eq(chaptersTable.seriesId, s.id));
    return { ...s, authorName: author?.displayName || author?.username || "Unknown", authorAvatar: author?.avatar || null, chapterCount: cc?.count || 0 };
  }));
  res.json(result);
});

/* ── Author score (helper) ──────────────────────────────────────
   score = reactions×3 + uniqueReads×1 + favorites×5 + followers×2 + views×0.1
   All computed in batch (6 queries for any number of authors).
──────────────────────────────────────────────────────────────── */
async function computeAuthorScores(authorIds: number[]): Promise<Map<number, {
  score: number; totalReactions: number; totalReads: number; totalFavorites: number;
  followersCount: number; totalViews: number;
}>> {
  if (authorIds.length === 0) return new Map();

  const [viewsRows, followersRows, reactionsRows, readsRows, favoritesRows] = await Promise.all([
    // Total views per author (from series)
    db.select({ authorId: seriesTable.authorId, total: sql<number>`coalesce(sum(${seriesTable.viewCount}), 0)::int` })
      .from(seriesTable).where(inArray(seriesTable.authorId, authorIds)).groupBy(seriesTable.authorId),

    // Followers per author
    db.select({ authorId: followsTable.followingId, count: sql<number>`count(*)::int` })
      .from(followsTable).where(inArray(followsTable.followingId, authorIds)).groupBy(followsTable.followingId),

    // Reactions on chapters belonging to this author
    db.select({ authorId: seriesTable.authorId, count: sql<number>`count(${reactionsTable.id})::int` })
      .from(reactionsTable)
      .innerJoin(chaptersTable, and(eq(reactionsTable.targetId, chaptersTable.id), eq(reactionsTable.targetType, "chapter")))
      .innerJoin(seriesTable, eq(chaptersTable.seriesId, seriesTable.id))
      .where(inArray(seriesTable.authorId, authorIds))
      .groupBy(seriesTable.authorId),

    // Unique chapter reads per author
    db.select({ authorId: seriesTable.authorId, count: sql<number>`count(${readingHistoryTable.id})::int` })
      .from(readingHistoryTable)
      .innerJoin(chaptersTable, eq(readingHistoryTable.chapterId, chaptersTable.id))
      .innerJoin(seriesTable, eq(chaptersTable.seriesId, seriesTable.id))
      .where(inArray(seriesTable.authorId, authorIds))
      .groupBy(seriesTable.authorId),

    // Favorites per author
    db.select({ authorId: seriesTable.authorId, count: sql<number>`count(${favoritesTable.id})::int` })
      .from(favoritesTable)
      .innerJoin(seriesTable, eq(favoritesTable.seriesId, seriesTable.id))
      .where(inArray(seriesTable.authorId, authorIds))
      .groupBy(seriesTable.authorId),
  ]);

  const toMap = <T extends { authorId: number }>(rows: T[]): Map<number, T> =>
    new Map(rows.map(r => [r.authorId, r]));

  const viewsMap   = toMap(viewsRows);
  const followsMap = toMap(followersRows);
  const reactsMap  = toMap(reactionsRows);
  const readsMap   = toMap(readsRows);
  const favsMap    = toMap(favoritesRows);

  const result = new Map<number, any>();
  for (const id of authorIds) {
    const totalViews     = viewsMap.get(id)?.total     || 0;
    const followersCount = followsMap.get(id)?.count   || 0;
    const totalReactions = reactsMap.get(id)?.count    || 0;
    const totalReads     = readsMap.get(id)?.count     || 0;
    const totalFavorites = favsMap.get(id)?.count      || 0;
    const score = totalReactions * 3 + totalReads * 1 + totalFavorites * 5 + followersCount * 2 + Math.floor(totalViews * 0.1);
    result.set(id, { score, totalReactions, totalReads, totalFavorites, followersCount, totalViews });
  }
  return result;
}

const FEATURED_EMAILS = ["drussodan@gmail.com", "mangagramm@gmail.com"];

/* ── Featured authors (homepage) ───────────────────────────────
   Scoring: reactions×3 + reads×1 + favorites×5 + followers×2 + views×0.1
   Featured emails always appear first.
──────────────────────────────────────────────────────────────── */
router.get("/discover/featured-authors", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "6"), 10);

  const allAuthors = await db.select().from(usersTable).where(eq(usersTable.role, "author")).limit(100);
  const authorIds = allAuthors.map(a => a.id);
  const scores = await computeAuthorScores(authorIds);

  const seriesCountMap = new Map<number, number>();
  if (authorIds.length > 0) {
    const sc = await db.select({ authorId: seriesTable.authorId, count: sql<number>`count(*)::int` })
      .from(seriesTable).where(inArray(seriesTable.authorId, authorIds)).groupBy(seriesTable.authorId);
    sc.forEach(r => seriesCountMap.set(r.authorId, r.count));
  }

  const withStats = allAuthors.map((a) => {
    const s = scores.get(a.id) || { score: 0, totalReactions: 0, totalReads: 0, totalFavorites: 0, followersCount: 0, totalViews: 0 };
    const isFeatured = FEATURED_EMAILS.includes(a.email || "");
    return {
      id: a.id, username: a.username, displayName: a.displayName, avatar: a.avatar, bio: a.bio, role: a.role,
      verified: (a as any).verified || isFeatured, featured: isFeatured,
      seriesCount: seriesCountMap.get(a.id) || 0,
      followersCount: s.followersCount,
      totalViews: s.totalViews,
      totalReactions: s.totalReactions,
      totalReads: s.totalReads,
      totalFavorites: s.totalFavorites,
      score: s.score,
    };
  });

  withStats.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.score - a.score;
  });

  res.json(withStats.slice(0, limit));
});

/* ── Top authors (global leaderboard) ──────────────────────────
   Same scoring, ordered by score descending.
──────────────────────────────────────────────────────────────── */
router.get("/discover/top-authors", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit || "10"), 10);

  const allAuthors = await db.select().from(usersTable).where(eq(usersTable.role, "author")).limit(200);
  const authorIds = allAuthors.map(a => a.id);
  const scores = await computeAuthorScores(authorIds);

  const seriesCountMap = new Map<number, number>();
  if (authorIds.length > 0) {
    const sc = await db.select({ authorId: seriesTable.authorId, count: sql<number>`count(*)::int` })
      .from(seriesTable).where(inArray(seriesTable.authorId, authorIds)).groupBy(seriesTable.authorId);
    sc.forEach(r => seriesCountMap.set(r.authorId, r.count));
  }

  const withStats = allAuthors.map((a) => {
    const s = scores.get(a.id) || { score: 0, totalReactions: 0, totalReads: 0, totalFavorites: 0, followersCount: 0, totalViews: 0 };
    const isFeatured = FEATURED_EMAILS.includes(a.email || "");
    return {
      id: a.id, username: a.username, displayName: a.displayName, avatar: a.avatar, bio: a.bio, role: a.role,
      verified: (a as any).verified || isFeatured,
      seriesCount: seriesCountMap.get(a.id) || 0,
      followersCount: s.followersCount,
      followingCount: 0,
      totalViews: s.totalViews,
      totalReactions: s.totalReactions,
      totalReads: s.totalReads,
      totalFavorites: s.totalFavorites,
      score: s.score,
      createdAt: a.createdAt,
    };
  });

  withStats.sort((a, b) => b.score - a.score);
  res.json(withStats.slice(0, limit));
});

/* ── Platform stats ────────────────────────────────────────────── */
router.get("/discover/stats", async (_req, res): Promise<void> => {
  const [totalSeries] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable);
  const [totalChapters] = await db.select({ count: sql<number>`count(*)::int` }).from(chaptersTable);
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalAuthors] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "author"));
  const [totalViews] = await db.select({ total: sql<number>`coalesce(sum(view_count), 0)::int` }).from(seriesTable);
  res.json({
    totalSeries: totalSeries?.count || 0, totalChapters: totalChapters?.count || 0,
    totalUsers: totalUsers?.count || 0, totalAuthors: totalAuthors?.count || 0,
    totalViews: totalViews?.total || 0,
  });
});

export default router;
