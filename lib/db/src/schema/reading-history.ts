import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chaptersTable } from "./chapters";
import { seriesTable } from "./series";

export const readingHistoryTable = pgTable("reading_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  seriesId: integer("series_id").notNull().references(() => seriesTable.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (t) => [
  unique("reading_history_unique").on(t.userId, t.chapterId),
]);

export type ReadingHistory = typeof readingHistoryTable.$inferSelect;
