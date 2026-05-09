import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chaptersTable } from "./chapters";

export const coinTransactionsTable = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountXof: integer("amount_xof").notNull(),
  coinsGranted: integer("coins_granted").notNull(),
  status: text("status").notNull().default("pending"),
  cinetpayTransactionId: text("cinetpay_transaction_id"),
  cinetpayPaymentToken: text("cinetpay_payment_token"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const chapterUnlocksTable = pgTable("chapter_unlocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  coinsSpent: integer("coins_spent").notNull().default(0),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountCoins: integer("amount_coins").notNull(),
  amountXof: integer("amount_xof").notNull(),
  payoutMethod: text("payout_method").notNull().default("mtn"),
  payoutNumber: text("payout_number").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const xpEventsTable = pgTable("xp_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
