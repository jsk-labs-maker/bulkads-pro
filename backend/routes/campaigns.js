/**
 * ══════════════════════════════════════════════════════════════
 * Routes: Campaigns — Bulk Publishing
 * ══════════════════════════════════════════════════════════════
 * 
 * POST /api/campaigns/publish      — Bulk publish to multiple accounts
 * POST /api/campaigns/publish-one  — Publish to a single account
 * POST /api/campaigns/validate     — Dry-run validation
 * GET  /api/campaigns/interests    — Search targeting interests
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const facebookService = require("../services/facebookService");
const logger = require("../utils/logger");

// Multer config for file uploads (images/videos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for videos
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv", "video/webm", "video/x-matroska", "video/x-flv"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  },
});

/**
 * ─────────────────────────────────────────────
 * POST /api/campaigns/publish
 * ─────────────────────────────────────────────
 * 
 * THE MAIN ENDPOINT — publishes a complete campaign to multiple ad accounts
 * 
 * Body (multipart/form-data):
 * - config: JSON string with campaign configuration
 * - creatives: image/video files (up to 10)
 * 
 * Config JSON structure:
 * {
 *   name: "Campaign Name",
 *   objective: "conversions",
 *   budget: 50,
 *   budget_type: "daily",
 *   bid_strategy: "LOWEST_COST_WITHOUT_CAP",
 *   start_time: "2025-01-01T00:00:00Z",
 *   end_time: "2025-01-31T23:59:59Z",
 *   publish_status: "PAUSED",
 *   page_id: "123456789",
 *   account_ids: ["act_111", "act_222", "act_333"],
 *   targeting: {
 *     geo_locations: { countries: ["US", "CA"] },
 *     age_min: 18,
 *     age_max: 65,
 *     genders: [1, 2],
 *     interests: [{ id: "123", name: "Shopping" }]
 *   },
 *   publisher_platforms: ["facebook", "instagram"],
 *   facebook_positions: ["feed", "story", "reel"],
 *   instagram_positions: ["stream", "story", "reels"],
 *   ad_variations: [
 *     {
 *       primary_text: "Ad copy here...",
 *       headline: "Big Headline",
 *       description: "Description text",
 *       cta: "Shop Now",
 *       url: "https://example.com",
 *       creative_index: 0   // Index of uploaded file to use
 *     }
 *   ]
 * }
 */
router.post("/publish", upload.array("creatives", 10), async (req, res) => {
  try {
    // Parse campaign config from form data
    let config;
    try {
      config = JSON.parse(req.body.config);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid config JSON" });
    }

    // Validation
    if (!config.name) {
      return res.status(400).json({ success: false, error: "Campaign name is required" });
    }
    if (!config.objective) {
      return res.status(400).json({ success: false, error: "Campaign objective is required" });
    }
    if (!config.account_ids || config.account_ids.length === 0) {
      return res.status(400).json({ success: false, error: "At least one ad account must be selected" });
    }
    if (!config.ad_variations || config.ad_variations.length === 0) {
      return res.status(400).json({ success: false, error: "At least one ad variation is required" });
    }
    if (!config.page_id) {
      return res.status(400).json({ success: false, error: "A Facebook Page ID is required for ad creative" });
    }

    // Attach uploaded file buffers to ad variations
    const files = req.files || [];
    for (const variation of config.ad_variations) {
      const fileIndex = variation.creative_index ?? 0;
      if (files[fileIndex]) {
        variation.image_buffer = files[fileIndex].buffer;
        variation.image_filename = files[fileIndex].originalname;
      }
    }

    logger.info("Starting bulk publish", {
      campaignName: config.name,
      accountCount: config.account_ids.length,
      variationCount: config.ad_variations.length,
    });

    // Execute bulk publish
    const results = await facebookService.bulkPublish(
      config,
      config.account_ids,
      {
        concurrency: config.concurrency || 3,
        delayMs: config.delay_ms || 1000,
      },
      req.fbToken
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
        campaign_name: config.name,
      },
      results,
    });
  } catch (error) {
    logger.error("Bulk publish failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || "Bulk publish failed",
    });
  }
});

/**
 * ─────────────────────────────────────────────
 * POST /api/campaigns/publish-one
 * ─────────────────────────────────────────────
 * 
 * Publish to a SINGLE ad account (for testing / retry)
 */
router.post("/publish-one", upload.array("creatives", 10), async (req, res) => {
  try {
    let config;
    try {
      config = JSON.parse(req.body.config);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid config JSON" });
    }

    if (!config.account_id) {
      return res.status(400).json({ success: false, error: "account_id is required" });
    }

    // Attach files
    const files = req.files || [];
    for (const variation of config.ad_variations || []) {
      const fileIndex = variation.creative_index ?? 0;
      if (files[fileIndex]) {
        variation.image_buffer = files[fileIndex].buffer;
        variation.image_filename = files[fileIndex].originalname;
      }
    }

    const result = await facebookService.publishToSingleAccount(
      config.account_id,
      config,
      req.fbToken
    );

    res.json({ success: true, result });
  } catch (error) {
    logger.error("Single publish failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ─────────────────────────────────────────────
 * POST /api/campaigns/validate
 * ─────────────────────────────────────────────
 * 
 * Validate campaign config WITHOUT publishing (dry run)
 */
router.post("/validate", async (req, res) => {
  const config = req.body;
  const errors = [];

  if (!config.name) errors.push("Campaign name is required");
  if (!config.objective) errors.push("Objective is required");
  if (!config.budget || config.budget <= 0) errors.push("Valid budget is required");
  if (!config.account_ids || config.account_ids.length === 0) errors.push("Select at least one ad account");
  if (!config.ad_variations || config.ad_variations.length === 0) errors.push("At least one ad variation needed");
  if (!config.page_id) errors.push("Facebook Page ID is required");

  for (let i = 0; i < (config.ad_variations || []).length; i++) {
    const v = config.ad_variations[i];
    if (!v.primary_text) errors.push(`Variation ${i + 1}: Primary text is required`);
    if (!v.headline) errors.push(`Variation ${i + 1}: Headline is required`);
  }

  // Validate budget limits
  if (config.budget_type === "daily" && config.budget < 1) {
    errors.push("Daily budget must be at least $1.00");
  }

  // Check account limit
  if (config.account_ids?.length > 50) {
    errors.push("Maximum 50 accounts per bulk publish");
  }

  if (errors.length > 0) {
    return res.json({ valid: false, errors });
  }

  res.json({ valid: true, errors: [], message: "Campaign configuration is valid" });
});

/**
 * ─────────────────────────────────────────────
 * GET /api/campaigns/interests?q={query}
 * ─────────────────────────────────────────────
 * 
 * Search Facebook's interest targeting database
 */
router.get("/interests", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      return res.json({ success: true, interests: [] });
    }

    const interests = await facebookService.searchInterests(query, req.fbToken);
    res.json({
      success: true,
      interests: interests.map((i) => ({
        id: i.id,
        name: i.name,
        audience_size_lower_bound: i.audience_size_lower_bound,
        audience_size_upper_bound: i.audience_size_upper_bound,
        path: i.path,
      })),
    });
  } catch (error) {
    logger.error("Interest search failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ─────────────────────────────────────────────
 * POST /api/campaigns/generate-copy
 * ─────────────────────────────────────────────
 * 
 * AI Ad Copy Generator — fetches landing page, sends to Claude API
 * Returns 3 high-converting ad copy variations with emojis
 */
router.post("/generate-copy", async (req, res) => {
  try {
    const { url, objective } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL is required" });

    logger.info("AI Copy: Fetching landing page", { url });

    // Step 1: Fetch landing page content
    let pageContent = "";
    try {
      const axios = require("axios");
      const response = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
      // Extract text content from HTML (simple strip tags)
      pageContent = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 3000); // Limit to 3000 chars
    } catch (e) {
      pageContent = "Landing page URL: " + url + " (could not fetch content)";
      logger.warn("Could not fetch landing page: " + e.message);
    }

    // Step 2: Call Claude API to generate ad copy
    const axios = require("axios");
    const claudeResponse = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are an expert Facebook Ads copywriter who writes high-converting ad copy. Analyze this landing page content and write 3 different ad copy variations.

LANDING PAGE CONTENT:
${pageContent}

URL: ${url}
CAMPAIGN OBJECTIVE: ${objective || "sales"}

RULES:
- Use emojis extensively (2-4 per text)
- Write hooks that stop the scroll
- Include urgency/scarcity when appropriate
- Keep primary text under 200 characters
- Keep headlines under 40 characters  
- Keep descriptions under 60 characters
- Make it feel personal and conversational
- Focus on benefits, not features

Respond ONLY with this exact JSON format, no other text:
[
  {
    "primaryText": "emoji + high converting ad text here",
    "headline": "Short punchy headline",
    "description": "Brief description with benefit"
  },
  {
    "primaryText": "second variation with different angle",
    "headline": "Different headline approach", 
    "description": "Another benefit focused description"
  },
  {
    "primaryText": "third variation urgency/social proof angle",
    "headline": "Urgency or social proof headline",
    "description": "FOMO or trust building description"
  }
]`
      }]
    }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      timeout: 30000
    });

    // Parse Claude's response
    const text = claudeResponse.data.content[0]?.text || "[]";
    let variations;
    try {
      // Clean any markdown fences
      const clean = text.replace(/```json|```/g, "").trim();
      variations = JSON.parse(clean);
    } catch (e) {
      logger.error("Failed to parse AI response: " + text.substring(0, 200));
      return res.json({ success: false, error: "AI returned invalid format" });
    }

    logger.info("AI Copy: Generated " + variations.length + " variations");
    res.json({ success: true, variations });

  } catch (error) {
    logger.error("AI copy generation failed", { error: error.message });
    // If no API key, return helpful message
    if (error.response?.status === 401) {
      return res.json({ success: false, error: "Add ANTHROPIC_API_KEY to your environment variables to use AI copy generation" });
    }
    res.json({ success: false, error: error.message || "AI generation failed" });
  }
});

module.exports = router;
