const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

/**
 * GET /api/auth/status — Check connection status
 */
router.get("/status", async (req, res) => {
  try {
    const accounts = await facebookService.getOwnedAdAccounts(req.fbBusinessId, req.fbToken);
    res.json({
      success: true,
      connected: true,
      business_id: req.fbBusinessId,
      accounts_count: accounts.length,
      api_version: process.env.FB_API_VERSION || "v21.0",
    });
  } catch (e) {
    res.status(e.fbCode === 190 ? 401 : 502).json({
      success: false,
      connected: false,
      error: e.message,
    });
  }
});

/**
 * POST /api/auth/validate — Validate a Facebook token
 */
router.post("/validate", async (req, res) => {
  try {
    if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET) {
      return res.status(400).json({ success: false, error: "FB_APP_ID and FB_APP_SECRET required for token validation" });
    }
    const data = await facebookService.validateToken(req.body.token || req.fbToken);
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ success: false, error: "Token validation failed" });
  }
});

/**
 * POST /api/auth/exchange-token — Exchange short-lived token for long-lived
 */
router.post("/exchange-token", async (req, res) => {
  try {
    if (!req.body.token) {
      return res.status(400).json({ success: false, error: "Token is required" });
    }
    if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET) {
      return res.status(400).json({ success: false, error: "FB_APP_ID and FB_APP_SECRET required" });
    }
    const data = await facebookService.exchangeForLongLivedToken(req.body.token);
    res.json({ success: true, access_token: data.access_token, token_type: data.token_type });
  } catch (e) {
    res.status(502).json({ success: false, error: "Token exchange failed" });
  }
});

module.exports = router;
