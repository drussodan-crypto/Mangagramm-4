import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, reactionsTable, seriesTable, chaptersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"] as const;
type ReactionType = (typeof VALID_REACTIONS)[number];

const router: IRouter = Router();

router.post("/reactions/toggle", requireAuth, async (req, res): Promise<void> => {
  const { targetType, targetId, reactionType } = req.body;
  const userId = req.session.userId!;

  if (!targetType || !targetId || !reactionType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!VALID_REACTIONS.includes(reactionType)) {
    res.status(400).json({ error: "Invalid reaction type" });
    return;
  }

  const tid = parseInt(targetId, 10);

  const [existing] = await db
    .select()
    .from(reactionsTable)
    .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.targetType, targetType), eq(reactionsTable.targetId, tid)));

  let reacted = false;

  if (existing) {
    if (existing.reactionType === reactionType) {
      await db.delete(reactionsTable).where(eq(reactionsTable.id, existing.id));
      reacted = false;
      if (targetType === "series") {
        await db.update(seriesTable).set({ likeCount: sql`greatest(${seriesTable.likeCount} - 1, 0)` }).where(eq(seriesTable.id, tid));
      } else if (targetType === "chapter") {
        await db.update(chaptersTable).set({ likeCount: sql`greatest(${chaptersTable.likeCount} - 1, 0)` }).where(eq(chaptersTable.id, tid));
      }
    } else {
      await db.update(reactionsTable).set({ reactionType }).where(eq(reactionsTable.id, existing.id));
      reacted = true;
    }
  } else {
    await db.insert(reactionsTable).values({ userId, targetType, targetId: tid, reactionType });
    reacted = true;
    if (targetType === "series") {
      await db.update(seriesTable).set({ likeCount: sql`${seriesTable.likeCount} + 1` }).where(eq(seriesTable.id, tid));
    } else if (targetType === "chapter") {
      await db.update(chaptersTable).set({ likeCount: sql`${chaptersTable.likeCount} + 1` }).where(eq(chaptersTable.id, tid));
    }
  }

  const allReactions = await db
    .select({ reactionType: reactionsTable.reactionType, count: sql<number>`count(*)::int` })
    .from(reactionsTable)
    .where(and(eq(reactionsTable.targetType, targetType), eq(reactionsTable.targetId, tid)))
    .groupBy(reactionsTable.reactionType);

  const counts = Object.fromEntries(allReactions.map((r) => [r.reactionType, r.count]));
  const total = allReactions.reduce((sum, r) => sum + r.count, 0);

  res.json({
    reacted,
    reactionType: reacted ? reactionType : null,
    myReaction: reacted ? reactionType : null,
    counts,
    total,
  });
});

router.get("/reactions", async (req, res): Promise<void> => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) {
    res.status(400).json({ error: "Missing targetType or targetId" });
    return;
  }

  const tid = parseInt(targetId as string, 10);
  const userId = (req.session as any).userId;

  const allReactions = await db
    .select({ reactionType: reactionsTable.reactionType, count: sql<number>`count(*)::int` })
    .from(reactionsTable)
    .where(and(eq(reactionsTable.targetType, targetType as string), eq(reactionsTable.targetId, tid)))
    .groupBy(reactionsTable.reactionType);

  const counts = Object.fromEntries(allReactions.map((r) => [r.reactionType, r.count]));
  const total = allReactions.reduce((sum, r) => sum + r.count, 0);

  let myReaction: string | null = null;
  if (userId) {
    const [existing] = await db
      .select()
      .from(reactionsTable)
      .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.targetType, targetType as string), eq(reactionsTable.targetId, tid)));
    myReaction = existing?.reactionType || null;
  }

  res.json({ counts, total, myReaction });
});

export default router;
