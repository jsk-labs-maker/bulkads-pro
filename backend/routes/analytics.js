const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

/**
 * GET /api/analytics/overview?account_ids=id1,id2&date_preset=last_7d
 * Fetch insights for selected accounts (max 10)
 */
router.get("/overview", async (req, res) => {
  try {
    const { account_ids, date_preset } = req.query;
    if (!account_ids) {
      return res.status(400).json({ success: false, error: "account_ids required" });
    }

    const ids = account_ids.split(",")
      .map(id => id.trim().replace(/[^a-zA-Z0-9_]/g, ""))
      .filter(id => id.length > 0)
      .slice(0, 10);

    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: "No valid account IDs" });
    }

    const results = await Promise.allSettled(
      ids.map(id =>
        facebookService.graphRequest("GET", `/act_${id}/insights`, {
          fields: "spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,reach,frequency",
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

/**
 * GET /api/analytics/daily?account_ids=id1,id2&date_preset=last_7d
 * Fetch daily breakdown for charts
 */
router.get("/daily", async (req, res) => {
  try {
    const { account_ids, date_preset } = req.query;
    if (!account_ids) {
      return res.status(400).json({ success: false, error: "account_ids required" });
    }

    const ids = account_ids.split(",")
      .map(id => id.trim().replace(/[^a-zA-Z0-9_]/g, ""))
      .filter(id => id.length > 0)
      .slice(0, 5);

    const results = await Promise.allSettled(
      ids.map(id =>
        facebookService.graphRequest("GET", `/act_${id}/insights`, {
          fields: "spend,impressions,clicks,ctr,cpc,actions,reach",
          date_preset: date_preset || "last_7d",
          time_increment: 1, // Daily breakdown
        }, req.fbToken).then(r => ({ account_id: id, data: r.data || [] }))
      )
    );

    // Aggregate daily data across accounts
    const dailyMap = {};
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const day of r.value.data) {
        const date = day.date_start;
        if (!dailyMap[date]) {
          dailyMap[date] = { date, spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0 };
        }
        dailyMap[date].spend += parseFloat(day.spend || 0);
        dailyMap[date].impressions += parseInt(day.impressions || 0);
        dailyMap[date].clicks += parseInt(day.clicks || 0);
        dailyMap[date].reach += parseInt(day.reach || 0);
        // Extract purchases from actions
        if (day.actions) {
          const purchase = day.actions.find(a => a.action_type === "purchase" || a.action_type === "omni_purchase");
          if (purchase) dailyMap[date].purchases += parseInt(purchase.value || 0);
        }
      }
    }

    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, daily });
  } catch (e) {
    res.status(500).json({ success: false, error: "Daily analytics fetch failed" });
  }
});

/**
 * GET /api/analytics/active-spend?account_ids=id1,id2
 * Get today's spend for active campaigns (for budget calculator)
 */
router.get("/active-spend", async (req, res) => {
  try {
    const { account_ids } = req.query;
    if (!account_ids) {
      return res.status(400).json({ success: false, error: "account_ids required" });
    }

    const ids = account_ids.split(",")
      .map(id => id.trim().replace(/[^a-zA-Z0-9_]/g, ""))
      .filter(id => id.length > 0)
      .slice(0, 20);

    const results = await Promise.allSettled(
      ids.map(id =>
        facebookService.graphRequest("GET", `/act_${id}/insights`, {
          fields: "spend,account_currency,account_name",
          date_preset: "today",
        }, req.fbToken).then(r => {
          const d = r.data?.[0] || {};
          return { account_id: id, spend_today: parseFloat(d.spend || 0), currency: d.account_currency || "USD", name: d.account_name || id };
        })
      )
    );

    const formatted = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { account_id: ids[i], spend_today: 0, currency: "USD", error: r.reason?.message };
    });

    const totalSpend = formatted.reduce((sum, a) => sum + a.spend_today, 0);

    res.json({ success: true, accounts: formatted, total_spend_today: totalSpend });
  } catch (e) {
    res.status(500).json({ success: false, error: "Active spend fetch failed" });
  }
});

module.exports = router;
