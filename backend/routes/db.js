const express = require("express");
const router = express.Router();
const { Campaign, Template, AccountGroup, Credential } = require("../models/database");
const logger = require("../utils/logger");

router.get("/templates", async (req, res) => {
  try { const templates = await Template.findAll({ order: [["isDefault","DESC"],["createdAt","DESC"]] }); res.json({ success: true, templates }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.post("/templates", async (req, res) => {
  try { const t = await Template.create(req.body); res.json({ success: true, template: t }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.put("/templates/:id", async (req, res) => {
  try { await Template.update(req.body, { where: { id: req.params.id } }); const t = await Template.findByPk(req.params.id); res.json({ success: true, template: t }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.delete("/templates/:id", async (req, res) => {
  try { await Template.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.get("/groups", async (req, res) => {
  try { const groups = await AccountGroup.findAll(); res.json({ success: true, groups }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.post("/groups", async (req, res) => {
  try { const g = await AccountGroup.create(req.body); res.json({ success: true, group: g }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.delete("/groups/:id", async (req, res) => {
  try { await AccountGroup.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.get("/campaigns", async (req, res) => {
  try { const campaigns = await Campaign.findAll({ order: [["createdAt","DESC"]], limit: 50 }); res.json({ success: true, campaigns }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.post("/campaigns", async (req, res) => {
  try { const c = await Campaign.create(req.body); logger.info("Campaign saved: " + c.name, { id: c.id }); res.json({ success: true, campaign: c }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.get("/credentials", async (req, res) => {
  try { const creds = await Credential.findAll(); res.json({ success: true, credentials: creds }); } catch (e) { res.json({ success: false, error: e.message }); }
});
router.post("/credentials", async (req, res) => {
  try {
    const [c] = await Credential.upsert(req.body);
    res.json({ success: true, credential: c });
  } catch (e) { res.json({ success: false, error: e.message }); }
});
router.get("/stats", async (req, res) => {
  try {
    const campaigns = await Campaign.count();
    const templates = await Template.count();
    const groups = await AccountGroup.count();
    res.json({ success: true, stats: { campaigns, templates, groups } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});
module.exports = router;
