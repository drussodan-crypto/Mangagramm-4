import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reactionsTable = pgTable("reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: integer("target_id").notNull(),
  reactionType: varchar("reaction_type", { length: 20 }).notNull().default("like"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueUserTarget: unique().on(t.userId, t.targetType, t.targetId),
}));
