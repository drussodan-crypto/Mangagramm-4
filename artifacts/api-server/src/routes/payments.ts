import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, chaptersTable, coinTransactionsTable, chapterUnlocksTable, seriesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { grantXp, getClassForXp } from "./xp";

const router: IRouter = Router();

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY || "";
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || "";
const AUTHOR_SHARE = 0.70;

export const COIN_PACKAGES = [
  { id: "coins_50", coins: 50, xof: 500, label: "50 Coins", popular: false },
  { id: "coins_120", coins: 120, xof: 1000, label: "120 Coins", popular: true },
  { id: "coins_260", coins: 260, xof: 2000, label: "260 Coins", popular: false },
  { id: "coins_700", coins: 700, xof: 5000, label: "700 Coins", popular: false },
  { id: "coins_1500", coins: 1500, xof: 10000, label: "1500 Coins", popular: false },
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
  const { packageId } = req.body;
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
    metadata: { packageId, label: pkg.label },
  }).returning();

  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
    res.status(503).json({
      error: "payment_gateway_not_configured",
      message: "Configurez CINETPAY_API_KEY et CINETPAY_SITE_ID.",
      transactionId,
      txnId: txn.id,
    });
    return;
  }

  try {
    const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0]?.trim();
    const base = domain ? `https://${domain}` : `http://localhost:80`;

    const payload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: pkg.xof,
      currency: "XOF",
      description: `MangaGramm - ${pkg.label}`,
      return_url: `${base}/coins?status=success`,
      notify_url: `${base}/api/payments/webhook/cinetpay`,
      customer_name: user.displayName || user.username,
      customer_email: user.email,
      customer_phone_number: user.payoutNumber || "",
      customer_address: "Abidjan, CI",
      customer_city: "Abidjan",
      customer_country: "CI",
      customer_state: "CI",
      customer_zip_code: "00225",
    };

    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (data.code === "201") {
      await db.update(coinTransactionsTable)
        .set({ cinetpayPaymentToken: data.data?.payment_token })
        .where(eq(coinTransactionsTable.id, txn.id));
      res.json({ paymentUrl: data.data?.payment_url, paymentToken: data.data?.payment_token, transactionId });
    } else {
      res.status(400).json({ error: "CinetPay error", details: data.message });
    }
  } catch (err: any) {
    console.error("CinetPay error:", err);
    res.status(500).json({ error: "Payment gateway error" });
  }
});

router.post("/payments/webhook/cinetpay", async (req: Request, res: Response): Promise<void> => {
  const { cpm_trans_id, cpm_site_id } = req.body;
  if (!cpm_trans_id) { res.status(400).json({ error: "Missing transaction ID" }); return; }

  try {
    const verifyRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: CINETPAY_API_KEY, site_id: cpm_site_id, transaction_id: cpm_trans_id }),
    });
    const verifyData = await verifyRes.json() as any;

    if (verifyData.data?.cpm_result !== "00") { res.json({ message: "Not successful" }); return; }

    const [txn] = await db.select().from(coinTransactionsTable)
      .where(eq(coinTransactionsTable.cinetpayTransactionId, cpm_trans_id));
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
    console.error("Webhook error:", err);
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
