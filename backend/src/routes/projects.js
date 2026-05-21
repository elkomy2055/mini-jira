const express = require("express");
const router = express.Router();
const { authenticate, requireManager } = require("../middleware/auth");
const projectService = require("../services/projectService");

router.get("/", authenticate, async (req, res) => {
  const projects = await projectService.getAllProjects();
  res.json(projects);
});

router.get("/:projectId", authenticate, async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.post("/", authenticate, requireManager, async (req, res) => {
  const project = await projectService.createProject(req.body, req.user.sub);
  res.status(201).json(project);
});

router.put("/:projectId", authenticate, requireManager, async (req, res) => {
  const project = await projectService.updateProject(req.params.projectId, req.body);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.delete("/:projectId", authenticate, requireManager, async (req, res) => {
  await projectService.deleteProject(req.params.projectId);
  res.json({ message: "Project deleted" });
});

module.exports = router;
