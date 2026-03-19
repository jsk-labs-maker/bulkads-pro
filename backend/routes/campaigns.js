const express = require("express");
const router = express.Router();
const multer = require("multer");
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/quicktime","video/x-msvideo","video/webm"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed: " + file.mimetype));
  },
});

router.post("/publish", upload.array("creatives", 50), async (req, res) => {
  try {
    const config = JSON.parse(req.body.config);
    logger.info("Starting bulk publish", { campaignName: config.name, accountCount: config.account_ids.length, variationCount: config.ad_variations?.length || 0 });
    const files = req.files || [];
    if (config.ad_variations) {
      config.ad_variations = config.ad_variations.map((v, i) => {
        const fileIdx = v.creative_index !== undefined ? v.creative_index : i;
        const file = files[fileIdx];
        return { ...v, image_buffer: file?.buffer, image_filename: file?.originalname };
      });
    }
    const results = await facebookService.bulkPublish(config, config.account_ids, { concurrency: 2, delayMs: 1500 }, req.fbToken);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ success: true, summary: { total: results.length, successful, failed }, results });
  } catch (e) {
    logger.error("Publish failed", { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const config = req.body;
    const errors = [];
    if (!config.name) errors.push("Campaign name required");
    if (!config.objective) errors.push("Objective required");
    if (!config.page_id) errors.push("Facebook Page required");
    if (!config.account_ids?.length) errors.push("Select at least one account");
    res.json({ valid: errors.length === 0, errors });
  } catch (e) { res.json({ valid: false, errors: [e.message] }); }
});

router.get("/interests", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json({ success: true, interests: [] });
    const interests = await facebookService.searchInterests(q, req.fbToken);
    res.json({ success: true, interests });
  } catch (e) { res.json({ success: false, interests: [], error: e.message }); }
});

module.exports = router;
