import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { grantXp } from "./xp";

const router: IRouter = Router();

router.post("/reading-history", requireAuth, async (req, res): Promise<void> => {
  const { chapterId } = req.body;
  const userId = req.session.userId!;

  if (!chapterId) { res.status(400).json({ error: "Missing chapterId" }); return; }

  try {
    await db.execute(sql.raw(`
      INSERT INTO reading_history (user_id, chapter_id, read_at)
      VALUES (${userId}, ${chapterId}, now())
      ON CONFLICT (user_id, chapter_id) DO UPDATE SET read_at = now()
    `));
  } catch (_e) {
    try {
      await db.execute(sql.raw(`
        INSERT INTO reading_history (user_id, chapter_id) VALUES (${userId}, ${chapterId})
        ON CONFLICT DO NOTHING
      `));
    } catch (_e2) {}
  }

  await db.update(usersTable).set({ lastReadAt: new Date() }).where(eq(usersTable.id, userId));

  await grantXp(userId, 5, "read_chapter");

  res.json({ ok: true });
});

router.get("/reading-history/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  try {
    const rows = await db.execute(sql.raw(`
      SELECT rh.*, c.title as chapter_title, c.number as chapter_number, s.title as series_title, s.id as series_id, s.cover_image
      FROM reading_history rh
      JOIN chapters c ON c.id = rh.chapter_id
      JOIN series s ON s.id = c.series_id
      WHERE rh.user_id = ${userId}
      ORDER BY rh.read_at DESC
      LIMIT 50
    `));
    res.json((rows as any).rows || []);
  } catch {
    res.json([]);
  }
});

export default router;
