const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");
const logger = require("../utils/logger");

const dbPath = path.join(__dirname, "../data/bulkads.db");
const sequelize = new Sequelize({ dialect: "sqlite", storage: dbPath, logging: false });

const Campaign = sequelize.define("Campaign", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  objective: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: "draft" },
  budget: DataTypes.FLOAT,
  budgetType: { type: DataTypes.STRING, defaultValue: "daily" },
  accountIds: { type: DataTypes.JSON, defaultValue: [] },
  accountCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  successCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  failCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  publishResults: { type: DataTypes.JSON, defaultValue: [] },
  publishedAt: DataTypes.DATE,
});

const Template = sequelize.define("Template", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  icon: { type: DataTypes.STRING, defaultValue: "🎯" },
  objective: DataTypes.STRING,
  budget: DataTypes.STRING,
  audienceType: { type: DataTypes.STRING, defaultValue: "broad" },
  placements: { type: DataTypes.JSON, defaultValue: [] },
  primaryText: DataTypes.TEXT,
  headline: DataTypes.STRING,
  description: DataTypes.STRING,
  cta: { type: DataTypes.STRING, defaultValue: "Shop Now" },
  url: DataTypes.STRING,
  ageMin: { type: DataTypes.INTEGER, defaultValue: 18 },
  ageMax: { type: DataTypes.INTEGER, defaultValue: 65 },
  gender: { type: DataTypes.STRING, defaultValue: "all" },
  interests: { type: DataTypes.JSON, defaultValue: [] },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const AccountGroup = sequelize.define("AccountGroup", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  accountIds: { type: DataTypes.JSON, defaultValue: [] },
});

const Credential = sequelize.define("Credential", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.STRING, unique: true },
  appId: DataTypes.STRING,
  systemUserToken: DataTypes.TEXT,
  appSecret: DataTypes.STRING,
});

const defaults = [
  { name:"Sales — Broad",icon:"🛍️",objective:"sales",budget:"50",audienceType:"broad",primaryText:"Shop our latest collection!",headline:"Limited Time Offer",cta:"Shop Now",isDefault:true },
  { name:"Traffic — Interest",icon:"🔗",objective:"traffic",budget:"30",audienceType:"detailed",primaryText:"Discover something new",headline:"Check It Out",cta:"Learn More",isDefault:true },
  { name:"Leads — Broad",icon:"📋",objective:"leads",budget:"40",audienceType:"broad",primaryText:"Sign up today",headline:"Get Started Free",cta:"Sign Up",isDefault:true },
  { name:"Awareness — Mass",icon:"📢",objective:"awareness",budget:"25",audienceType:"broad",primaryText:"Meet our brand",headline:"Introducing Us",cta:"Learn More",isDefault:true },
  { name:"Engagement — Social",icon:"💬",objective:"engagement",budget:"20",audienceType:"broad",primaryText:"Join the conversation",headline:"What do you think?",cta:"Learn More",isDefault:true },
  { name:"Video Views — Broad",icon:"🎬",objective:"video_views",budget:"15",audienceType:"broad",primaryText:"Watch our story",headline:"Press Play",cta:"Watch More",isDefault:true },
];

async function initDatabase() {
  try {
    await sequelize.authenticate();
    logger.info("Database connected successfully");
    await sequelize.sync({ alter: true });
    logger.info("Database models synced");
    const count = await Template.count({ where: { isDefault: true } });
    if (count === 0) {
      await Template.bulkCreate(defaults);
      logger.info("Seeded " + defaults.length + " default templates");
    }
  } catch (e) {
    logger.error("Database initialization failed", { error: e.message });
    throw e;
  }
}

module.exports = { sequelize, Campaign, Template, AccountGroup, Credential, initDatabase };
