import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const platformStats = pgTable("platform_stats", {
  platform: text("platform").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlatformStat = typeof platformStats.$inferSelect;
