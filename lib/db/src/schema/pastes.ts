import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pastes = pgTable("pastes", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type Paste = typeof pastes.$inferSelect;
