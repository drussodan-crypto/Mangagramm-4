import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, usersTable, xpEventsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

export const CLASS_LEVELS = [
  { level: 4, name: "Classe 4", minXp: 0, maxXp: 99, discount: 0, color: "#6b7280" },
  { level: 3, name: "Classe 3", minXp: 100, maxXp: 299, discount: 0, color: "#3b82f6" },
  { level: 2, name: "Classe 2", minXp: 300, maxXp: 599, discount: 0, color: "#8b5cf6" },
  { level: 1, name: "Classe 1", minXp: 600, maxXp: 999, discount: 5, color: "#f59e0b" },
  { level: 0, name: "Classe S", minXp: 1000, maxXp: 1999, discount: 15, color: "#ef4444" },
  { level: -1, name: "Niveau Dieu", minXp: 2000, maxXp: Infinity, discount: 25, color: "#a855f7" },
];

export function getClassForXp(xp: number) {
  for (const cls of [...CLASS_LEVELS].reverse()) {
    if (xp >= cls.minXp) return cls;
  }
  return CLASS_LEVELS[0];
}

export async function grantXp(userId: number, delta: number, reason: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const newXp = Math.max(0, (user.xp || 0) + delta);
  const newClass = getClassForXp(newXp);

  await db.update(usersTable).set({ xp: newXp, classLevel: newClass.level >= 0 ? newClass.level : 0 }).where(eq(usersTable.id, userId));
  await db.insert(xpEventsTable).values({ userId, delta, reason });
}

router.get("/xp/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select({ xp: usersTable.xp, classLevel: usersTable.classLevel }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const cls = getClassForXp(user.xp);
  const nextCls = CLASS_LEVELS[CLASS_LEVELS.indexOf(cls) - 1];

  const events = await db.select().from(xpEventsTable).where(eq(xpEventsTable.userId, userId)).orderBy(desc(xpEventsTable.createdAt)).limit(10);

  res.json({
    xp: user.xp,
    currentClass: cls,
    nextClass: nextCls || null,
    progressToNext: nextCls ? Math.round(((user.xp - cls.minXp) / (nextCls.minXp - cls.minXp)) * 100) : 100,
    events,
  });
});

export default router;
