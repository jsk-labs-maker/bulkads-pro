const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

router.get("/status", async (req, res) => {
  try {
    const accounts = await facebookService.getOwnedAdAccounts(req.fbBusinessId, req.fbToken);
    res.json({ success: true, connected: true, business_id: req.fbBusinessId, accounts_count: accounts.length, api_version: process.env.FB_API_VERSION || "v21.0" });
  } catch (e) {
    res.json({ success: false, connected: false, error: e.message });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const data = await facebookService.validateToken(req.body.token || req.fbToken);
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post("/exchange-token", async (req, res) => {
  try {
    const data = await facebookService.exchangeForLongLivedToken(req.body.token);
    res.json({ success: true, ...data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
