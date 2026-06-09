import { Router, type IRouter } from "express";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db, reactionsTable, seriesTable, chaptersTable, pagesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"] as const;
type ReactionType = (typeof VALID_REACTIONS)[number];

const router: IRouter = Router();

/* ── Toggle reaction on any target ───────────────────────────────
   targetType: "chapter" | "series" | "page"
   targetId: id of the target entity
   reactionType: one of VALID_REACTIONS
──────────────────────────────────────────────────────────────── */
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

  const validTargetTypes = ["chapter", "series", "page"];
  if (!validTargetTypes.includes(targetType)) {
    res.status(400).json({ error: "Invalid targetType" });
    return;
  }

  const tid = parseInt(targetId, 10);
  if (isNaN(tid)) { res.status(400).json({ error: "Invalid targetId" }); return; }

  const [existing] = await db
    .select()
    .from(reactionsTable)
    .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.targetType, targetType), eq(reactionsTable.targetId, tid)));

  let reacted = false;

  if (existing) {
    if (existing.reactionType === reactionType) {
      // Same reaction → remove (toggle off)
      await db.delete(reactionsTable).where(eq(reactionsTable.id, existing.id));
      reacted = false;
      if (targetType === "series") {
        await db.update(seriesTable).set({ likeCount: sql`greatest(${seriesTable.likeCount} - 1, 0)` }).where(eq(seriesTable.id, tid));
      } else if (targetType === "chapter") {
        await db.update(chaptersTable).set({ likeCount: sql`greatest(${chaptersTable.likeCount} - 1, 0)` }).where(eq(chaptersTable.id, tid));
      }
      // "page" targetType has no dedicated counter column, reactions table is the source of truth
    } else {
      // Different reaction → switch
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

/* ── GET reactions for a single target ───────────────────────── */
router.get("/reactions", async (req, res): Promise<void> => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) {
    res.status(400).json({ error: "Missing targetType or targetId" });
    return;
  }

  const tid = parseInt(targetId as string, 10);
  if (isNaN(tid)) { res.status(400).json({ error: "Invalid targetId" }); return; }
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

/* ── GET all page reactions for a chapter in one request ────────
   Query: ?chapterId=X
   Response: Record<pageId, { counts, myReaction, total }>
   This lets the reader load ALL page reactions in a single fetch
   instead of one request per page (N+1 avoided).
──────────────────────────────────────────────────────────────── */
router.get("/reactions/page-reactions", async (req, res): Promise<void> => {
  const chapterId = parseInt(String(req.query.chapterId || "0"), 10);
  if (!chapterId) { res.json({}); return; }

  const userId = (req.session as any).userId;

  // Get all page IDs for this chapter
  const pageRows = await db
    .select({ id: pagesTable.id })
    .from(pagesTable)
    .where(eq(pagesTable.chapterId, chapterId));

  if (pageRows.length === 0) { res.json({}); return; }

  const pageIds = pageRows.map((p) => p.id);

  // Aggregate all reactions for all pages in one query
  const allReactions = await db
    .select({
      targetId: reactionsTable.targetId,
      reactionType: reactionsTable.reactionType,
      count: sql<number>`count(*)::int`,
    })
    .from(reactionsTable)
    .where(
      and(
        eq(reactionsTable.targetType, "page"),
        inArray(reactionsTable.targetId, pageIds)
      )
    )
    .groupBy(reactionsTable.targetId, reactionsTable.reactionType);

  // Build result map
  const result: Record<number, { counts: Record<string, number>; myReaction: string | null; total: number }> = {};

  for (const r of allReactions) {
    if (!result[r.targetId]) result[r.targetId] = { counts: {}, myReaction: null, total: 0 };
    result[r.targetId].counts[r.reactionType] = r.count;
    result[r.targetId].total += r.count;
  }

  // Fetch the current user's reactions on these pages
  if (userId) {
    const myReactions = await db
      .select({ targetId: reactionsTable.targetId, reactionType: reactionsTable.reactionType })
      .from(reactionsTable)
      .where(
        and(
          eq(reactionsTable.userId, userId),
          eq(reactionsTable.targetType, "page"),
          inArray(reactionsTable.targetId, pageIds)
        )
      );

    for (const r of myReactions) {
      if (!result[r.targetId]) result[r.targetId] = { counts: {}, myReaction: null, total: 0 };
      result[r.targetId].myReaction = r.reactionType;
    }
  }

  res.json(result);
});

export default router;
