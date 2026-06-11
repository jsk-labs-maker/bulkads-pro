/**
 * Token Vault routes — mounted WITHOUT the FB auth middleware: adding a
 * token IS the authentication. All other endpoints require the caller to
 * present vault IDs (UUIDs returned at add time) via the x-fb-token-ids
 * header, which act as unguessable bearer references.
 */

const express = require("express");
const router = express.Router();
const facebookService = require("../services/facebookService");
const vault = require("../services/tokenVault");
const logger = require("../utils/logger");

/** Vault IDs the caller presented — only these entries are usable. */
async function callerRecords(req) {
  const raw = req.headers["x-fb-token-ids"] || "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
  return vault.resolveIds(ids);
}

/**
 * POST /api/tokens — Add (or refresh) a token. Body: { token, label? }
 */
router.post("/", async (req, res) => {
  const { token, label } = req.body || {};
  if (!token || typeof token !== "string" || token.length < 20) {
    return res.status(400).json({ success: false, error: "Provide a valid Meta access token" });
  }
  try {
    const { record } = await vault.addToken(token.trim(), (label || "").trim());
    res.json({ success: true, token: vault.toPublic(record) });
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    logger.warn("Vault add failed", { error: msg });
    res.status(400).json({ success: false, error: `Token rejected by Meta: ${msg}` });
  }
});

/**
 * GET /api/tokens — List the caller's vault entries (tokens masked).
 */
router.get("/", async (req, res) => {
  try {
    const records = await callerRecords(req);
    res.json({ success: true, tokens: records.map(vault.toPublic) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/tokens/accounts — Ad accounts aggregated across the caller's
 * tokens, each tagged with the vault entry it belongs to.
 */
router.get("/accounts", async (req, res) => {
  try {
    const records = (await callerRecords(req)).filter(r => r.status === "valid");
    if (records.length === 0) return res.json({ success: true, count: 0, accounts: [] });

    const perToken = await Promise.allSettled(
      records.map(r => facebookService.getAllAdAccounts(r.businessId || null, r.token))
    );

    const seen = new Set();
    const accounts = [];
    perToken.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      const rec = records[i];
      for (const acc of result.value) {
        const id = vault.normalizeActId(acc.id || acc.account_id);
        if (seen.has(id)) continue;
        seen.add(id);
        accounts.push({
          id,
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
          tokenId: rec.id,
          tokenLabel: rec.label || rec.fbUserName,
        });
      }
    });

    res.json({ success: true, count: accounts.length, accounts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/tokens/pages — Facebook Pages aggregated across the caller's tokens.
 */
router.get("/pages", async (req, res) => {
  try {
    const records = (await callerRecords(req)).filter(r => r.status === "valid");
    const perToken = await Promise.allSettled(
      records.map(r => facebookService.getBusinessPages(r.businessId || null, r.token))
    );

    const seen = new Set();
    const pages = [];
    perToken.forEach((result, i) => {
      if (result.status !== "fulfilled") return;
      for (const p of result.value) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        pages.push({ ...p, tokenId: records[i].id, tokenLabel: records[i].label || records[i].fbUserName });
      }
    });

    res.json({ success: true, pages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/tokens/:id/check — Revalidate a token and refresh its accounts.
 */
router.post("/:id/check", async (req, res) => {
  try {
    const records = await callerRecords(req);
    const rec = records.find(r => r.id === req.params.id);
    if (!rec) return res.status(404).json({ success: false, error: "Token not found" });
    await vault.checkToken(rec);
    res.json({ success: true, token: vault.toPublic(rec) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * DELETE /api/tokens/:id — Remove a token from the vault.
 */
router.delete("/:id", async (req, res) => {
  try {
    const records = await callerRecords(req);
    const rec = records.find(r => r.id === req.params.id);
    if (!rec) return res.status(404).json({ success: false, error: "Token not found" });
    await rec.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
