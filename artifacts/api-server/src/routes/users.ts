import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, seriesTable, followsTable, chaptersTable, pagesTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/users/:userId", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [seriesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(seriesTable).where(eq(seriesTable.authorId, userId));
  const [followersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [followingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, userId));
  const [totalViews] = await db.select({ total: sql<number>`coalesce(sum(view_count), 0)::int` }).from(seriesTable).where(eq(seriesTable.authorId, userId));

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    ...userWithoutPassword,
    seriesCount: seriesCount?.count || 0,
    followersCount: followersCount?.count || 0,
    followingCount: followingCount?.count || 0,
    totalViews: totalViews?.total || 0,
  });
});

router.get("/users/:userId/series", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const series = await db.select().from(seriesTable).where(eq(seriesTable.authorId, userId));

  res.json(series.map(s => ({
    ...s,
    authorName: user.displayName || user.username,
    authorAvatar: user.avatar,
    chapterCount: 0,
  })));
});

router.put("/users/me/update", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName;
  if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
  if (parsed.data.avatar !== undefined) updateData.avatar = parsed.data.avatar;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.session.userId!)).returning();
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.get("/users/:userId/chapters", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const rows = await db.execute(
    sql.raw(`
      SELECT c.*, s.title as series_title
      FROM chapters c
      JOIN series s ON s.id = c.series_id
      WHERE s.author_id = ${userId}
      ORDER BY c.published_at DESC NULLS LAST
      LIMIT 100
    `)
  );

  res.json((rows as any).rows?.map((r: any) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    seriesTitle: r.series_title,
    seriesId: r.series_id,
    viewCount: r.view_count,
    isPremium: r.is_premium,
    coinPrice: r.coin_price,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  })) || []);
});

export default router;
