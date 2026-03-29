const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const facebookService = require("../services/facebookService");
const { broadcast } = require("../websocket/wsServer");
const logger = require("../utils/logger");

// Multer config — disk storage for large files, memory for reasonable ones
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max per file
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
      "video/x-matroska", "video/x-ms-wmv", "video/x-flv",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  },
});

/**
 * POST /api/campaigns/publish — Bulk publish to multiple accounts
 */
router.post("/publish", upload.array("creatives", 10), async (req, res) => {
  try {
    let config;
    try {
      config = JSON.parse(req.body.config);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid config JSON" });
    }

    // Validation
    const errors = [];
    if (!config.name) errors.push("Campaign name is required");
    if (!config.objective) errors.push("Objective is required");
    if (!config.account_ids || config.account_ids.length === 0) errors.push("Select at least one ad account");
    if (!config.ad_variations || config.ad_variations.length === 0) errors.push("At least one ad variation required");
    if (!config.page_id) errors.push("Facebook Page is required");

    // Validate budget
    const budget = Number(config.budget);
    if (!budget || budget <= 0) errors.push("Budget must be greater than 0");

    // Validate ad variations have copy
    for (let i = 0; i < (config.ad_variations || []).length; i++) {
      const v = config.ad_variations[i];
      if (!v.primary_text) errors.push(`Variation ${i + 1}: Primary text required`);
      if (!v.headline) errors.push(`Variation ${i + 1}: Headline required`);
      if (!v.url) errors.push(`Variation ${i + 1}: URL required`);
    }

    // Limit accounts
    if (config.account_ids && config.account_ids.length > 50) {
      errors.push("Maximum 50 accounts per publish");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Attach uploaded file buffers to ad variations
    const files = req.files || [];
    for (const variation of config.ad_variations) {
      const fileIndex = variation.creative_index ?? 0;
      if (fileIndex >= 0 && fileIndex < files.length) {
        variation.image_buffer = files[fileIndex].buffer;
        variation.image_filename = files[fileIndex].originalname;
      }
    }

    logger.info("Starting bulk publish", {
      campaign: config.name,
      objective: config.objective,
      budgetMode: config.budget_mode || "CBO",
      accounts: config.account_ids.length,
      variations: config.ad_variations.length,
      filesUploaded: files.length,
      fileNames: files.map(f => f.originalname),
      fileSizes: files.map(f => `${(f.size / 1024).toFixed(0)}KB`),
      hasBuffers: config.ad_variations.map(v => !!v.image_buffer),
    });

    // Broadcast start
    broadcast({
      event: "publish:start",
      campaign: config.name,
      totalAccounts: config.account_ids.length,
    });

    // Execute bulk publish with progress tracking
    const results = [];
    const accountIds = config.account_ids;
    const concurrency = Math.min(config.concurrency || 2, 5);
    const delayMs = config.delay_ms || 1500;

    for (let i = 0; i < accountIds.length; i += concurrency) {
      const batch = accountIds.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(accId => facebookService.publishToSingleAccount(accId, config, req.fbToken))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const accId = batch[j];
        const r = batchResults[j];
        const result = {
          accountId: accId,
          success: r.status === "fulfilled",
          data: r.status === "fulfilled" ? r.value : null,
          error: r.status === "rejected" ? (r.reason?.message || "Unknown error") : null,
          errorDetail: r.status === "rejected" ? (r.reason?.detail || "") : null,
        };
        results.push(result);

        // Broadcast per-account result
        broadcast({
          event: "publish:account",
          ...result,
          index: results.length,
          total: accountIds.length,
        });
      }

      // Progress
      const percentage = Math.round((results.length / accountIds.length) * 100);
      broadcast({ event: "publish:progress", percentage, completed: results.length, total: accountIds.length });

      if (i + concurrency < accountIds.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Broadcast completion
    broadcast({
      event: "publish:complete",
      campaign: config.name,
      successful: successCount,
      failed: failCount,
    });

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
    broadcast({ event: "publish:error", error: error.message });
    res.status(500).json({ success: false, error: error.message || "Bulk publish failed" });
  }
});

/**
 * POST /api/campaigns/publish-one — Publish to a single account
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
    if (!config.page_id) {
      return res.status(400).json({ success: false, error: "page_id is required" });
    }

    const files = req.files || [];
    for (const variation of config.ad_variations || []) {
      const fileIndex = variation.creative_index ?? 0;
      if (fileIndex >= 0 && fileIndex < files.length) {
        variation.image_buffer = files[fileIndex].buffer;
        variation.image_filename = files[fileIndex].originalname;
      }
    }

    const result = await facebookService.publishToSingleAccount(config.account_id, config, req.fbToken);
    res.json({ success: true, result });
  } catch (error) {
    logger.error("Single publish failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/campaigns/validate — Dry-run validation
 */
router.post("/validate", async (req, res) => {
  const config = req.body;
  const errors = [];

  if (!config.name) errors.push("Campaign name is required");
  if (!config.objective) errors.push("Objective is required");
  if (!config.budget || Number(config.budget) <= 0) errors.push("Valid budget required");
  if (!config.account_ids || config.account_ids.length === 0) errors.push("Select at least one account");
  if (!config.ad_variations || config.ad_variations.length === 0) errors.push("At least one ad variation needed");
  if (!config.page_id) errors.push("Facebook Page is required");

  if (config.budget_type === "daily" && Number(config.budget) < 1) {
    errors.push("Daily budget must be at least $1.00");
  }
  if (config.account_ids?.length > 50) {
    errors.push("Maximum 50 accounts per publish");
  }

  for (let i = 0; i < (config.ad_variations || []).length; i++) {
    const v = config.ad_variations[i];
    if (!v.primary_text) errors.push(`Variation ${i + 1}: Primary text required`);
    if (!v.headline) errors.push(`Variation ${i + 1}: Headline required`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ valid: false, errors });
  }
  res.json({ valid: true, errors: [], message: "Configuration is valid" });
});

/**
 * GET /api/campaigns/interests?q={query} — Search interests
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
      interests: interests.map(i => ({
        id: i.id,
        name: i.name,
        audience_size_lower_bound: i.audience_size_lower_bound,
        audience_size_upper_bound: i.audience_size_upper_bound,
        path: i.path,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Interest search failed" });
  }
});

/* ── AI Helper: validate URL + fetch page content ── */
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "URL must start with http:// or https://";
    const h = parsed.hostname;
    if (h === "localhost" || h.startsWith("127.") || h.startsWith("10.") || h.startsWith("172.") || h.startsWith("192.168.") || h === "169.254.169.254") return "Internal URLs not allowed";
    return null;
  } catch (_) { return "Invalid URL format"; }
}

async function fetchPageContent(url) {
  try {
    const response = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 (compatible; BulkAdsPro/3.0)" }, maxRedirects: 3 });
    return response.data.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000);
  } catch (_) { return `Landing page URL: ${url} (could not fetch content)`; }
}

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await axios.post("https://api.anthropic.com/v1/messages", {
    model: "claude-sonnet-4-20250514", max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  }, {
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    timeout: 30000,
  });
  return r.data.content[0]?.text || "";
}

/**
 * POST /api/campaigns/generate-name — AI Campaign Namer
 */
router.post("/generate-name", async (req, res) => {
  try {
    const { url, objective } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL is required" });
    const urlErr = validateUrl(url);
    if (urlErr) return res.status(400).json({ success: false, error: urlErr });

    const pageContent = await fetchPageContent(url);
    const text = await callClaude(`You are a Facebook Ads campaign naming expert. Analyze this landing page and generate 5 campaign name suggestions.

LANDING PAGE: ${pageContent}
URL: ${url}
OBJECTIVE: ${objective || "sales"}
TODAY: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

RULES:
- Names should be short (3-6 words max)
- Include product/brand name
- Include objective hint (e.g. "Sales", "Traffic", "Leads")
- Include date or season reference
- Format: "Brand - Product - Objective - Date"
- Make them professional and organized

Respond ONLY with this JSON, no other text:
[
  {"name": "campaign name 1"},
  {"name": "campaign name 2"},
  {"name": "campaign name 3"},
  {"name": "campaign name 4"},
  {"name": "campaign name 5"}
]`);

    const clean = text.replace(/```json|```/g, "").trim();
    const names = JSON.parse(clean);
    res.json({ success: true, names });
  } catch (error) {
    logger.error("AI name generation failed", { error: error.message });
    if (error.response?.status === 401) return res.status(401).json({ success: false, error: "Invalid ANTHROPIC_API_KEY" });
    res.status(500).json({ success: false, error: error.message || "AI generation failed" });
  }
});

/**
 * POST /api/campaigns/suggest-audience — AI Audience Recommender
 */
router.post("/suggest-audience", async (req, res) => {
  try {
    const { url, objective, country } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL is required" });
    const urlErr = validateUrl(url);
    if (urlErr) return res.status(400).json({ success: false, error: urlErr });

    const pageContent = await fetchPageContent(url);
    const text = await callClaude(`You are a Facebook Ads targeting expert. Analyze this landing page and recommend the best audience targeting.

LANDING PAGE: ${pageContent}
URL: ${url}
OBJECTIVE: ${objective || "sales"}
TARGET COUNTRY: ${country || "India"}

Provide detailed targeting recommendations. Think about:
- Who would buy this product?
- What are their interests?
- Age range and gender
- What Facebook interest categories match?

IMPORTANT: For interests, use REAL Facebook interest targeting names that exist in Facebook Ads Manager (e.g. "Online shopping", "Beauty", "Fitness and wellness", "Fashion accessories", etc.)

Respond ONLY with this JSON, no other text:
{
  "age_min": 18,
  "age_max": 45,
  "gender": "all",
  "gender_reason": "why this gender",
  "interests": [
    {"name": "Interest Name 1", "reason": "why this interest"},
    {"name": "Interest Name 2", "reason": "why this interest"},
    {"name": "Interest Name 3", "reason": "why this interest"},
    {"name": "Interest Name 4", "reason": "why this interest"},
    {"name": "Interest Name 5", "reason": "why this interest"},
    {"name": "Interest Name 6", "reason": "why this interest"},
    {"name": "Interest Name 7", "reason": "why this interest"},
    {"name": "Interest Name 8", "reason": "why this interest"}
  ],
  "audience_strategy": "2-3 sentence explanation of the targeting strategy",
  "suggested_ad_sets": [
    {"name": "Ad Set Name 1", "description": "who this targets", "interests": ["Interest 1", "Interest 2", "Interest 3"]},
    {"name": "Ad Set Name 2", "description": "who this targets", "interests": ["Interest 4", "Interest 5", "Interest 6"]},
    {"name": "Ad Set Name 3", "description": "broad/lookalike approach", "interests": []}
  ]
}`);

    const clean = text.replace(/```json|```/g, "").trim();
    const suggestion = JSON.parse(clean);
    res.json({ success: true, suggestion });
  } catch (error) {
    logger.error("AI audience suggestion failed", { error: error.message });
    if (error.response?.status === 401) return res.status(401).json({ success: false, error: "Invalid ANTHROPIC_API_KEY" });
    res.status(500).json({ success: false, error: error.message || "AI generation failed" });
  }
});

/**
 * POST /api/campaigns/generate-copy — AI Ad Copy Generator
 */
router.post("/generate-copy", async (req, res) => {
  try {
    const { url, objective } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL is required" });
    const urlErr = validateUrl(url);
    if (urlErr) return res.status(400).json({ success: false, error: urlErr });

    const pageContent = await fetchPageContent(url);
    const text = await callClaude(`You are an expert Facebook Ads copywriter. Analyze this landing page and write 3 ad copy variations.

LANDING PAGE: ${pageContent}
URL: ${url}
OBJECTIVE: ${objective || "sales"}

RULES:
- Use emojis (2-4 per text)
- Write scroll-stopping hooks
- Include urgency when appropriate
- Primary text under 200 characters
- Headlines under 40 characters
- Descriptions under 60 characters
- Focus on benefits, not features

Respond ONLY with this JSON, no other text:
[
  {"primaryText": "...", "headline": "...", "description": "..."},
  {"primaryText": "...", "headline": "...", "description": "..."},
  {"primaryText": "...", "headline": "...", "description": "..."}
]`);

    const clean = text.replace(/```json|```/g, "").trim();
    const variations = JSON.parse(clean);
    res.json({ success: true, variations });
  } catch (error) {
    logger.error("AI copy generation failed", { error: error.message });
    if (error.response?.status === 401) return res.status(401).json({ success: false, error: "Invalid ANTHROPIC_API_KEY" });
    res.status(500).json({ success: false, error: error.message || "AI generation failed" });
  }
});

module.exports = router;
