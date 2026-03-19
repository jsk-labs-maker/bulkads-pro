/**
 * ══════════════════════════════════════════════════════════════
 * Routes: Ad Accounts
 * ══════════════════════════════════════════════════════════════
 * 
 * GET  /api/accounts           — Fetch all ad accounts
 * GET  /api/accounts/:id       — Get single account details
 * GET  /api/accounts/pages     — Get Facebook Pages for creative
 */

const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

/**
 * GET /api/accounts
 * Fetch all ad accounts (owned + client) from the Business Manager
 */
router.get("/", async (req, res) => {
  try {
    const businessId = req.fbBusinessId;
    const token = req.fbToken;

    logger.info("Fetching all ad accounts", { businessId });

    const accounts = await facebookService.getAllAdAccounts(businessId, token);

    // Transform to friendly format
    const formatted = accounts.map((acc) => ({
      id: acc.id,
      account_id: acc.account_id,
      name: acc.name,
      status: acc.account_status === 1 ? "active" : acc.account_status === 2 ? "disabled" : "paused",
      account_status_code: acc.account_status,
      currency: acc.currency,
      timezone: acc.timezone_name,
      amount_spent: acc.amount_spent ? (parseInt(acc.amount_spent) / 100).toFixed(2) : "0.00",
      balance: acc.balance ? (parseInt(acc.balance) / 100).toFixed(2) : "0.00",
      business_name: acc.business_name || "",
      spend_cap: acc.spend_cap,
      disable_reason: acc.disable_reason,
    }));

    res.json({
      success: true,
      count: formatted.length,
      accounts: formatted,
    });
  } catch (error) {
    logger.error("Failed to fetch ad accounts", { error: error.message });
    res.status(error.code === 190 ? 401 : 500).json({
      success: false,
      error: error.message || "Failed to fetch ad accounts",
      code: error.code,
    });
  }
});

/**
 * GET /api/accounts/pages
 * Get Facebook Pages for ad creative (needed for object_story_spec)
 */
router.get("/pages", async (req, res) => {
  try {
    const pages = await facebookService.getBusinessPages(req.fbBusinessId, req.fbToken);
    res.json({ success: true, pages });
  } catch (error) {
    logger.error("Failed to fetch pages", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/accounts/:id/pixels
 * Get pixels for a specific ad account
 */
router.get("/:id/pixels", async (req, res) => {
  try {
    const accId = req.params.id.startsWith("act_") ? req.params.id : `act_${req.params.id}`;
    const result = await facebookService.graphRequest("GET", `/${accId}/adspixels`, { fields: "id,name", limit: 10 }, req.fbToken);
    res.json({ success: true, pixels: result.data || [] });
  } catch (error) {
    res.json({ success: true, pixels: [] });
  }
});

/**
 * GET /api/accounts/:id
 * Get details for a single ad account
 */
router.get("/:id", async (req, res) => {
  try {
    const account = await facebookService.getAdAccountDetails(req.params.id, req.fbToken);
    res.json({ success: true, account });
  } catch (error) {
    logger.error("Failed to fetch account details", { error: error.message, accountId: req.params.id });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
