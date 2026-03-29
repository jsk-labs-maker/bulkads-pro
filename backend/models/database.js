const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Ensure data directory exists
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "bulkads.db");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath,
  logging: false,
  define: { underscored: false },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});

// Enable WAL mode for better concurrent access
sequelize.query("PRAGMA journal_mode=WAL;").catch(() => {});
sequelize.query("PRAGMA busy_timeout=5000;").catch(() => {});

/* ══════════════════════════════════════
   MODELS
   ══════════════════════════════════════ */

const Campaign = sequelize.define("Campaign", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  objective: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "draft" },
  budget: { type: DataTypes.FLOAT, defaultValue: 0 },
  budgetType: { type: DataTypes.STRING, defaultValue: "daily" },
  budgetMode: { type: DataTypes.STRING, defaultValue: "CBO" },
  accountIds: { type: DataTypes.JSON, defaultValue: [] },
  accountCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  successCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  failCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  publishResults: { type: DataTypes.JSON, defaultValue: [] },
  publishedAt: DataTypes.DATE,
});

const Template = sequelize.define("Template", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  icon: { type: DataTypes.STRING, defaultValue: "🎯" },
  objective: { type: DataTypes.STRING, defaultValue: "sales" },
  budget: { type: DataTypes.STRING, defaultValue: "50" },
  audienceType: { type: DataTypes.STRING, defaultValue: "broad" },
  placements: { type: DataTypes.JSON, defaultValue: [] },
  primaryText: { type: DataTypes.TEXT, defaultValue: "" },
  headline: { type: DataTypes.STRING, defaultValue: "" },
  description: { type: DataTypes.STRING, defaultValue: "" },
  cta: { type: DataTypes.STRING, defaultValue: "Shop Now" },
  url: { type: DataTypes.STRING, defaultValue: "" },
  ageMin: { type: DataTypes.INTEGER, defaultValue: 18 },
  ageMax: { type: DataTypes.INTEGER, defaultValue: 65 },
  gender: { type: DataTypes.STRING, defaultValue: "all" },
  interests: { type: DataTypes.JSON, defaultValue: [] },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const AccountGroup = sequelize.define("AccountGroup", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  accountIds: { type: DataTypes.JSON, defaultValue: [] },
});

const Credential = sequelize.define("Credential", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.STRING, unique: true, allowNull: false },
  appId: { type: DataTypes.STRING, defaultValue: "" },
  systemUserToken: { type: DataTypes.TEXT, defaultValue: "" },
  appSecret: { type: DataTypes.STRING, defaultValue: "" },
});

/* ══════════════════════════════════════
   DEFAULT TEMPLATES
   ══════════════════════════════════════ */
const defaults = [
  { name: "Sales — Broad", icon: "🛍️", objective: "sales", budget: "50", audienceType: "broad", primaryText: "Shop our latest collection!", headline: "Limited Time Offer", cta: "Shop Now", isDefault: true },
  { name: "Traffic — Interest", icon: "🔗", objective: "traffic", budget: "30", audienceType: "detailed", primaryText: "Discover something new", headline: "Check It Out", cta: "Learn More", isDefault: true },
  { name: "Leads — Broad", icon: "📋", objective: "leads", budget: "40", audienceType: "broad", primaryText: "Sign up today", headline: "Get Started Free", cta: "Sign Up", isDefault: true },
  { name: "Awareness — Mass", icon: "📢", objective: "awareness", budget: "25", audienceType: "broad", primaryText: "Meet our brand", headline: "Introducing Us", cta: "Learn More", isDefault: true },
  { name: "Engagement — Social", icon: "💬", objective: "engagement", budget: "20", audienceType: "broad", primaryText: "Join the conversation", headline: "What do you think?", cta: "Learn More", isDefault: true },
  { name: "Video Views — Broad", icon: "🎬", objective: "video_views", budget: "15", audienceType: "broad", primaryText: "Watch our story", headline: "Press Play", cta: "Watch More", isDefault: true },
  { name: "App Installs", icon: "📱", objective: "app_installs", budget: "35", audienceType: "broad", primaryText: "Download our app today", headline: "Get the App", cta: "Download", isDefault: true },
  { name: "Conversions — Retarget", icon: "🎯", objective: "conversions", budget: "60", audienceType: "detailed", primaryText: "Come back and complete your purchase", headline: "Your cart is waiting", cta: "Shop Now", isDefault: true },
];

/* ══════════════════════════════════════
   INIT
   ══════════════════════════════════════ */
async function initDatabase() {
  try {
    await sequelize.authenticate();
    logger.info("Database connected");

    await sequelize.sync({ alter: true });
    logger.info("Database models synced");

    const count = await Template.count({ where: { isDefault: true } });
    if (count === 0) {
      await Template.bulkCreate(defaults);
      logger.info(`Seeded ${defaults.length} default templates`);
    }
  } catch (e) {
    logger.error("Database initialization failed", { error: e.message });
    throw e;
  }
}

async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info("Database connection closed");
  } catch (e) {
    logger.warn("Error closing database", { error: e.message });
  }
}

module.exports = { sequelize, Campaign, Template, AccountGroup, Credential, initDatabase, closeDatabase };
