const logger = require("../utils/logger");

/**
 * Auth middleware — extracts Facebook token and business ID from headers.
 * Falls back to environment variables for server-side token.
 * Rejects requests with no token at all.
 */
module.exports = (req, res, next) => {
  const token = req.headers["x-fb-access-token"] || process.env.FB_SYSTEM_USER_TOKEN;
  const businessId = req.headers["x-fb-business-id"] || process.env.FB_BUSINESS_ID;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Provide a Facebook access token.",
    });
  }

  // Business ID is now optional — routes fall back to /me/* endpoints
  // when missing (covers users without a Business Manager).
  req.fbToken = token;
  req.fbBusinessId = businessId || null;
  next();
};
