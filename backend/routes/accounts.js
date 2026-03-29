const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

/**
 * GET /api/accounts — Fetch all ad accounts
 */
router.get("/", async (req, res) => {
  try {
    const accounts = await facebookService.getAllAdAccounts(req.fbBusinessId, req.fbToken);

    const formatted = accounts.map((acc) => ({
      id: acc.id,
      account_id: acc.account_id,
      name: acc.name,
      status: acc.account_status === 1 ? "active" : acc.account_status === 2 ? "disabled" : "paused",
      account_status_code: acc.account_status,
      currency: acc.currency,
      timezone: acc.timezone_name,
      amount_spent: acc.amount_spent ? (Number(acc.amount_spent) / 100).toFixed(2) : "0.00",
      balance: acc.balance ? (Number(acc.balance) / 100).toFixed(2) : "0.00",
      business_name: acc.business_name || "",
      spend_cap: acc.spend_cap,
      disable_reason: acc.disable_reason,
    }));

    res.json({ success: true, count: formatted.length, accounts: formatted });
  } catch (error) {
    const status = error.fbCode === 190 ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/accounts/pages — Get Facebook Pages
 */
router.get("/pages", async (req, res) => {
  try {
    const pages = await facebookService.getBusinessPages(req.fbBusinessId, req.fbToken);
    res.json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/accounts/:id/pixels — Get pixels for an account
 */
router.get("/:id/pixels", async (req, res) => {
  try {
    const accId = req.params.id.startsWith("act_") ? req.params.id : `act_${req.params.id}`;
    const result = await facebookService.graphRequest("GET", `/${accId}/adspixels`, { fields: "id,name", limit: 10 }, req.fbToken);
    res.json({ success: true, pixels: result.data || [] });
  } catch (error) {
    // Return empty pixels on error — account might not have pixels
    res.json({ success: true, pixels: [] });
  }
});

/**
 * GET /api/accounts/:id — Get single account details
 */
router.get("/:id", async (req, res) => {
  try {
    const account = await facebookService.getAdAccountDetails(req.params.id, req.fbToken);
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/accounts/geo-search?q={query}&types=region,city,zip,geo_market
 * Search Facebook's adgeolocation database — supports multiple location types
 */
router.get("/geo-search", async (req, res) => {
  try {
    const { q, types } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, locations: [] });
    }

    // Search multiple types in parallel for richer results
    const searchTypes = types ? types.split(",") : ["region", "city"];
    const searches = await Promise.allSettled(
      searchTypes.map(t =>
        facebookService.graphRequest("GET", "/search", {
          type: "adgeolocation",
          q: q,
          location_types: t,
          limit: 15,
        }, req.fbToken).then(r => (r.data || []).map(l => ({
          key: l.key,
          name: l.name,
          type: l.type,
          country_code: l.country_code,
          country_name: l.country_name,
          region: l.region || "",
          supports_region: l.supports_region,
          supports_city: l.supports_city,
        })))
      )
    );

    // Merge and deduplicate
    const all = [];
    const seen = new Set();
    for (const r of searches) {
      if (r.status === "fulfilled") {
        for (const loc of r.value) {
          const uid = `${loc.type}_${loc.key}`;
          if (!seen.has(uid)) { seen.add(uid); all.push(loc); }
        }
      }
    }

    res.json({ success: true, locations: all });
  } catch (error) {
    res.status(500).json({ success: false, error: "Location search failed" });
  }
});

module.exports = router;
