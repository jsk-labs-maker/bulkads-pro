const logger = require("../utils/logger");
module.exports = (req, res, next) => {
  req.fbToken = req.headers["x-fb-access-token"] || process.env.FB_SYSTEM_USER_TOKEN;
  req.fbBusinessId = req.headers["x-fb-business-id"] || process.env.FB_BUSINESS_ID;
  if (!req.fbToken) return res.status(401).json({ error: "No access token" });
  next();
};
