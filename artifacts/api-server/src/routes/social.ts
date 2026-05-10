import { Router, type IRouter } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import { db, commentsTable, likesTable, followsTable, favoritesTable, usersTable, seriesTable, chaptersTable } from "@workspace/db";
import { CreateCommentBody, ToggleLikeBody, ToggleFavoriteBody, CheckLikeQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/comments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageUrl, parentId } = req.body;

  const [comment] = await db.insert(commentsTable).values({
    chapterId: parsed.data.chapterId,
    userId: req.session.userId!,
    content: parsed.data.content,
    imageUrl: imageUrl || null,
    parentId: parentId || null,
  }).returning();

  await db.update(chaptersTable).set({ commentCount: sql`${chaptersTable.commentCount} + 1` }).where(eq(chaptersTable.id, parsed.data.chapterId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  res.status(201).json({
    ...comment,
    username: user?.username || "Unknown",
    userAvatar: user?.avatar || null,
  });
});

router.get("/comments/chapter/:chapterId", async (req, res): Promise<void> => {
  const chapterId = parseInt(Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId, 10);
  if (isNaN(chapterId)) {
    res.status(400).json({ error: "Invalid chapter ID" });
    return;
  }

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.chapterId, chapterId)).orderBy(desc(commentsTable.createdAt));

  const commentsWithUsers = await Promise.all(comments.map(async (c) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId));
    return {
      ...c,
      username: user?.username || "Unknown",
      userAvatar: user?.avatar || null,
    };
  }));

  res.json(commentsWithUsers);
});

router.put("/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const commentId = parseInt(Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment ID" }); return; }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
  if (comment.userId !== req.session.userId!) { res.status(403).json({ error: "Not your comment" }); return; }

  const { content, imageUrl } = req.body;
  if (!content && !imageUrl) { res.status(400).json({ error: "content or imageUrl required" }); return; }

  const [updated] = await db.update(commentsTable).set({
    content: content || comment.content,
    imageUrl: imageUrl !== undefined ? imageUrl : comment.imageUrl,
    editedAt: new Date(),
  }).where(eq(commentsTable.id, commentId)).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId));
  res.json({ ...updated, username: user?.username || "Unknown", userAvatar: user?.avatar || null });
});

router.delete("/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const commentId = parseInt(Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId, 10);
  if (isNaN(commentId)) {
    res.status(400).json({ error: "Invalid comment ID" });
    return;
  }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (comment && comment.userId !== req.session.userId!) {
    res.status(403).json({ error: "Not your comment" });
    return;
  }
  if (comment) {
    await db.update(chaptersTable).set({ commentCount: sql`greatest(${chaptersTable.commentCount} - 1, 0)` }).where(eq(chaptersTable.id, comment.chapterId));
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.json({ message: "Comment deleted" });
});

router.post("/likes/toggle", requireAuth, async (req, res): Promise<void> => {
  const parsed = ToggleLikeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { targetType, targetId } = parsed.data;
  const userId = req.session.userId!;

  const [existing] = await db.select().from(likesTable).where(
    and(eq(likesTable.userId, userId), eq(likesTable.targetType, targetType), eq(likesTable.targetId, targetId))
  );

  let liked: boolean;
  if (existing) {
    await db.delete(likesTable).where(eq(likesTable.id, existing.id));
    liked = false;
    if (targetType === "series") {
      await db.update(seriesTable).set({ likeCount: sql`greatest(${seriesTable.likeCount} - 1, 0)` }).where(eq(seriesTable.id, targetId));
    } else {
      await db.update(chaptersTable).set({ likeCount: sql`greatest(${chaptersTable.likeCount} - 1, 0)` }).where(eq(chaptersTable.id, targetId));
    }
  } else {
    await db.insert(likesTable).values({ userId, targetType, targetId });
    liked = true;
    if (targetType === "series") {
      await db.update(seriesTable).set({ likeCount: sql`${seriesTable.likeCount} + 1` }).where(eq(seriesTable.id, targetId));
    } else {
      await db.update(chaptersTable).set({ likeCount: sql`${chaptersTable.likeCount} + 1` }).where(eq(chaptersTable.id, targetId));
    }
  }

  const [likeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(
    and(eq(likesTable.targetType, targetType), eq(likesTable.targetId, targetId))
  );

  res.json({ liked, likeCount: likeCount?.count || 0 });
});

router.get("/likes/check", async (req, res): Promise<void> => {
  const params = CheckLikeQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { targetType, targetId } = params.data;
  const userId = (req.session as any).userId;

  let liked = false;
  if (userId) {
    const [existing] = await db.select().from(likesTable).where(
      and(eq(likesTable.userId, userId), eq(likesTable.targetType, targetType), eq(likesTable.targetId, targetId))
    );
    liked = !!existing;
  }

  const [likeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(likesTable).where(
    and(eq(likesTable.targetType, targetType), eq(likesTable.targetId, targetId))
  );

  res.json({ liked, likeCount: likeCount?.count || 0 });
});

router.post("/follows/:authorId", requireAuth, async (req, res): Promise<void> => {
  const authorId = parseInt(Array.isArray(req.params.authorId) ? req.params.authorId[0] : req.params.authorId, 10);
  if (isNaN(authorId)) {
    res.status(400).json({ error: "Invalid author ID" });
    return;
  }

  const userId = req.session.userId!;
  const [existing] = await db.select().from(followsTable).where(
    and(eq(followsTable.followerId, userId), eq(followsTable.followingId, authorId))
  );

  if (existing) {
    await db.delete(followsTable).where(eq(followsTable.id, existing.id));
  } else {
    await db.insert(followsTable).values({ followerId: userId, followingId: authorId });
  }

  const [followersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, authorId));

  res.json({ following: !existing, followersCount: followersCount?.count || 0 });
});

router.get("/follows/:authorId", async (req, res): Promise<void> => {
  const authorId = parseInt(Array.isArray(req.params.authorId) ? req.params.authorId[0] : req.params.authorId, 10);
  if (isNaN(authorId)) {
    res.status(400).json({ error: "Invalid author ID" });
    return;
  }

  const userId = (req.session as any).userId;
  let following = false;
  if (userId) {
    const [existing] = await db.select().from(followsTable).where(
      and(eq(followsTable.followerId, userId), eq(followsTable.followingId, authorId))
    );
    following = !!existing;
  }

  const [followersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, authorId));

  res.json({ following, followersCount: followersCount?.count || 0 });
});

router.get("/follows/me/following", requireAuth, async (req, res): Promise<void> => {
  const follows = await db.select().from(followsTable).where(eq(followsTable.followerId, req.session.userId!));

  const users = await Promise.all(follows.map(async (f) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, f.followingId));
    return user ? {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
    } : null;
  }));

  res.json(users.filter(Boolean));
});

router.get("/follows/:userId/followers", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const follows = await db.select().from(followsTable).where(eq(followsTable.followingId, userId));

  const users = await Promise.all(follows.map(async (f) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, f.followerId));
    return user ? {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
    } : null;
  }));

  res.json(users.filter(Boolean));
});

router.post("/favorites/toggle", requireAuth, async (req, res): Promise<void> => {
  const parsed = ToggleFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { seriesId } = parsed.data;

  const [existing] = await db.select().from(favoritesTable).where(
    and(eq(favoritesTable.userId, userId), eq(favoritesTable.seriesId, seriesId))
  );

  if (existing) {
    await db.delete(favoritesTable).where(eq(favoritesTable.id, existing.id));
    await db.update(seriesTable).set({ favoriteCount: sql`greatest(${seriesTable.favoriteCount} - 1, 0)` }).where(eq(seriesTable.id, seriesId));
  } else {
    await db.insert(favoritesTable).values({ userId, seriesId });
    await db.update(seriesTable).set({ favoriteCount: sql`${seriesTable.favoriteCount} + 1` }).where(eq(seriesTable.id, seriesId));
  }

  const [favoriteCount] = await db.select({ count: sql<number>`count(*)::int` }).from(favoritesTable).where(eq(favoritesTable.seriesId, seriesId));

  res.json({ favorited: !existing, favoriteCount: favoriteCount?.count || 0 });
});

router.get("/favorites/me", requireAuth, async (req, res): Promise<void> => {
  const favs = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, req.session.userId!));

  const seriesList = await Promise.all(favs.map(async (f) => {
    const [s] = await db.select().from(seriesTable).where(eq(seriesTable.id, f.seriesId));
    if (!s) return null;
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, s.authorId));
    return {
      ...s,
      authorName: author?.displayName || author?.username || "Unknown",
      authorAvatar: author?.avatar || null,
      chapterCount: 0,
    };
  }));

  res.json(seriesList.filter(Boolean));
});

router.get("/favorites/check/:seriesId", async (req, res): Promise<void> => {
  const seriesId = parseInt(Array.isArray(req.params.seriesId) ? req.params.seriesId[0] : req.params.seriesId, 10);
  if (isNaN(seriesId)) {
    res.status(400).json({ error: "Invalid series ID" });
    return;
  }

  const userId = (req.session as any).userId;
  let favorited = false;
  if (userId) {
    const [existing] = await db.select().from(favoritesTable).where(
      and(eq(favoritesTable.userId, userId), eq(favoritesTable.seriesId, seriesId))
    );
    favorited = !!existing;
  }

  const [favoriteCount] = await db.select({ count: sql<number>`count(*)::int` }).from(favoritesTable).where(eq(favoritesTable.seriesId, seriesId));

  res.json({ favorited, favoriteCount: favoriteCount?.count || 0 });
});

export default router;
