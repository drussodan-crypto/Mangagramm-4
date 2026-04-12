import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { chaptersTable } from "./chapters";

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chaptersTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  imageUrl: text("image_url").notNull(),
  width: integer("width"),
  height: integer("height"),
});

export const insertPageSchema = createInsertSchema(pagesTable).omit({ id: true });
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pagesTable.$inferSelect;
