const express = require("express");
const router = express.Router();
const { Campaign, Template, AccountGroup, Credential } = require("../models/database");
const logger = require("../utils/logger");

/* ══════════════════════════════════════
   TEMPLATES
   ══════════════════════════════════════ */

// Allowed fields for templates — prevents mass assignment
const TEMPLATE_FIELDS = ["name", "icon", "objective", "budget", "audienceType", "placements",
  "primaryText", "headline", "description", "cta", "url", "ageMin", "ageMax", "gender", "interests"];

router.get("/templates", async (req, res) => {
  try {
    const templates = await Template.findAll({
      order: [["isDefault", "DESC"], ["createdAt", "DESC"]],
      limit: 100,
    });
    res.json({ success: true, templates });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch templates" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const data = {};
    for (const field of TEMPLATE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (!data.name) return res.status(400).json({ success: false, error: "Template name required" });
    const t = await Template.create(data);
    res.status(201).json({ success: true, template: t });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create template" });
  }
});

router.put("/templates/:id", async (req, res) => {
  try {
    const data = {};
    for (const field of TEMPLATE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const [updated] = await Template.update(data, { where: { id: req.params.id, isDefault: false } });
    if (!updated) return res.status(404).json({ success: false, error: "Template not found or is a default template" });
    const t = await Template.findByPk(req.params.id);
    res.json({ success: true, template: t });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to update template" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const deleted = await Template.destroy({ where: { id: req.params.id, isDefault: false } });
    if (!deleted) return res.status(404).json({ success: false, error: "Template not found or is a default template" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete template" });
  }
});

/* ══════════════════════════════════════
   ACCOUNT GROUPS
   ══════════════════════════════════════ */

router.get("/groups", async (req, res) => {
  try {
    const groups = await AccountGroup.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
    res.json({ success: true, groups });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch groups" });
  }
});

router.post("/groups", async (req, res) => {
  try {
    const { name, accountIds } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Group name required" });
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ success: false, error: "At least one account ID required" });
    }
    const g = await AccountGroup.create({ name, accountIds });
    res.status(201).json({ success: true, group: g });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to create group" });
  }
});

router.delete("/groups/:id", async (req, res) => {
  try {
    const deleted = await AccountGroup.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ success: false, error: "Group not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to delete group" });
  }
});

/* ══════════════════════════════════════
   CAMPAIGNS (history)
   ══════════════════════════════════════ */

const CAMPAIGN_FIELDS = ["name", "objective", "status", "budget", "budgetType", "budgetMode",
  "accountIds", "accountCount", "successCount", "failCount", "publishResults", "publishedAt"];

router.get("/campaigns", async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ success: true, campaigns });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const data = {};
    for (const field of CAMPAIGN_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (!data.name) return res.status(400).json({ success: false, error: "Campaign name required" });
    const c = await Campaign.create(data);
    logger.info("Campaign saved: " + c.name);
    res.status(201).json({ success: true, campaign: c });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to save campaign" });
  }
});

/* ══════════════════════════════════════
   CREDENTIALS
   ══════════════════════════════════════ */

router.get("/credentials", async (req, res) => {
  try {
    const creds = await Credential.findAll();
    // Mask sensitive fields
    const masked = creds.map(c => ({
      id: c.id,
      businessId: c.businessId,
      appId: c.appId,
      hasToken: !!c.systemUserToken,
      hasSecret: !!c.appSecret,
      updatedAt: c.updatedAt,
    }));
    res.json({ success: true, credentials: masked });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch credentials" });
  }
});

router.post("/credentials", async (req, res) => {
  try {
    const { businessId, appId, systemUserToken, appSecret } = req.body;
    if (!businessId) return res.status(400).json({ success: false, error: "Business ID required" });
    const [c] = await Credential.upsert({ businessId, appId, systemUserToken, appSecret });
    res.json({ success: true, saved: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to save credentials" });
  }
});

/* ══════════════════════════════════════
   STATS
   ══════════════════════════════════════ */

router.get("/stats", async (req, res) => {
  try {
    const [campaigns, templates, groups] = await Promise.all([
      Campaign.count(),
      Template.count(),
      AccountGroup.count(),
    ]);
    res.json({ success: true, stats: { campaigns, templates, groups } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

module.exports = router;
