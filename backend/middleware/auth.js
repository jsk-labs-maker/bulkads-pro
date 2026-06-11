const vault = require("../services/tokenVault");

/**
 * Auth middleware — resolves the Facebook credentials for the request:
 *   1. Raw token in x-fb-access-token header (legacy / OAuth flow)
 *   2. Vault entries referenced by x-fb-token-ids header (UUIDs returned
 *      when a token was added — unguessable, so they act as bearer refs)
 *   3. FB_SYSTEM_USER_TOKEN env fallback
 * Rejects requests with no usable token at all.
 */
module.exports = async (req, res, next) => {
  try {
    const headerToken = req.headers["x-fb-access-token"];
    const businessId = req.headers["x-fb-business-id"] || process.env.FB_BUSINESS_ID;

    const idsRaw = req.headers["x-fb-token-ids"] || "";
    const ids = idsRaw.split(",").map(s => s.trim()).filter(Boolean);
    const vaultRecords = ids.length > 0 ? await vault.resolveIds(ids) : [];
    const validVault = vaultRecords.filter(r => r.status === "valid");

    const token = headerToken || validVault[0]?.token || process.env.FB_SYSTEM_USER_TOKEN;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Provide a Facebook access token or vault token IDs.",
      });
    }

    // Business ID is optional — routes fall back to /me/* endpoints
    // when missing (covers users without a Business Manager).
    req.fbToken = token;
    req.fbBusinessId = businessId || (headerToken ? null : validVault[0]?.businessId) || null;
    req.vaultRecords = validVault;
    next();
  } catch (e) {
    res.status(500).json({ success: false, error: "Auth resolution failed" });
  }
};
