import { pgTable, text, serial, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["author", "reader", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  replitId: text("replit_id").unique(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  bio: text("bio"),
  role: userRoleEnum("role").notNull().default("reader"),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  earnedCoins: integer("earned_coins").notNull().default(0),
  classLevel: integer("class_level").notNull().default(4),
  lastSeenAt: timestamp("last_seen_at"),
  lastReadAt: timestamp("last_read_at"),
  payoutNumber: text("payout_number"),
  payoutMethod: text("payout_method").default("mtn"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
