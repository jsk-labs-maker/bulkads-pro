const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

/**
 * GET /api/analytics/overview?account_ids=id1,id2
 * Fetch insights for selected accounts (max 10)
 */
router.get("/overview", async (req, res) => {
  try {
    const { account_ids, date_preset } = req.query;
    if (!account_ids) {
      return res.status(400).json({ success: false, error: "account_ids query parameter required" });
    }

    // Sanitize and limit account IDs
    const ids = account_ids.split(",")
      .map(id => id.trim().replace(/[^a-zA-Z0-9_]/g, ""))
      .filter(id => id.length > 0)
      .slice(0, 10);

    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: "No valid account IDs provided" });
    }

    // Fetch insights in parallel (with limit)
    const results = await Promise.allSettled(
      ids.map(id =>
        facebookService.graphRequest("GET", `/act_${id}/insights`, {
          fields: "spend,impressions,clicks,ctr,cpc,cpm,actions",
          date_preset: date_preset || "last_7d",
        }, req.fbToken).then(r => ({ account_id: id, data: r.data || [] }))
      )
    );

    const formatted = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { account_id: ids[i], data: [], error: r.reason?.message || "Failed" };
    });

    res.json({ success: true, results: formatted });
  } catch (e) {
    res.status(500).json({ success: false, error: "Analytics fetch failed" });
  }
});

module.exports = router;
