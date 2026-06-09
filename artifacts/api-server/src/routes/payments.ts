import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, chaptersTable, coinTransactionsTable, chapterUnlocksTable, seriesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { grantXp, getClassForXp } from "./xp";

const router: IRouter = Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const AUTHOR_SHARE = 0.70;

export const COIN_PACKAGES = [
  { id: "coins_20", coins: 20, xof: 100, label: "20 Coins", popular: false },
  { id: "coins_50", coins: 50, xof: 250, label: "50 Coins", popular: false },
  { id: "coins_120", coins: 120, xof: 600, label: "120 Coins", popular: true },
  { id: "coins_260", coins: 260, xof: 1300, label: "260 Coins", popular: false },
  { id: "coins_700", coins: 700, xof: 3500, label: "700 Coins", popular: false },
  { id: "coins_1500", coins: 1500, xof: 7500, label: "1500 Coins", popular: false },
];

router.get("/payments/packages", (_req, res) => {
  res.json(COIN_PACKAGES);
});

router.get("/payments/balance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db
    .select({ coins: usersTable.coins, earnedCoins: usersTable.earnedCoins })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  res.json(user || { coins: 0, earnedCoins: 0 });
});

router.post("/payments/initiate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { packageId, email: emailOverride } = req.body;
  const userId = req.session.userId!;

  const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) { res.status(400).json({ error: "Invalid package" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const transactionId = `MG-${Date.now()}-${userId}`;

  const [txn] = await db.insert(coinTransactionsTable).values({
    userId,
    amountXof: pkg.xof,
    coinsGranted: pkg.coins,
    status: "pending",
    cinetpayTransactionId: transactionId,
    metadata: { packageId, label: pkg.label, gateway: "paystack" },
  }).returning();

  if (!PAYSTACK_SECRET_KEY) {
    res.status(503).json({
      error: "payment_gateway_not_configured",
      message: "Clé Paystack non configurée.",
      transactionId,
      txnId: txn.id,
    });
    return;
  }

  try {
    const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0]?.trim();
    const base = domain ? `https://${domain}` : `http://localhost:80`;

    const customerEmail = emailOverride || user.email || `${userId}@mangagramm.app`;
    // Paystack amounts are in kobo for NGN, pesewas for GHS, or just the unit for XOF
    // XOF is supported by Paystack (Côte d'Ivoire, Sénégal)
    const amountInCents = pkg.xof * 100;

    const payload = {
      email: customerEmail,
      amount: amountInCents,
      currency: "GHS", // Paystack supports GHS (Ghana), NGN, ZAR, KES, USD — use GHS as proxy
      reference: transactionId,
      callback_url: `${base}/coins?status=success&ref=${transactionId}`,
      metadata: {
        user_id: userId,
        package_id: packageId,
        coins: pkg.coins,
        txn_id: txn.id,
        custom_fields: [
          { display_name: "Coins", variable_name: "coins", value: pkg.coins },
          { display_name: "Package", variable_name: "package", value: pkg.label },
        ],
      },
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (data.status === true && data.data?.authorization_url) {
      res.json({
        paymentUrl: data.data.authorization_url,
        reference: transactionId,
        txnId: txn.id,
      });
    } else {
      res.status(400).json({ error: "Paystack error", details: data.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Payment gateway error" });
  }
});

router.get("/payments/verify/:reference", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { reference } = req.params;
  if (!PAYSTACK_SECRET_KEY) { res.status(503).json({ error: "Not configured" }); return; }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json() as any;

    if (verifyData.status !== true || verifyData.data?.status !== "success") {
      res.json({ verified: false, status: verifyData.data?.status });
      return;
    }

    const [txn] = await db.select().from(coinTransactionsTable)
      .where(eq(coinTransactionsTable.cinetpayTransactionId, reference));
    if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
    if (txn.status === "confirmed") { res.json({ verified: true, alreadyProcessed: true }); return; }

    await db.update(coinTransactionsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(coinTransactionsTable.id, txn.id));

    await db.update(usersTable)
      .set({ coins: sql`${usersTable.coins} + ${txn.coinsGranted}` })
      .where(eq(usersTable.id, txn.userId));

    await grantXp(txn.userId, 5, "coin_purchase");

    const [updatedUser] = await db.select({ coins: usersTable.coins }).from(usersTable).where(eq(usersTable.id, txn.userId));
    res.json({ verified: true, coinsGranted: txn.coinsGranted, balance: updatedUser?.coins || 0 });
  } catch (err) {
    res.status(500).json({ error: "Verification error" });
  }
});

router.post("/payments/webhook/paystack", async (req: Request, res: Response): Promise<void> => {
  const event = req.body;
  if (event.event !== "charge.success") { res.json({ message: "Ignored" }); return; }

  const reference = event.data?.reference;
  if (!reference) { res.status(400).json({ error: "Missing reference" }); return; }

  try {
    const [txn] = await db.select().from(coinTransactionsTable)
      .where(eq(coinTransactionsTable.cinetpayTransactionId, reference));
    if (!txn || txn.status === "confirmed") { res.json({ message: "Already processed" }); return; }

    await db.update(coinTransactionsTable)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(coinTransactionsTable.id, txn.id));

    await db.update(usersTable)
      .set({ coins: sql`${usersTable.coins} + ${txn.coinsGranted}` })
      .where(eq(usersTable.id, txn.userId));

    await grantXp(txn.userId, 5, "coin_purchase");

    res.json({ message: "Confirmed" });
  } catch (err) {
    res.status(500).json({ error: "Webhook error" });
  }
});

router.post("/payments/unlock-chapter", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { chapterId } = req.body;
  const userId = req.session.userId!;
  if (!chapterId) { res.status(400).json({ error: "Missing chapterId" }); return; }

  const cId = parseInt(chapterId, 10);
  const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.id, cId));
  if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
  if (!chapter.isPremium) { res.json({ unlocked: true, free: true }); return; }

  const [existing] = await db.select().from(chapterUnlocksTable)
    .where(and(eq(chapterUnlocksTable.userId, userId), eq(chapterUnlocksTable.chapterId, cId)));
  if (existing) { res.json({ unlocked: true, alreadyOwned: true }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const cls = getClassForXp(user.xp || 0);
  const discount = cls.discount || 0;
  const finalPrice = Math.max(1, Math.round(chapter.coinPrice * (1 - discount / 100)));

  if ((user.coins || 0) < finalPrice) {
    res.status(402).json({ error: "insufficient_coins", required: finalPrice, balance: user.coins, discount });
    return;
  }

  await db.update(usersTable)
    .set({ coins: sql`${usersTable.coins} - ${finalPrice}` })
    .where(eq(usersTable.id, userId));

  await db.insert(chapterUnlocksTable).values({ userId, chapterId: cId, coinsSpent: finalPrice });

  const authorEarnings = Math.floor(finalPrice * AUTHOR_SHARE);
  const [seriesRow] = await db.select({ authorId: seriesTable.authorId })
    .from(seriesTable)
    .where(eq(seriesTable.id, chapter.seriesId));
  if (seriesRow?.authorId) {
    await db.update(usersTable)
      .set({ earnedCoins: sql`${usersTable.earnedCoins} + ${authorEarnings}` })
      .where(eq(usersTable.id, seriesRow.authorId));
  }

  await grantXp(userId, 3, "premium_unlock");
  res.json({ unlocked: true, coinsSpent: finalPrice, discount, balance: (user.coins || 0) - finalPrice });
});

router.get("/payments/unlocked", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const unlocks = await db.select({ chapterId: chapterUnlocksTable.chapterId })
    .from(chapterUnlocksTable).where(eq(chapterUnlocksTable.userId, userId));
  res.json(unlocks.map((u) => u.chapterId));
});

export default router;
