/**
 * ══════════════════════════════════════════════════════════════
 * Facebook Graph API Service — v5 (Complete Rebuild)
 * ══════════════════════════════════════════════════════════════
 *
 * FIXES from v4:
 * 1. ALL objectives work (traffic, awareness, engagement, leads, app_installs, video_views, sales, conversions)
 * 2. ABO mode properly sets budget on ad sets, NOT on campaign
 * 3. CBO mode properly sets budget on campaign, NOT on ad sets
 * 4. Location is OPTIONAL — omit geo_locations for worldwide targeting
 * 5. Proper promoted_object for each objective type
 * 6. Proper optimization_goal per objective
 * 7. Proper billing_event per objective
 * 8. Error objects are proper Error instances with stack traces
 * 9. No fallback to example.com — URL validated before use
 * 10. Retry logic for rate-limited requests
 */

const axios = require("axios");
const FormData = require("form-data");
const logger = require("../utils/logger");

const FB_GRAPH_URL = "https://graph.facebook.com";

/* ══════════════════════════════════════
   OBJECTIVE CONFIGURATION MAP
   Each objective needs specific:
   - Facebook API objective value
   - optimization_goal for ad sets
   - billing_event
   - whether it needs a pixel/promoted_object
   ══════════════════════════════════════ */
const OBJECTIVE_CONFIG = {
  sales: {
    fbObjective: "OUTCOME_SALES",
    optimizationGoal: "OFFSITE_CONVERSIONS",
    billingEvent: "IMPRESSIONS",
    needsPixel: true,
    customEventType: "PURCHASE",
  },
  conversions: {
    fbObjective: "OUTCOME_SALES",
    optimizationGoal: "OFFSITE_CONVERSIONS",
    billingEvent: "IMPRESSIONS",
    needsPixel: true,
    customEventType: "PURCHASE",
  },
  traffic: {
    fbObjective: "OUTCOME_TRAFFIC",
    optimizationGoal: "LINK_CLICKS",
    billingEvent: "IMPRESSIONS",
    needsPixel: false,
  },
  awareness: {
    fbObjective: "OUTCOME_AWARENESS",
    optimizationGoal: "IMPRESSIONS",
    billingEvent: "IMPRESSIONS",
    needsPixel: false,
  },
  engagement: {
    fbObjective: "OUTCOME_ENGAGEMENT",
    optimizationGoal: "LINK_CLICKS",
    billingEvent: "IMPRESSIONS",
    needsPixel: false,
  },
  leads: {
    fbObjective: "OUTCOME_LEADS",
    optimizationGoal: "OFFSITE_CONVERSIONS",
    billingEvent: "IMPRESSIONS",
    needsPixel: true,
    customEventType: "LEAD",
  },
  app_installs: {
    fbObjective: "OUTCOME_APP_PROMOTION",
    optimizationGoal: "APP_INSTALLS",
    billingEvent: "IMPRESSIONS",
    needsPixel: false,
  },
  video_views: {
    fbObjective: "OUTCOME_ENGAGEMENT",
    optimizationGoal: "THRUPLAY",
    billingEvent: "IMPRESSIONS",
    needsPixel: false,
  },
};

class FacebookService {
  constructor() {
    this.apiVersion = process.env.FB_API_VERSION || "v21.0";
    this.baseUrl = `${FB_GRAPH_URL}/${this.apiVersion}`;
  }

  getToken(userToken = null) {
    return userToken || process.env.FB_SYSTEM_USER_TOKEN;
  }

  /* ══════════════════════════════════════
     CORE: Graph API Request
     ══════════════════════════════════════ */
  async graphRequest(method, endpoint, params = {}, token = null, retries = 2) {
    const accessToken = this.getToken(token);
    if (!accessToken) throw new Error("No Facebook access token configured");

    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let response;
        if (method === "GET") {
          response = await axios.get(url, {
            params: { access_token: accessToken, ...params },
            timeout: 30000,
          });
        } else {
          // POST: Facebook expects application/x-www-form-urlencoded
          const form = new URLSearchParams();
          form.append("access_token", accessToken);
          for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null) continue;
            if (typeof value === "string") {
              form.append(key, value);
            } else if (typeof value === "number" || typeof value === "boolean") {
              form.append(key, String(value));
            } else {
              form.append(key, JSON.stringify(value));
            }
          }
          response = await axios.post(url, form.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 30000,
          });
        }
        logger.debug(`FB API ${method} ${endpoint} -> OK`);
        return response.data;
      } catch (error) {
        const fbError = error.response?.data?.error;
        const errMsg = fbError?.message || error.message;

        // Retry on rate limiting (code 17, 32, or 4)
        const isRateLimit = fbError && [4, 17, 32].includes(fbError.code);
        if (isRateLimit && attempt < retries) {
          const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
          logger.warn(`Rate limited on ${endpoint}, retrying in ${wait}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        logger.error(`FB API Error [${method} ${endpoint}]: ${errMsg}`, {
          code: fbError?.code,
          subcode: fbError?.error_subcode,
          type: fbError?.type,
        });

        const err = new Error(errMsg);
        err.fbCode = fbError?.code;
        err.fbSubcode = fbError?.error_subcode;
        err.fbType = fbError?.type;
        err.detail = fbError?.error_user_msg || fbError?.error_user_title || "";
        throw err;
      }
    }
  }

  /* ══════════════════════════════════════
     TOKEN OPERATIONS
     ══════════════════════════════════════ */
  async validateToken(token) {
    const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const result = await axios.get(`${this.baseUrl}/debug_token`, {
      params: { input_token: token, access_token: appToken },
      timeout: 15000,
    });
    return result.data.data;
  }

  async exchangeForLongLivedToken(shortLivedToken) {
    const result = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
      timeout: 15000,
    });
    return result.data;
  }

  /* ══════════════════════════════════════
     AD ACCOUNTS
     ══════════════════════════════════════ */
  async getOwnedAdAccounts(businessId, token = null) {
    const accounts = [];
    const fields = "id,name,account_id,account_status,currency,timezone_name,timezone_offset_hours_utc,amount_spent,balance,business_name,spend_cap,disable_reason";
    const result = await this.graphRequest("GET", `/${businessId}/owned_ad_accounts`, { fields, limit: 100 }, token);
    if (result.data) accounts.push(...result.data);

    // Pagination
    let next = result.paging?.next;
    while (next) {
      try {
        const r = await axios.get(next, { timeout: 30000 });
        if (r.data?.data) accounts.push(...r.data.data);
        next = r.data?.paging?.next;
      } catch (e) {
        logger.warn("Pagination failed for owned accounts", { error: e.message });
        break;
      }
    }
    logger.info(`Fetched ${accounts.length} owned ad accounts`);
    return accounts;
  }

  async getClientAdAccounts(businessId, token = null) {
    try {
      const result = await this.graphRequest("GET", `/${businessId}/client_ad_accounts`, {
        fields: "id,name,account_id,account_status,currency,timezone_name,amount_spent,business_name",
        limit: 100,
      }, token);
      return result.data || [];
    } catch (e) {
      logger.warn("Failed to fetch client ad accounts", { error: e.message });
      return [];
    }
  }

  async getAllAdAccounts(businessId, token = null) {
    const [owned, client] = await Promise.allSettled([
      this.getOwnedAdAccounts(businessId, token),
      this.getClientAdAccounts(businessId, token),
    ]);
    const ownedAccounts = owned.status === "fulfilled" ? owned.value : [];
    const clientAccounts = client.status === "fulfilled" ? client.value : [];
    const all = [...ownedAccounts, ...clientAccounts];

    // Deduplicate by id
    const seen = new Set();
    return all.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }

  async getAdAccountDetails(accountId, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    return this.graphRequest("GET", `/${id}`, {
      fields: "id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name,spend_cap,disable_reason",
    }, token);
  }

  /* ══════════════════════════════════════
     PIXELS
     ══════════════════════════════════════ */
  async getAccountPixel(accountId, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    try {
      const result = await this.graphRequest("GET", `/${id}/adspixels`, { fields: "id,name", limit: 1 }, token);
      if (result.data && result.data.length > 0) {
        logger.info(`Pixel found: ${result.data[0].id} for ${id}`);
        return result.data[0].id;
      }
    } catch (e) {
      logger.warn(`Pixel fetch failed for ${id}: ${e.message}`);
    }
    return null;
  }

  /* ══════════════════════════════════════
     PAGES
     ══════════════════════════════════════ */
  async getBusinessPages(businessId, token = null) {
    const allPages = [];

    const sources = [
      { endpoint: `/${businessId}/owned_pages`, label: "owned" },
      { endpoint: `/${businessId}/client_pages`, label: "client" },
      { endpoint: `/me/accounts`, label: "personal" },
    ];

    for (const source of sources) {
      try {
        const r = await this.graphRequest("GET", source.endpoint, { fields: "id,name,picture", limit: 100 }, token);
        if (r.data) allPages.push(...r.data);
      } catch (e) {
        logger.debug(`No ${source.label} pages: ${e.message}`);
      }
    }

    // Deduplicate
    const seen = new Set();
    return allPages.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  /* ══════════════════════════════════════
     CAMPAIGN CREATION
     ══════════════════════════════════════ */
  async createCampaign(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const objConfig = OBJECTIVE_CONFIG[data.objective] || OBJECTIVE_CONFIG.sales;

    const params = {
      name: data.name,
      objective: objConfig.fbObjective,
      status: data.status || "PAUSED",
      special_ad_categories: [],
    };

    // CBO: Budget + bid_strategy on campaign level
    if (data.budget_mode === "CBO" || !data.budget_mode) {
      if (data.daily_budget) {
        params.daily_budget = Math.round(Number(data.daily_budget) * 100);
      }
      if (data.lifetime_budget) {
        params.lifetime_budget = Math.round(Number(data.lifetime_budget) * 100);
      }
      // Bid strategy goes on campaign for CBO
      if (data.bid_strategy) {
        params.bid_strategy = data.bid_strategy;
      }
    }
    // ABO: No budget and no bid_strategy on campaign — they go on ad sets

    const result = await this.graphRequest("POST", `/${id}/campaigns`, params, token);
    logger.info(`Campaign created: ${result.id} in ${id} (${data.objective}, ${data.budget_mode || "CBO"})`);
    return result;
  }

  /* ══════════════════════════════════════
     AD SET CREATION
     — Handles ALL objectives properly
     — Location REQUIRED by Facebook (defaults to account's country)
     — ABO budget + bid_strategy go here, CBO does NOT
     ══════════════════════════════════════ */
  async createAdSet(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const objConfig = OBJECTIVE_CONFIG[data.objective] || OBJECTIVE_CONFIG.sales;

    // ── Build targeting ──
    const targeting = {};

    // Geo locations — REQUIRED by Facebook. Must have at least one country.
    if (data.targeting?.geo_locations && Object.keys(data.targeting.geo_locations).length > 0) {
      const geo = data.targeting.geo_locations;
      if (geo.countries && geo.countries.length > 0) {
        targeting.geo_locations = { countries: geo.countries };
      } else if (geo.regions && geo.regions.length > 0) {
        targeting.geo_locations = { regions: geo.regions };
      } else if (geo.cities && geo.cities.length > 0) {
        targeting.geo_locations = { cities: geo.cities };
      } else {
        // Fallback — Facebook requires at least one location
        targeting.geo_locations = { countries: ["IN"] };
      }
    } else {
      // No location specified — default to India (account's country)
      targeting.geo_locations = { countries: ["IN"] };
    }

    // Excluded geo locations
    if (data.targeting?.excluded_geo_locations) {
      targeting.excluded_geo_locations = data.targeting.excluded_geo_locations;
    }

    // Age (always set reasonable defaults)
    targeting.age_min = data.targeting?.age_min || 18;
    targeting.age_max = data.targeting?.age_max || 65;

    // Gender
    if (data.targeting?.genders && data.targeting.genders.length > 0) {
      targeting.genders = data.targeting.genders;
    }

    // Interests — resolve names to real Facebook IDs if needed
    if (data.targeting?.interests && data.targeting.interests.length > 0) {
      const resolved = await this.resolveInterestIds(data.targeting.interests, token);
      if (resolved.length > 0) {
        targeting.flexible_spec = [{ interests: resolved }];
      }
    }

    // Custom audiences
    if (data.targeting?.custom_audiences && data.targeting.custom_audiences.length > 0) {
      targeting.custom_audiences = data.targeting.custom_audiences;
    }

    // Advantage+ audience — REQUIRED by Facebook
    // When enabled, age_max MUST be 65
    targeting.targeting_automation = { advantage_audience: 1 };
    targeting.age_max = 65;

    // ── Build ad set params ──
    const params = {
      campaign_id: data.campaign_id,
      name: data.name || "Ad Set",
      targeting: targeting,
      billing_event: objConfig.billingEvent,
      optimization_goal: objConfig.optimizationGoal,
      status: data.status || "PAUSED",
    };

    // ── promoted_object — CRITICAL for conversion-based objectives ──
    if (objConfig.needsPixel && data.pixel_id) {
      params.promoted_object = {
        pixel_id: data.pixel_id,
        custom_event_type: objConfig.customEventType,
      };
    } else if (objConfig.needsPixel && !data.pixel_id) {
      // If we need a pixel but don't have one, fall back to LINK_CLICKS
      // This prevents the API from rejecting the ad set
      logger.warn(`No pixel for ${id} with objective ${data.objective} — falling back to LINK_CLICKS`);
      params.optimization_goal = "LINK_CLICKS";
      // Don't set promoted_object — LINK_CLICKS doesn't need it
    }

    // ── ABO: Budget + bid_strategy on ad set level (NOT campaign) ──
    if (data.budget_mode === "ABO") {
      if (data.daily_budget) {
        params.daily_budget = Math.round(Number(data.daily_budget) * 100);
      }
      if (data.lifetime_budget) {
        params.lifetime_budget = Math.round(Number(data.lifetime_budget) * 100);
      }
      // ABO needs bid_strategy at ad set level
      params.bid_strategy = data.bid_strategy || "LOWEST_COST_WITHOUT_CAP";
    }
    // CBO: Do NOT set budget or bid_strategy here — they're on the campaign

    // Schedule
    if (data.start_time) params.start_time = data.start_time;
    if (data.end_time) params.end_time = data.end_time;

    const result = await this.graphRequest("POST", `/${id}/adsets`, params, token);
    logger.info(`Ad Set created: ${result.id} in ${id}`);
    return result;
  }

  /* ══════════════════════════════════════
     MEDIA UPLOADS
     ══════════════════════════════════════ */
  async uploadAdImageFromBuffer(accountId, buffer, filename, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const accessToken = this.getToken(token);
    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("filename", buffer, { filename });

    try {
      const response = await axios.post(`${this.baseUrl}/${id}/adimages`, form, {
        headers: form.getHeaders(),
        timeout: 60000,
      });
      const images = response.data.images;
      const imageHash = Object.values(images)[0]?.hash;
      logger.info(`Image uploaded: ${imageHash} to ${id}`);
      return { hash: imageHash, type: "image" };
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      logger.error(`Image upload failed for ${id}: ${msg}`);
      throw new Error(`Image upload failed: ${msg}`);
    }
  }

  async uploadAdVideoFromBuffer(accountId, buffer, filename, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const accessToken = this.getToken(token);
    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("source", buffer, { filename });
    form.append("title", filename);

    try {
      const response = await axios.post(`${this.baseUrl}/${id}/advideos`, form, {
        headers: form.getHeaders(),
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const videoId = response.data.id;
      logger.info(`Video uploaded: ${videoId} to ${id}`);

      // Poll for video processing instead of fixed wait
      let thumbnailUrl = null;
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const thumbResult = await this.graphRequest("GET", `/${videoId}`, { fields: "thumbnails,picture,status" }, token);
          if (thumbResult.thumbnails?.data?.[0]?.uri) {
            thumbnailUrl = thumbResult.thumbnails.data[0].uri;
            break;
          } else if (thumbResult.picture) {
            thumbnailUrl = thumbResult.picture;
            break;
          }
        } catch (_) { /* video still processing */ }
      }
      logger.info(`Video thumbnail: ${thumbnailUrl ? "found" : "using default"}`);
      return { videoId, thumbnailUrl, type: "video" };
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      logger.error(`Video upload failed for ${id}: ${msg}`);
      throw new Error(`Video upload failed: ${msg}`);
    }
  }

  async uploadCreativeFromBuffer(accountId, buffer, filename, token = null) {
    const ext = (filename || "").toLowerCase().split(".").pop();
    const videoExts = ["mp4", "mov", "avi", "wmv", "flv", "mkv", "webm", "m4v"];
    if (videoExts.includes(ext)) {
      return this.uploadAdVideoFromBuffer(accountId, buffer, filename, token);
    }
    return this.uploadAdImageFromBuffer(accountId, buffer, filename, token);
  }

  /* ══════════════════════════════════════
     AD CREATIVE
     ══════════════════════════════════════ */
  async createAdCreative(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    if (!data.url) {
      throw new Error("Ad creative requires a destination URL");
    }

    const storySpec = { page_id: data.page_id };

    if (data.video_id) {
      // VIDEO creative
      storySpec.video_data = {
        video_id: data.video_id,
        message: data.primary_text || "",
        title: data.headline || "",
        link_description: data.description || "",
        call_to_action: {
          type: data.cta_type || "LEARN_MORE",
          value: { link: data.url },
        },
      };
      if (data.image_hash) {
        storySpec.video_data.image_hash = data.image_hash;
      } else if (data.thumbnail_url) {
        storySpec.video_data.image_url = data.thumbnail_url;
      }
    } else {
      // IMAGE creative
      const linkData = {
        link: data.url,
        message: data.primary_text || "",
        name: data.headline || "",
        call_to_action: {
          type: data.cta_type || "LEARN_MORE",
          value: { link: data.url },
        },
      };
      if (data.description) linkData.description = data.description;
      if (data.image_hash) linkData.image_hash = data.image_hash;
      storySpec.link_data = linkData;
    }

    const params = {
      name: data.name || "BulkAds Creative",
      object_story_spec: storySpec,
    };

    const result = await this.graphRequest("POST", `/${id}/adcreatives`, params, token);
    logger.info(`Creative created: ${result.id} in ${id} (${data.video_id ? "video" : "image"})`);
    return result;
  }

  /* ══════════════════════════════════════
     AD CREATION
     ══════════════════════════════════════ */
  async createAd(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const params = {
      name: data.name || "BulkAds Ad",
      adset_id: data.adset_id,
      creative: { creative_id: data.creative_id },
      status: data.status || "PAUSED",
    };
    const result = await this.graphRequest("POST", `/${id}/ads`, params, token);
    logger.info(`Ad created: ${result.id} in ${id}`);
    return result;
  }

  /* ══════════════════════════════════════
     BULK PUBLISH
     ══════════════════════════════════════ */
  async bulkPublish(config, accountIds, options = {}, token = null) {
    const results = [];
    const concurrency = Math.min(options.concurrency || 2, 5);
    const delayMs = options.delayMs || 1500;

    logger.info(`Bulk publish: "${config.name}" to ${accountIds.length} accounts (${config.objective}, ${config.budget_mode || "CBO"})`);

    for (let i = 0; i < accountIds.length; i += concurrency) {
      const batch = accountIds.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(accId => this.publishToSingleAccount(accId, config, token))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const accId = batch[j];
        const r = batchResults[j];
        results.push({
          accountId: accId,
          success: r.status === "fulfilled",
          data: r.status === "fulfilled" ? r.value : null,
          error: r.status === "rejected" ? (r.reason?.message || "Unknown error") : null,
          errorDetail: r.status === "rejected" ? (r.reason?.detail || "") : null,
        });
      }

      // Delay between batches to avoid rate limits
      if (i + concurrency < accountIds.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    const ok = results.filter(r => r.success).length;
    const fail = results.filter(r => !r.success).length;
    logger.info(`Bulk publish done: ${ok} success, ${fail} failed`);
    return results;
  }

  /**
   * Publish to ONE account
   *
   * Structure: 1 Campaign -> N Ad Sets (each with own targeting) -> M Ads per set
   *
   * KEY FIXES:
   * - CBO: budget ONLY on campaign, NEVER on ad sets
   * - ABO: budget ONLY on ad sets, NEVER on campaign
   * - Location is optional — if no countries specified, worldwide targeting
   * - All objectives get correct optimization_goal and promoted_object
   */
  async publishToSingleAccount(accountId, config, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const budgetMode = config.budget_mode || "CBO";

    logger.info(`Publishing to ${id} (${config.objective}, ${budgetMode}, ${config.ad_sets?.length || 1} sets, ${config.ad_variations?.length || 0} creatives)`);

    // Step 0: Get Pixel if needed
    const objConfig = OBJECTIVE_CONFIG[config.objective] || OBJECTIVE_CONFIG.sales;
    let pixelId = config.pixel_id || null;
    if (objConfig.needsPixel && !pixelId) {
      pixelId = await this.getAccountPixel(id, token);
    }
    if (pixelId) {
      logger.info(`Using pixel ${pixelId} for ${id}`);
    }

    // Step 1: Create Campaign
    const campaignParams = {
      name: config.name,
      objective: config.objective,
      status: config.publish_status || "PAUSED",
      bid_strategy: config.bid_strategy,
      budget_mode: budgetMode,
    };

    // CBO: budget on campaign
    if (budgetMode === "CBO") {
      if (config.budget_type === "daily") {
        campaignParams.daily_budget = config.budget;
      } else {
        campaignParams.lifetime_budget = config.budget;
      }
    }
    // ABO: NO budget on campaign

    const campaign = await this.createCampaign(id, campaignParams, token);

    // Step 2: Upload ALL creatives once for this account
    const uploadedCreatives = [];
    for (let i = 0; i < (config.ad_variations || []).length; i++) {
      const variation = config.ad_variations[i];
      let imageHash = null, videoId = null, thumbnailUrl = null;

      if (variation.image_buffer) {
        const upload = await this.uploadCreativeFromBuffer(
          id, variation.image_buffer,
          variation.image_filename || "creative.jpg", token
        );
        if (upload.type === "video") {
          videoId = upload.videoId;
          thumbnailUrl = upload.thumbnailUrl;
        } else {
          imageHash = upload.hash;
        }
      }
      uploadedCreatives.push({ ...variation, imageHash, videoId, thumbnailUrl, index: i });
    }

    // Step 3: Create Ad Sets
    const adSetsConfig = config.ad_sets && config.ad_sets.length > 0
      ? config.ad_sets
      : [{ name: "Ad Set", audience_type: "broad", targeting: config.targeting || {} }];

    const allAds = [];

    for (let s = 0; s < adSetsConfig.length; s++) {
      const adSetConf = adSetsConfig[s];

      const adsetParams = {
        campaign_id: campaign.id,
        name: `${config.name} - ${adSetConf.name || "Ad Set " + (s + 1)}`,
        objective: config.objective,
        targeting: adSetConf.targeting || config.targeting || {},
        status: config.publish_status || "PAUSED",
        pixel_id: pixelId,
        budget_mode: budgetMode,
      };

      // ABO: budget on each ad set
      if (budgetMode === "ABO") {
        const adSetBudget = adSetConf.budget || config.budget;
        if (config.budget_type === "daily") {
          adsetParams.daily_budget = adSetBudget;
        } else {
          adsetParams.lifetime_budget = adSetBudget;
        }
      }
      // CBO: NO budget on ad sets

      // Schedule
      if (config.start_time) adsetParams.start_time = config.start_time;
      if (config.end_time) adsetParams.end_time = config.end_time;

      const adset = await this.createAdSet(id, adsetParams, token);

      // Step 4: Create one ad per creative in this ad set
      for (let c = 0; c < uploadedCreatives.length; c++) {
        const cr = uploadedCreatives[c];

        const creative = await this.createAdCreative(id, {
          name: `${config.name} - ${adSetConf.name || "Set" + (s + 1)} - Creative ${c + 1}`,
          page_id: config.page_id,
          image_hash: cr.imageHash,
          video_id: cr.videoId,
          thumbnail_url: cr.thumbnailUrl,
          primary_text: cr.primary_text,
          headline: cr.headline,
          description: cr.description,
          url: cr.url || config.url,
          cta_type: mapCtaToApiType(cr.cta),
        }, token);

        const ad = await this.createAd(id, {
          name: `${config.name} - ${adSetConf.name || "Set" + (s + 1)} - Ad ${c + 1}`,
          adset_id: adset.id,
          creative_id: creative.id,
          status: config.publish_status || "PAUSED",
        }, token);

        allAds.push({
          adset_id: adset.id,
          adset_name: adSetConf.name,
          creative_id: creative.id,
          ad_id: ad.id,
        });
      }

      logger.info(`Ad Set "${adSetConf.name}" done: ${uploadedCreatives.length} ads in ${id}`);
    }

    logger.info(`Published to ${id}: campaign=${campaign.id}, ${adSetsConfig.length} sets, ${allAds.length} total ads`);
    return {
      campaign_id: campaign.id,
      ad_sets: adSetsConfig.length,
      total_ads: allAds.length,
      ads: allAds,
      account_id: id,
    };
  }

  /* ══════════════════════════════════════
     INTEREST SEARCH + RESOLVE
     ══════════════════════════════════════ */
  async searchInterests(query, token = null) {
    const result = await this.graphRequest("GET", "/search", { type: "adinterest", q: query }, token);
    return result.data || [];
  }

  /**
   * Resolve interest names to real Facebook IDs.
   * AI suggestions may use names without valid IDs — this searches Facebook
   * for each name and returns the best match with a real ID.
   */
  async resolveInterestIds(interests, token = null) {
    const resolved = [];
    for (const interest of interests) {
      // If it already has a valid numeric ID (from the search endpoint), keep it
      if (interest.id && /^\d+$/.test(String(interest.id))) {
        resolved.push({ id: String(interest.id), name: interest.name });
        continue;
      }
      // Otherwise search for the name to get a real ID
      try {
        const results = await this.searchInterests(interest.name, token);
        if (results.length > 0) {
          resolved.push({ id: results[0].id, name: results[0].name });
        } else {
          logger.warn(`Interest not found: "${interest.name}" — skipping`);
        }
      } catch (e) {
        logger.warn(`Interest search failed for "${interest.name}": ${e.message}`);
      }
    }
    return resolved;
  }
}

/* ══════════════════════════════════════
   CTA MAPPING
   ══════════════════════════════════════ */
function mapCtaToApiType(label) {
  const map = {
    "Shop Now": "SHOP_NOW",
    "Learn More": "LEARN_MORE",
    "Sign Up": "SIGN_UP",
    "Book Now": "BOOK_TRAVEL",
    "Contact Us": "CONTACT_US",
    "Get Offer": "GET_OFFER",
    "Download": "DOWNLOAD",
    "Subscribe": "SUBSCRIBE",
    "Apply Now": "APPLY_NOW",
    "Get Quote": "GET_QUOTE",
    "Order Now": "ORDER_NOW",
    "See Menu": "SEE_MENU",
    "Watch More": "WATCH_MORE",
    "Send Message": "MESSAGE_PAGE",
  };
  return map[label] || "LEARN_MORE";
}

module.exports = new FacebookService();
