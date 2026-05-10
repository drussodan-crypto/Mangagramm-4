import { pgTable, text, serial, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const themeEnum = pgEnum("theme_setting", ["light", "dark", "system"]);
export const readingDirectionEnum = pgEnum("reading_direction", ["ltr", "rtl"]);
export const pageLayoutEnum = pgEnum("page_layout", ["single", "double", "scroll"]);

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  theme: themeEnum("theme").notNull().default("light"),
  language: text("language").notNull().default("fr"),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  matureContent: boolean("mature_content").notNull().default(false),
  readingDirection: readingDirectionEnum("reading_direction").notNull().default("ltr"),
  autoNextChapter: boolean("auto_next_chapter").notNull().default(true),
  pageLayout: pageLayoutEnum("page_layout").notNull().default("scroll"),
  hideOnlineStatus: boolean("hide_online_status").notNull().default(false),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
