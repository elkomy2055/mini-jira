const express = require("express");
const router = express.Router();
const { authenticate, requireManager } = require("../middleware/auth");
const teamService = require("../services/teamService");
const userService = require("../services/userService");

// Teams
router.get("/", authenticate, async (req, res) => {
  const teams = await teamService.getAllTeams();
  res.json(teams);
});

router.post("/", authenticate, requireManager, async (req, res) => {
  const team = await teamService.createTeam(req.body);
  res.status(201).json(team);
});

router.put("/:teamId", authenticate, requireManager, async (req, res) => {
  const team = await teamService.updateTeam(req.params.teamId, req.body);
  res.json(team);
});

router.delete("/:teamId", authenticate, requireManager, async (req, res) => {
  await teamService.deleteTeam(req.params.teamId);
  res.json({ message: "Team deleted" });
});

router.get("/:teamId/members", authenticate, async (req, res) => {
  const users = await userService.getUsersByTeam(req.params.teamId);
  res.json(users);
});

module.exports = router;
