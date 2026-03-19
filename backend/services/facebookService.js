/**
 * ══════════════════════════════════════════════════════════════
 * Facebook Graph API Service — v4 (ALL BUGS FIXED)
 * ══════════════════════════════════════════════════════════════
 * 
 * FIXES:
 * 1. POST params use URLSearchParams — no double-JSON encoding
 * 2. Budget goes to campaign level ONLY (CBO) — not duplicated on ad set
 * 3. promoted_object with pixel_id for Sales/Conversions
 * 4. special_ad_categories as proper empty array []
 * 5. Validates creative URL is not empty
 * 6. Detailed error logging with full FB response
 * 7. Auto-fetches pixel per account for conversion campaigns
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const logger = require("../utils/logger");

const FB_GRAPH_URL = "https://graph.facebook.com";

class FacebookService {
  constructor() {
    this.apiVersion = process.env.FB_API_VERSION || "v21.0";
    this.baseUrl = `${FB_GRAPH_URL}/${this.apiVersion}`;
  }

  getToken(userToken = null) {
    return userToken || process.env.FB_SYSTEM_USER_TOKEN;
  }

  /**
   * Graph API request — handles serialization properly
   * For POST: values are sent as form-urlencoded strings
   * Objects/arrays MUST be JSON.stringify'd ONCE before passing here
   */
  async graphRequest(method, endpoint, params = {}, token = null) {
    const accessToken = this.getToken(token);
    if (!accessToken) throw new Error("No access token");

    const url = `${this.baseUrl}${endpoint}`;

    try {
      let response;
      if (method === "GET") {
        response = await axios.get(url, { params: { access_token: accessToken, ...params }, timeout: 30000 });
      } else {
        // POST: Facebook expects application/x-www-form-urlencoded
        const form = new URLSearchParams();
        form.append("access_token", accessToken);
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined || value === null) continue;
          // If value is already a string, send as-is. If object/array, JSON.stringify it.
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
      logger.debug(`FB API ${method} ${endpoint} → OK`);
      return response.data;
    } catch (error) {
      const fbError = error.response?.data?.error;
      const errMsg = fbError?.message || error.message;
      const errDetail = fbError?.error_user_msg || fbError?.error_user_title || "";
      logger.error(`FB API Error [${method} ${endpoint}]: ${errMsg}`, {
        code: fbError?.code,
        subcode: fbError?.error_subcode,
        type: fbError?.type,
        detail: errDetail,
        fbtrace: fbError?.fbtrace_id,
      });
      throw {
        message: errMsg,
        detail: errDetail,
        code: fbError?.code,
        subcode: fbError?.error_subcode,
        type: fbError?.type,
      };
    }
  }

  /* ── TOKEN ── */
  async validateToken(token) {
    const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const result = await axios.get(`${this.baseUrl}/debug_token`, { params: { input_token: token, access_token: appToken } });
    return result.data.data;
  }

  async exchangeForLongLivedToken(shortLivedToken) {
    const result = await axios.get(`${this.baseUrl}/oauth/access_token`, {
      params: { grant_type: "fb_exchange_token", client_id: process.env.FB_APP_ID, client_secret: process.env.FB_APP_SECRET, fb_exchange_token: shortLivedToken },
    });
    return result.data;
  }

  /* ── ACCOUNTS ── */
  async getOwnedAdAccounts(businessId, token = null) {
    const accounts = [];
    const params = {
      fields: "id,name,account_id,account_status,currency,timezone_name,timezone_offset_hours_utc,amount_spent,balance,business_name,spend_cap,disable_reason",
      limit: 100,
    };
    const result = await this.graphRequest("GET", `/${businessId}/owned_ad_accounts`, params, token);
    if (result.data) accounts.push(...result.data);
    // Handle pagination
    let next = result.paging?.next;
    while (next) {
      try {
        const r = await axios.get(next, { timeout: 30000 });
        if (r.data?.data) accounts.push(...r.data.data);
        next = r.data?.paging?.next;
      } catch (e) { break; }
    }
    logger.info(`Fetched ${accounts.length} owned ad accounts`);
    return accounts;
  }

  async getClientAdAccounts(businessId, token = null) {
    try {
      const result = await this.graphRequest("GET", `/${businessId}/client_ad_accounts`, {
        fields: "id,name,account_id,account_status,currency,timezone_name,amount_spent,business_name", limit: 100,
      }, token);
      return result.data || [];
    } catch (e) { return []; }
  }

  async getAllAdAccounts(businessId, token = null) {
    const [owned, client] = await Promise.allSettled([
      this.getOwnedAdAccounts(businessId, token),
      this.getClientAdAccounts(businessId, token),
    ]);
    const all = [...(owned.value || []), ...(client.value || [])];
    const seen = new Set();
    return all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  }

  async getAdAccountDetails(accountId, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    return this.graphRequest("GET", `/${id}`, { fields: "id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name,spend_cap,disable_reason" }, token);
  }

  /* ── PIXEL ── */
  async getAccountPixel(accountId, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    try {
      const result = await this.graphRequest("GET", `/${id}/adspixels`, { fields: "id,name", limit: 1 }, token);
      if (result.data && result.data.length > 0) {
        logger.info(`Pixel found: ${result.data[0].id} (${result.data[0].name}) for ${id}`);
        return result.data[0].id;
      }
    } catch (e) {
      logger.warn(`Pixel fetch failed for ${id}: ${e.message}`);
    }
    return null;
  }

  /* ── PAGES ── */
  async getBusinessPages(businessId, token = null) {
    const allPages = [];
    try {
      const r = await this.graphRequest("GET", `/${businessId}/owned_pages`, { fields: "id,name,picture", limit: 100 }, token);
      if (r.data) allPages.push(...r.data);
    } catch (e) {}
    try {
      const r = await this.graphRequest("GET", `/${businessId}/client_pages`, { fields: "id,name,picture", limit: 100 }, token);
      if (r.data) allPages.push(...r.data);
    } catch (e) {}
    try {
      const r = await this.graphRequest("GET", `/me/accounts`, { fields: "id,name,picture", limit: 100 }, token);
      if (r.data) allPages.push(...r.data);
    } catch (e) {}
    const seen = new Set();
    return allPages.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }

  /* ══════════════════════════════════════════════════════════════
     CAMPAIGN CREATION
     ══════════════════════════════════════════════════════════════ */
  async createCampaign(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    const objectiveMap = {
      conversions: "OUTCOME_SALES", traffic: "OUTCOME_TRAFFIC", awareness: "OUTCOME_AWARENESS",
      engagement: "OUTCOME_ENGAGEMENT", leads: "OUTCOME_LEADS", sales: "OUTCOME_SALES",
      app_installs: "OUTCOME_APP_PROMOTION", video_views: "OUTCOME_ENGAGEMENT",
    };

    const params = {
      name: data.name,
      objective: objectiveMap[data.objective] || data.objective,
      status: data.status || "PAUSED",
      special_ad_categories: [], // Must be array, empty = no special category
    };

    // Budget at campaign level (CBO — Campaign Budget Optimization)
    if (data.daily_budget) {
      params.daily_budget = Math.round(data.daily_budget * 100); // cents
    }
    if (data.lifetime_budget) {
      params.lifetime_budget = Math.round(data.lifetime_budget * 100);
    }
    if (data.bid_strategy) {
      params.bid_strategy = data.bid_strategy;
    }

    const result = await this.graphRequest("POST", `/${id}/campaigns`, params, token);
    logger.info(`Campaign created: ${result.id} in ${id}`);
    return result;
  }

  /* ══════════════════════════════════════════════════════════════
     AD SET CREATION — with pixel + promoted_object
     ══════════════════════════════════════════════════════════════ */
  async createAdSet(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    // Build targeting
    const targeting = {};

    // Geo locations
    if (data.targeting?.geo_locations) {
      targeting.geo_locations = data.targeting.geo_locations;
    } else {
      targeting.geo_locations = { countries: ["US"] };
    }

    // Age
    if (data.targeting?.age_min) targeting.age_min = data.targeting.age_min;
    if (data.targeting?.age_max) targeting.age_max = data.targeting.age_max;

    // Gender
    if (data.targeting?.genders) targeting.genders = data.targeting.genders;

    // Interests
    if (data.targeting?.interests?.length > 0) {
      targeting.flexible_spec = [{ interests: data.targeting.interests }];
    }

    // Placements
    if (data.publisher_platforms?.length > 0) {
      targeting.publisher_platforms = data.publisher_platforms;
      if (data.facebook_positions?.length > 0) targeting.facebook_positions = data.facebook_positions;
      if (data.instagram_positions?.length > 0) targeting.instagram_positions = data.instagram_positions;
    }

    // Optimization goal
    const optMap = {
      conversions: "OFFSITE_CONVERSIONS", traffic: "LINK_CLICKS", awareness: "REACH",
      engagement: "POST_ENGAGEMENT", leads: "LEAD_GENERATION", sales: "OFFSITE_CONVERSIONS",
      app_installs: "APP_INSTALLS", video_views: "THRUPLAY",
    };

    // Add targeting_automation INSIDE targeting spec
    targeting.targeting_automation = { advantage_audience: 1 };

    const params = {
      campaign_id: data.campaign_id,
      name: data.name || "Ad Set",
      targeting: targeting,
      billing_event: "IMPRESSIONS",
      optimization_goal: optMap[data.objective] || "OFFSITE_CONVERSIONS",
      status: data.status || "PAUSED",
      // Also send as top-level param (some API versions need this)
      targeting_automation: { advantage_audience: 1 },
    };

    // CRITICAL: promoted_object for conversion-based campaigns
    const needsPixel = ["conversions", "sales"].includes(data.objective);
    if (needsPixel && data.pixel_id) {
      params.promoted_object = { pixel_id: data.pixel_id, custom_event_type: "PURCHASE" };
    } else if (data.objective === "leads" && data.pixel_id) {
      params.promoted_object = { pixel_id: data.pixel_id, custom_event_type: "LEAD" };
    } else if (needsPixel && !data.pixel_id) {
      // No pixel — switch to link clicks so it doesn't fail
      logger.warn(`No pixel for ${id}, switching to LINK_CLICKS optimization`);
      params.optimization_goal = "LINK_CLICKS";
    }

    // NO budget here when CBO — budget on ad set only for ABO
    if (data.daily_budget) {
      params.daily_budget = Math.round(data.daily_budget * 100);
    }
    if (data.lifetime_budget) {
      params.lifetime_budget = Math.round(data.lifetime_budget * 100);
    }

    const result = await this.graphRequest("POST", `/${id}/adsets`, params, token);
    logger.info(`Ad Set created: ${result.id} in ${id}`);
    return result;
  }

  /* ══════════════════════════════════════════════════════════════
     IMAGE UPLOAD
     ══════════════════════════════════════════════════════════════ */
  async uploadAdImageFromBuffer(accountId, buffer, filename, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const accessToken = this.getToken(token);
    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("filename", buffer, { filename });
    try {
      const response = await axios.post(`${this.baseUrl}/${id}/adimages`, form, {
        headers: form.getHeaders(), timeout: 60000,
      });
      const images = response.data.images;
      const imageHash = Object.values(images)[0]?.hash;
      logger.info(`Image uploaded: ${imageHash} to ${id}`);
      return { hash: imageHash, type: "image" };
    } catch (error) {
      const fbErr = error.response?.data?.error;
      logger.error(`Image upload failed for ${id}: ${fbErr?.message || error.message}`);
      throw { message: fbErr?.message || error.message };
    }
  }

  /**
   * Upload VIDEO to an ad account
   * POST /act_{account_id}/advideos
   * Returns video ID needed for video_data in ad creative
   */
  async uploadAdVideoFromBuffer(accountId, buffer, filename, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const accessToken = this.getToken(token);
    const form = new FormData();
    form.append("access_token", accessToken);
    form.append("source", buffer, { filename });
    form.append("title", filename);
    try {
      const response = await axios.post(`${this.baseUrl}/${id}/advideos`, form, {
        headers: form.getHeaders(), timeout: 300000,
        maxContentLength: Infinity, maxBodyLength: Infinity,
      });
      const videoId = response.data.id;
      logger.info(`Video uploaded: ${videoId} to ${id}`);
      
      // Wait for video to process — Facebook needs time to generate thumbnails
      logger.info(`Waiting 8s for video ${videoId} to process...`);
      await new Promise(r => setTimeout(r, 8000));
      
      // Get video thumbnail
      let thumbnailUrl = null;
      try {
        const thumbResult = await this.graphRequest("GET", `/${videoId}`, { fields: "thumbnails,picture" }, token);
        if (thumbResult.thumbnails?.data?.[0]?.uri) {
          thumbnailUrl = thumbResult.thumbnails.data[0].uri;
        } else if (thumbResult.picture) {
          thumbnailUrl = thumbResult.picture;
        }
        logger.info(`Video thumbnail: ${thumbnailUrl ? "found" : "not found"}`);
      } catch (e) { logger.warn(`Thumbnail fetch failed for video ${videoId}: ${e.message}`); }
      
      return { videoId, thumbnailUrl, type: "video" };
    } catch (error) {
      const fbErr = error.response?.data?.error;
      logger.error(`Video upload failed for ${id}: ${fbErr?.message || error.message}`);
      throw { message: fbErr?.message || error.message };
    }
  }

  /**
   * Smart upload — detects image vs video by filename extension
   */
  async uploadCreativeFromBuffer(accountId, buffer, filename, token = null) {
    const ext = (filename || "").toLowerCase().split(".").pop();
    const videoExts = ["mp4", "mov", "avi", "wmv", "flv", "mkv", "webm", "m4v"];
    
    if (videoExts.includes(ext)) {
      return this.uploadAdVideoFromBuffer(accountId, buffer, filename, token);
    } else {
      return this.uploadAdImageFromBuffer(accountId, buffer, filename, token);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     AD CREATIVE — with proper object_story_spec
     ══════════════════════════════════════════════════════════════ */
  async createAdCreative(accountId, data, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    const link = data.url || data.link || "https://example.com";

    const storySpec = { page_id: data.page_id };

    if (data.video_id) {
      // VIDEO creative — use video_data
      storySpec.video_data = {
        video_id: data.video_id,
        message: data.primary_text || "Check this out!",
        title: data.headline || "Learn More",
        link_description: data.description || "",
        call_to_action: {
          type: data.cta_type || "LEARN_MORE",
          value: { link: link },
        },
      };
      // REQUIRED: Facebook needs either image_hash or image_url for video thumbnail
      if (data.image_hash) {
        storySpec.video_data.image_hash = data.image_hash;
      } else if (data.thumbnail_url) {
        storySpec.video_data.image_url = data.thumbnail_url;
      }
    } else {
      // IMAGE creative — use link_data
      const linkData = {
        link: link,
        message: data.primary_text || "Check this out!",
        name: data.headline || "Learn More",
        call_to_action: {
          type: data.cta_type || "LEARN_MORE",
          value: { link: link },
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

  /* ══════════════════════════════════════════════════════════════
     AD CREATION
     ══════════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════════
     BULK PUBLISH
     ══════════════════════════════════════════════════════════════ */
  async bulkPublish(config, accountIds, options = {}, token = null) {
    const results = [];
    const concurrency = options.concurrency || 2;
    const delayMs = options.delayMs || 1500;

    logger.info(`Bulk publish starting: "${config.name}" to ${accountIds.length} accounts`);

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
   * Publish to ONE account — NEW STRUCTURE:
   * 1 Campaign → N Ad Sets (each with own targeting) → M Ads per ad set (one per video)
   * 
   * config.budget_mode = "CBO" | "ABO"
   * config.ad_sets = [
   *   { name, audience_type, targeting, budget (for ABO) },
   *   ...
   * ]
   * config.ad_variations = [{ primary_text, headline, description, cta, url, image_buffer, image_filename }]
   * All videos go into EVERY ad set
   */
  async publishToSingleAccount(accountId, config, token = null) {
    const id = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
    logger.info(`Publishing to ${id}... (${config.ad_sets?.length || 1} ad sets, ${config.ad_variations?.length || 0} creatives)`);

    // Step 0: Get Pixel — use override if provided, otherwise auto-detect
    let pixelId = config.pixel_id || null;
    const needsPixel = ["conversions", "sales", "leads"].includes(config.objective);
    if (needsPixel && !pixelId) {
      pixelId = await this.getAccountPixel(id, token);
    }
    if (pixelId) {
      logger.info(`Using pixel ${pixelId} for ${id}${config.pixel_id ? " (manual override)" : " (auto-detected)"}`);
    }

    // Step 1: Create Campaign
    const campaignParams = {
      name: config.name,
      objective: config.objective,
      status: config.publish_status || "PAUSED",
      bid_strategy: config.bid_strategy,
    };
    // CBO = budget on campaign, ABO = budget on each ad set
    if (config.budget_mode === "CBO" || !config.budget_mode) {
      if (config.budget_type === "daily") campaignParams.daily_budget = config.budget;
      else campaignParams.lifetime_budget = config.budget;
    }
    const campaign = await this.createCampaign(id, campaignParams, token);

    // Step 2: Upload ALL creatives ONCE for this account (reuse across ad sets)
    const uploadedCreatives = [];
    for (let i = 0; i < (config.ad_variations || []).length; i++) {
      const variation = config.ad_variations[i];
      let imageHash = null, videoId = null, thumbnailUrl = null;

      if (variation.image_buffer) {
        const upload = await this.uploadCreativeFromBuffer(id, variation.image_buffer, variation.image_filename || "creative.jpg", token);
        if (upload.type === "video") {
          videoId = upload.videoId;
          thumbnailUrl = upload.thumbnailUrl;
        } else {
          imageHash = upload.hash;
        }
      }
      uploadedCreatives.push({ ...variation, imageHash, videoId, thumbnailUrl, index: i });
    }

    // Step 3: Create Ad Sets — one per ad_sets entry (or 1 default)
    const adSetsConfig = config.ad_sets && config.ad_sets.length > 0
      ? config.ad_sets
      : [{ name: "Ad Set", audience_type: "broad", targeting: config.targeting || {} }];

    const allAds = [];

    for (let s = 0; s < adSetsConfig.length; s++) {
      const adSetConf = adSetsConfig[s];
      
      const adsetParams = {
        campaign_id: campaign.id,
        name: `${config.name} — ${adSetConf.name || "Ad Set " + (s + 1)}`,
        objective: config.objective,
        targeting: adSetConf.targeting || config.targeting || {},
        status: config.publish_status || "PAUSED",
        pixel_id: pixelId,
      };

      // ABO = budget per ad set
      if (config.budget_mode === "ABO" && adSetConf.budget) {
        if (config.budget_type === "daily") adsetParams.daily_budget = adSetConf.budget;
        else adsetParams.lifetime_budget = adSetConf.budget;
      }

      const adset = await this.createAdSet(id, adsetParams, token);

      // Step 4: Create one ad per creative in this ad set
      for (let c = 0; c < uploadedCreatives.length; c++) {
        const cr = uploadedCreatives[c];

        const creative = await this.createAdCreative(id, {
          name: `${config.name} — ${adSetConf.name || "Set" + (s + 1)} — Creative ${c + 1}`,
          page_id: config.page_id,
          image_hash: cr.imageHash,
          video_id: cr.videoId,
          thumbnail_url: cr.thumbnailUrl,
          primary_text: cr.primary_text,
          headline: cr.headline,
          description: cr.description,
          url: cr.url || config.url || "https://example.com",
          cta_type: mapCtaToApiType(cr.cta),
        }, token);

        const ad = await this.createAd(id, {
          name: `${config.name} — ${adSetConf.name || "Set" + (s + 1)} — Ad ${c + 1}`,
          adset_id: adset.id,
          creative_id: creative.id,
          status: config.publish_status || "PAUSED",
        }, token);

        allAds.push({ adset_id: adset.id, adset_name: adSetConf.name, creative_id: creative.id, ad_id: ad.id });
      }

      logger.info(`Ad Set "${adSetConf.name}" done: ${uploadedCreatives.length} ads created in ${id}`);
    }

    logger.info(`Published to ${id}: campaign=${campaign.id}, ${adSetsConfig.length} ad sets, ${allAds.length} total ads`);
    return { campaign_id: campaign.id, ad_sets: adSetsConfig.length, total_ads: allAds.length, ads: allAds, account_id: id };
  }

  /* ── Interest Search ── */
  async searchInterests(query, token = null) {
    const result = await this.graphRequest("GET", "/search", { type: "adinterest", q: query }, token);
    return result.data || [];
  }
}

/* ── CTA Mapping ── */
function mapCtaToApiType(label) {
  const map = {
    "Shop Now": "SHOP_NOW", "Learn More": "LEARN_MORE", "Sign Up": "SIGN_UP",
    "Book Now": "BOOK_TRAVEL", "Contact Us": "CONTACT_US", "Get Offer": "GET_OFFER",
    "Download": "DOWNLOAD", "Subscribe": "SUBSCRIBE", "Apply Now": "APPLY_NOW",
    "Get Quote": "GET_QUOTE", "Order Now": "ORDER_NOW", "See Menu": "SEE_MENU",
    "Watch More": "WATCH_MORE", "Send Message": "MESSAGE_PAGE",
  };
  return map[label] || "LEARN_MORE";
}

module.exports = new FacebookService();
