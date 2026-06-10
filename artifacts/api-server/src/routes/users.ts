import { Router, type IRouter } from "express";
import { eq, sql, ilike, inArray, and } from "drizzle-orm";
import {
  db, usersTable, seriesTable, followsTable, chaptersTable,
  reactionsTable, readingHistoryTable,
} from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/users/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string || "").trim();
  if (!q || q.length < 2) { res.json([]); return; }
  const results = await db.select({
    id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName,
    avatar: usersTable.avatar, role: usersTable.role, xp: usersTable.xp,
  }).from(usersTable).where(ilike(usersTable.username, `%${q}%`)).limit(10);
  res.json(results);
});

/* ── GET /users/:userId — full profile with author stats ────────
   Returns totalViews, totalLikes (reactions), totalReads for authors.
──────────────────────────────────────────────────────────────── */
router.get("/users/:userId", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [seriesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable).where(eq(seriesTable.authorId, userId));
  const [followersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, userId));
  const [totalViews] = await db.select({ total: sql<number>`coalesce(sum(view_count), 0)::int` }).from(seriesTable).where(eq(seriesTable.authorId, userId));

  // Author-specific stats: total reactions + total unique reads
  let totalLikes = 0;
  let totalReads = 0;
  if (user.role === "author") {
    // Get all this author's chapter IDs
    const authorChapters = await db.select({ id: chaptersTable.id })
      .from(chaptersTable)
      .innerJoin(seriesTable, eq(chaptersTable.seriesId, seriesTable.id))
      .where(eq(seriesTable.authorId, userId));

    if (authorChapters.length > 0) {
      const chapterIds = authorChapters.map(c => c.id);

      const [reactionsOnChapters] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reactionsTable)
        .where(and(eq(reactionsTable.targetType, "chapter"), inArray(reactionsTable.targetId, chapterIds)));

      const [reads] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(readingHistoryTable)
        .where(inArray(readingHistoryTable.chapterId, chapterIds));

      totalLikes = reactionsOnChapters?.count || 0;
      totalReads = reads?.count || 0;
    }

    // Also count reactions on their series
    const [reactionsOnSeries] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reactionsTable)
      .innerJoin(seriesTable, and(eq(reactionsTable.targetId, seriesTable.id), eq(reactionsTable.targetType, "series")))
      .where(eq(seriesTable.authorId, userId));

    totalLikes += reactionsOnSeries?.count || 0;
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    ...userWithoutPassword,
    seriesCount: seriesCount?.count || 0,
    followersCount: followersCount?.count || 0,
    followingCount: followingCount?.count || 0,
    totalViews: totalViews?.total || 0,
    totalLikes,
    totalReads,
  });
});

router.get("/users/:userId/series", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const series = await db.select().from(seriesTable).where(eq(seriesTable.authorId, userId));
  res.json(series.map(s => ({
    ...s, authorName: user.displayName || user.username, authorAvatar: user.avatar, chapterCount: 0,
  })));
});

router.put("/users/me/update", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { displayName, bio, avatar } = parsed.data;
  const [updated] = await db.update(usersTable).set({
    displayName: displayName || null, bio: bio || null, avatar: avatar || null,
  }).where(eq(usersTable.id, req.session.userId!)).returning();
  const { password: _, ...userWithoutPassword } = updated;
  res.json(userWithoutPassword);
});

router.get("/users/:userId/chapters", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const authorSeries = await db.select({ id: seriesTable.id, title: seriesTable.title })
    .from(seriesTable).where(eq(seriesTable.authorId, userId));
  if (authorSeries.length === 0) { res.json([]); return; }
  const seriesIds = authorSeries.map(s => s.id);
  const chapters = await db.select().from(chaptersTable).where(inArray(chaptersTable.seriesId, seriesIds));
  const seriesMap = new Map(authorSeries.map(s => [s.id, s.title]));
  res.json(chapters.map(c => ({ ...c, seriesTitle: seriesMap.get(c.seriesId) || "" })));
});

export default router;
