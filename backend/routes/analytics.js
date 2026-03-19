const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

router.get("/overview", async (req, res) => {
  try {
    const { account_ids } = req.query;
    if (!account_ids) return res.json({ success: false, error: "account_ids required" });
    const ids = account_ids.split(",");
    const results = [];
    for (const id of ids.slice(0, 5)) {
      try {
        const r = await facebookService.graphRequest("GET", "/act_" + id + "/insights", { fields: "spend,impressions,clicks,ctr,cpc,cpm,actions", date_preset: "last_7d" }, req.fbToken);
        results.push({ account_id: id, data: r.data || [] });
      } catch (e) { results.push({ account_id: id, data: [], error: e.message }); }
    }
    res.json({ success: true, results });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
