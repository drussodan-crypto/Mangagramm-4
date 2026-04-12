import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { seriesTable } from "./series";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  seriesId: integer("series_id").notNull().references(() => seriesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("favorites_unique").on(t.userId, t.seriesId),
]);

export type Favorite = typeof favoritesTable.$inferSelect;
