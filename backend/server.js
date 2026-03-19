require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const authMiddleware = require("./middleware/auth");
const { initDatabase } = require("./models/database");
const { setupWebSocket, getClientCount } = require("./websocket/wsServer");

const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/accounts");
const campaignRoutes = require("./routes/campaigns");
const analyticsRoutes = require("./routes/analytics");
const dbRoutes = require("./routes/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true, // Allow all origins — needed for custom domain
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization","x-fb-access-token","x-fb-business-id"],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/", rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Serve frontend static files in production
const path = require("path");
const frontendPath = path.join(__dirname, "../frontend/dist");
if (require("fs").existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => { if (req.path.startsWith("/api/")) logger.info(`${req.method} ${req.path} → ${res.statusCode} (${Date.now()-start}ms)`); });
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "BulkAds Pro API", version: "2.0.0", timestamp: new Date().toISOString(),
    features: { facebook_api: !!process.env.FB_SYSTEM_USER_TOKEN, database: true, websocket: true, analytics: true },
    ws_clients: getClientCount(),
  });
});

app.use("/api/db", dbRoutes);
app.use("/api/auth", authMiddleware, authRoutes);
app.use("/api/accounts", authMiddleware, accountRoutes);
app.use("/api/campaigns", authMiddleware, campaignRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

// SPA fallback — serve frontend for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found", path: req.path });
  const indexPath = path.join(__dirname, "../frontend/dist/index.html");
  if (require("fs").existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).json({ error: "Not found", path: req.path });
});
app.use((err, req, res, next) => {
  logger.error("Error", { error: err.message, path: req.path });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (30MB max)" });
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Server error" : err.message });
});

async function start() {
  try {
    await initDatabase();
    const server = http.createServer(app);
    setupWebSocket(server);
    server.listen(PORT, () => {
      logger.info("══════════════════════════════════════════");
      logger.info("  🚀 BulkAds Pro API — All Systems Go");
      logger.info("══════════════════════════════════════════");
      logger.info(`  📡 HTTP:      http://localhost:${PORT}`);
      logger.info(`  🔌 WebSocket: ws://localhost:${PORT}/ws`);
      logger.info(`  📋 Health:    http://localhost:${PORT}/api/health`);
      logger.info(`  🗄️  Database:  ${process.env.DATABASE_URL || "SQLite"}`);
      logger.info("══════════════════════════════════════════");
    });
  } catch (e) { logger.error("Start failed", { error: e.message }); process.exit(1); }
}

start();
module.exports = app;
