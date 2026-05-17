/**
 * ──────────────────────────────────────────
 * Facebook OAuth (Login) — mounted WITHOUT
 * authMiddleware so unauthenticated users
 * can initiate the flow.
 * ──────────────────────────────────────────
 *
 * Flow:
 *   1. Browser → GET /api/oauth/facebook/login
 *      → 302 to https://www.facebook.com/v21.0/dialog/oauth
 *   2. FB → GET /api/oauth/facebook/callback?code=...&state=...
 *      → exchange code → short token → long-lived token
 *      → fetch user's first business
 *      → 302 to FRONTEND_URL/#fb_token=...&fb_biz_id=...
 *   3. Frontend reads the hash, stores in localStorage,
 *      unlocks the dashboard, scrubs the URL.
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

const SCOPES = (process.env.FB_OAUTH_SCOPES ||
  "email,public_profile,ads_management,ads_read,business_management,pages_show_list,pages_read_engagement"
).split(",").map(s => s.trim()).join(",");

const API_VERSION = process.env.FB_API_VERSION || "v21.0";
const STATE_TTL_MS = 10 * 60 * 1000;

// in-memory CSRF state store (single-instance app; fine here)
const stateStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of stateStore) if (now - v > STATE_TTL_MS) stateStore.delete(k);
}, 60 * 1000).unref();

function getRedirectUri(req) {
  if (process.env.FB_REDIRECT_URI) return process.env.FB_REDIRECT_URI;
  return `${req.protocol}://${req.get("host")}/api/oauth/facebook/callback`;
}

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * GET /api/oauth/facebook/login
 * Kick off the OAuth dance — 302 to Facebook's consent dialog.
 */
router.get("/login", (req, res) => {
  if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET) {
    return res.status(500).send("Facebook OAuth not configured: missing FB_APP_ID / FB_APP_SECRET");
  }

  const state = crypto.randomBytes(24).toString("hex");
  stateStore.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: getRedirectUri(req),
    state,
    response_type: "code",
  });

  // Facebook Login for Business uses config_id (permissions live in the
  // Login Configuration). Classic Facebook Login uses scope.
  if (process.env.FB_CONFIG_ID) {
    params.set("config_id", process.env.FB_CONFIG_ID);
  } else {
    params.set("scope", SCOPES);
    params.set("auth_type", "rerequest");
  }

  const url = `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params.toString()}`;
  logger.info("OAuth login initiated", { state: state.slice(0, 8), mode: process.env.FB_CONFIG_ID ? "config_id" : "scope" });
  res.redirect(url);
});

/**
 * GET /api/oauth/facebook/callback
 * Facebook hits this with ?code=... after the user grants.
 */
router.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = getFrontendUrl(req);

  const fail = (reason) => {
    logger.warn("OAuth callback failed", { reason });
    const hash = new URLSearchParams({ fb_oauth_error: reason }).toString();
    return res.redirect(`${frontendUrl}/#${hash}`);
  };

  if (error) return fail(error_description || error);
  if (!code || !state) return fail("Missing code or state");
  if (!stateStore.has(state)) return fail("Invalid or expired state");
  stateStore.delete(state);

  try {
    // 1. code → short-lived user token
    const tokenResp = await facebookService.exchangeCodeForToken(code, getRedirectUri(req));
    const shortToken = tokenResp.access_token;
    if (!shortToken) return fail("No access_token in code exchange response");

    // 2. short → long-lived (~60 days)
    const longResp = await facebookService.exchangeForLongLivedToken(shortToken);
    const longToken = longResp.access_token || shortToken;

    // 3. identify the user (optional, useful for logging)
    let me = {};
    try { me = await facebookService.getMe(longToken); } catch (_) { /* non-fatal */ }

    // 4. fetch businesses — auto-pick the first; user can switch later
    const businesses = await facebookService.getUserBusinesses(longToken);
    const bizId = businesses[0]?.id || "";

    logger.info("OAuth success", {
      user: me.name || "?",
      email: me.email || "?",
      businesses: businesses.length,
      picked: businesses[0]?.name || "(none)",
    });

    const hash = new URLSearchParams({
      fb_token: longToken,
      fb_biz_id: bizId,
      fb_user_name: me.name || "",
      fb_user_email: me.email || "",
      fb_businesses: JSON.stringify(businesses),
    }).toString();

    return res.redirect(`${frontendUrl}/#${hash}`);
  } catch (e) {
    const detail = e.response?.data?.error?.message || e.message;
    logger.error("OAuth callback exception", { error: detail });
    return fail(detail);
  }
});

module.exports = router;
