import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, payoutsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const COIN_TO_XOF = 10;

router.get("/payouts/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const payouts = await db.select().from(payoutsTable).where(eq(payoutsTable.userId, userId)).orderBy(desc(payoutsTable.createdAt)).limit(20);
  const [user] = await db.select({ earnedCoins: usersTable.earnedCoins, payoutNumber: usersTable.payoutNumber, payoutMethod: usersTable.payoutMethod }).from(usersTable).where(eq(usersTable.id, userId));
  res.json({ payouts, earnedCoins: user?.earnedCoins || 0, payoutNumber: user?.payoutNumber || "", payoutMethod: user?.payoutMethod || "mtn", coinToXof: COIN_TO_XOF });
});

router.post("/payouts/request", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { amountCoins, payoutMethod, payoutNumber } = req.body;
  const userId = req.session.userId!;

  if (!amountCoins || amountCoins < 100) { res.status(400).json({ error: "Minimum withdrawal is 100 coins" }); return; }
  if (!payoutNumber) { res.status(400).json({ error: "Payout number required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if ((user.earnedCoins || 0) < amountCoins) { res.status(402).json({ error: "Insufficient earned coins" }); return; }

  const amountXof = amountCoins * COIN_TO_XOF;

  await db.update(usersTable).set({
    earnedCoins: (user.earnedCoins || 0) - amountCoins,
    payoutNumber,
    payoutMethod: payoutMethod || "mtn",
  }).where(eq(usersTable.id, userId));

  const [payout] = await db.insert(payoutsTable).values({
    userId,
    amountCoins,
    amountXof,
    payoutMethod: payoutMethod || "mtn",
    payoutNumber,
    status: "pending",
  }).returning();

  res.status(201).json({ ...payout, message: `Retrait de ${amountXof} XOF demandé. Traitement sous 48h.` });
});

router.put("/payouts/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { payoutNumber, payoutMethod } = req.body;
  const userId = req.session.userId!;
  await db.update(usersTable).set({ payoutNumber, payoutMethod: payoutMethod || "mtn" }).where(eq(usersTable.id, userId));
  res.json({ message: "Settings updated" });
});

router.get("/payouts/admin", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const payouts = await db.select().from(payoutsTable).orderBy(desc(payoutsTable.createdAt)).limit(100);
  res.json(payouts);
});

router.put("/payouts/:id/process", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const payoutId = parseInt(req.params.id, 10);
  const { status, note } = req.body;

  const [payout] = await db.update(payoutsTable)
    .set({ status, note, processedAt: new Date() })
    .where(eq(payoutsTable.id, payoutId))
    .returning();

  res.json(payout);
});

export default router;
