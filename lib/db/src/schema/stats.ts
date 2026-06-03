import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const siteStats = pgTable("site_stats", {
  id: integer("id").primaryKey().default(1),
  visitors: integer("visitors").notNull().default(15420),
  uses: integer("uses").notNull().default(8940),
  donations: integer("donations").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SiteStats = typeof siteStats.$inferSelect;
