require("dotenv").config();
const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const authMiddleware = require("./middleware/auth");
const { initDatabase, closeDatabase } = require("./models/database");
const { setupWebSocket, getClientCount } = require("./websocket/wsServer");

const authRoutes = require("./routes/auth");
const accountRoutes = require("./routes/accounts");
const campaignRoutes = require("./routes/campaigns");
const analyticsRoutes = require("./routes/analytics");
const dbRoutes = require("./routes/db");

const app = express();
const PORT = process.env.PORT || 5001;

/* ══════════════════════════════════════
   SECURITY MIDDLEWARE
   ══════════════════════════════════════ */

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5001")
  .split(",").map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== "production") return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-fb-access-token", "x-fb-business-id"],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Try again in a few minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many auth requests. Try again later." },
});

app.use("/api/", generalLimiter);

/* ══════════════════════════════════════
   REQUEST LOGGING
   ══════════════════════════════════════ */
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    if (!req.path.startsWith("/api/health")) {
      logger.debug(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

/* ══════════════════════════════════════
   SERVE FRONTEND (production)
   ══════════════════════════════════════ */
const frontendPath = path.join(__dirname, "../frontend/dist");
const indexPath = path.join(frontendPath, "index.html");
const frontendExists = fs.existsSync(frontendPath);

if (frontendExists) {
  app.use(express.static(frontendPath));
  logger.info(`Serving frontend from ${frontendPath}`);
}

/* ══════════════════════════════════════
   HEALTH CHECK (no auth)
   ══════════════════════════════════════ */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "3.0.0", uptime: Math.floor(process.uptime()) });
});

/* ══════════════════════════════════════
   ROUTES
   ══════════════════════════════════════ */
app.use("/api/auth", authLimiter, authMiddleware, authRoutes);
app.use("/api/db", authMiddleware, dbRoutes);
app.use("/api/accounts", authMiddleware, accountRoutes);
app.use("/api/campaigns", authMiddleware, campaignRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

/* ══════════════════════════════════════
   SPA FALLBACK
   ══════════════════════════════════════ */
if (frontendExists) {
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, error: "API endpoint not found" });
    }
    res.sendFile(indexPath);
  });
}

/* ══════════════════════════════════════
   ERROR HANDLING
   ══════════════════════════════════════ */
app.use((err, req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, error: "File too large. Maximum 100MB per file." });
  }
  if (err.message && err.message.includes("File type")) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, error: "Origin not allowed" });
  }

  logger.error("Unhandled error", { error: err.message, path: req.path, stack: err.stack });
  res.status(500).json({ success: false, error: "Internal server error" });
});

/* ══════════════════════════════════════
   START SERVER
   ══════════════════════════════════════ */
let server;

async function start() {
  try {
    await initDatabase();
    server = http.createServer(app);
    setupWebSocket(server);
    server.listen(PORT, () => {
      logger.info(`BulkAds Pro v3.0 running on port ${PORT}`);
      logger.info(`  WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (e) {
    logger.error("Failed to start server", { error: e.message });
    process.exit(1);
  }
}

/* ══════════════════════════════════════
   GRACEFUL SHUTDOWN
   ══════════════════════════════════════ */
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  if (server) server.close();
  await closeDatabase();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: String(reason) });
});

start();

module.exports = app;
