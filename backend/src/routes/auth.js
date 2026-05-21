const express = require("express");
const router = express.Router();
const { authenticate, requireManager } = require("../middleware/auth");
const userService = require("../services/userService");

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const tokens = await userService.login(email, password);
  res.json(tokens);
});

// POST /auth/register (manager/admin only in production)
router.post("/register", authenticate, requireManager, async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json(user);
});

// GET /auth/users
router.get("/users", authenticate, requireManager, async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
});

// GET /auth/me - returns current user profile from DynamoDB
router.get("/me", authenticate, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
