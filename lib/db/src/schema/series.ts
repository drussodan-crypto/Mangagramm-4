import { pgTable, text, serial, timestamp, integer, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const seriesTypeEnum = pgEnum("series_type", ["manga", "webtoon", "comic", "light-novel"]);
export const seriesStatusEnum = pgEnum("series_status", ["ongoing", "completed", "hiatus"]);

export const seriesTable = pgTable("series", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImage: text("cover_image"),
  bannerImage: text("banner_image"),
  type: seriesTypeEnum("type").notNull(),
  status: seriesStatusEnum("status").notNull().default("ongoing"),
  genres: jsonb("genres").$type<string[]>().default([]),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mature: boolean("mature").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  favoriteCount: integer("favorite_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSeriesSchema = createInsertSchema(seriesTable).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, likeCount: true, favoriteCount: true });
export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Series = typeof seriesTable.$inferSelect;
