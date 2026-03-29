const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/database");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.SESSION_SECRET || "bulkads-pro-secret-change-me";
const JWT_EXPIRY = "7d";

/**
 * POST /api/user/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    logger.error("Signup failed", { error: e.message });
    res.status(500).json({ success: false, error: "Signup failed. Please try again." });
  }
});

/**
 * POST /api/user/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    logger.error("Login failed", { error: e.message });
    res.status(500).json({ success: false, error: "Login failed. Please try again." });
  }
});

/**
 * GET /api/user/me — Get current user from JWT
 */
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: { id: decoded.userId, name: decoded.name, email: decoded.email } });
  } catch (e) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
});

module.exports = router;
