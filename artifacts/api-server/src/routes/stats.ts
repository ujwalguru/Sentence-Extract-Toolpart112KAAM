import { Router, type IRouter } from "express";
import { db, siteStats, platformStats } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

async function ensureRow() {
  await db
    .insert(siteStats)
    .values({ id: 1, visitors: 15420, uses: 8940, donations: 0 })
    .onConflictDoNothing();
}

router.get("/stats", async (req, res) => {
  try {
    await ensureRow();
    const [row] = await db.select().from(siteStats).where(eq(siteStats.id, 1));
    res.json({ visitors: row.visitors, uses: row.uses, donations: row.donations });
  } catch (err) {
    req.log.error(err, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/stats/platforms", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(platformStats)
      .orderBy(desc(platformStats.count));
    res.json(rows);
  } catch (err) {
    req.log.error(err, "Failed to get platform stats");
    res.status(500).json({ error: "Failed to get platform stats" });
  }
});

router.post("/stats/visit", async (req, res) => {
  try {
    await ensureRow();
    const [row] = await db
      .update(siteStats)
      .set({ visitors: sql`${siteStats.visitors} + 1`, updatedAt: sql`now()` })
      .where(eq(siteStats.id, 1))
      .returning();
    res.json({ visitors: row.visitors });
  } catch (err) {
    req.log.error(err, "Failed to increment visit");
    res.status(500).json({ error: "Failed to increment visit" });
  }
});

router.post("/stats/use", async (req, res) => {
  try {
    await ensureRow();
    const [row] = await db
      .update(siteStats)
      .set({ uses: sql`${siteStats.uses} + 1`, updatedAt: sql`now()` })
      .where(eq(siteStats.id, 1))
      .returning();

    const platform: string = (req.body?.platform as string) || "Other";
    await db
      .insert(platformStats)
      .values({ platform, count: 1 })
      .onConflictDoUpdate({
        target: platformStats.platform,
        set: { count: sql`${platformStats.count} + 1`, updatedAt: sql`now()` },
      });

    res.json({ uses: row.uses, platform });
  } catch (err) {
    req.log.error(err, "Failed to increment use");
    res.status(500).json({ error: "Failed to increment use" });
  }
});

export default router;
