const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const { authenticate, requireManager } = require("../middleware/auth");
const taskService = require("../services/taskService");
const commentService = require("../services/commentService");
const s3Service = require("../services/s3Service");
const { BUCKETS, ROLES } = require("../config/constants");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /tasks - list tasks (filtered by team for employees)
router.get("/", authenticate, async (req, res) => {
  const { teamId: filterTeam } = req.query;

  let tasks;
  if (req.user.role === ROLES.EMPLOYEE) {
    // Server-side team isolation
    tasks = await taskService.getTasksByTeam(req.user.teamId);
  } else {
    tasks = filterTeam
      ? await taskService.getTasksByTeam(filterTeam)
      : await taskService.getAllTasks();
  }

  // Add presigned URLs for images
  const enriched = await Promise.all(tasks.map(async (t) => {
    if (t.imageKey) {
      try {
        t.imageUrl = await s3Service.getPresignedUrl(BUCKETS.ORIGINALS, t.imageKey);
      } catch {}
    }
    if (t.resizedImageKey) {
      try {
        t.resizedImageUrl = await s3Service.getPresignedUrl(BUCKETS.RESIZED, t.resizedImageKey);
      } catch {}
    }
    return t;
  }));

  res.json(enriched);
});

// GET /tasks/:taskId
router.get("/:taskId", authenticate, async (req, res) => {
  const task = await taskService.getTask(req.params.taskId, req.user);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.imageKey) {
    try { task.imageUrl = await s3Service.getPresignedUrl(BUCKETS.ORIGINALS, task.imageKey); } catch {}
  }
  if (task.resizedImageKey) {
    try { task.resizedImageUrl = await s3Service.getPresignedUrl(BUCKETS.RESIZED, task.resizedImageKey); } catch {}
  }

  res.json(task);
});

// POST /tasks - manager only
router.post("/", authenticate, requireManager, upload.single("image"), async (req, res) => {
  const taskData = { ...req.body };

  if (req.file) {
    const ext = req.file.originalname.split(".").pop();
    const key = `tasks/${uuidv4()}.${ext}`;
    await s3Service.uploadObject(BUCKETS.ORIGINALS, key, req.file.buffer, req.file.mimetype);
    taskData.imageKey = key;
  }

  const task = await taskService.createTask(taskData, req.user.sub);
  res.status(201).json(task);
});

// PUT /tasks/:taskId
router.put("/:taskId", authenticate, upload.single("image"), async (req, res) => {
  const updates = { ...req.body };

  if (req.file) {
    const ext = req.file.originalname.split(".").pop();
    const key = `tasks/${uuidv4()}.${ext}`;
    await s3Service.uploadObject(BUCKETS.ORIGINALS, key, req.file.buffer, req.file.mimetype);
    updates.imageKey = key;
  }

  const task = await taskService.updateTask(req.params.taskId, updates, req.user);
  if (!task) return res.status(404).json({ error: "Task not found or access denied" });
  res.json(task);
});

// DELETE /tasks/:taskId - manager only
router.delete("/:taskId", authenticate, requireManager, async (req, res) => {
  const deleted = await taskService.deleteTask(req.params.taskId, req.user);
  if (!deleted) return res.status(404).json({ error: "Task not found" });
  res.json({ message: "Task deleted" });
});

// GET /tasks/:taskId/comments
router.get("/:taskId/comments", authenticate, async (req, res) => {
  const task = await taskService.getTask(req.params.taskId, req.user);
  if (!task) return res.status(404).json({ error: "Task not found or access denied" });

  const comments = await commentService.getCommentsByTask(req.params.taskId);
  res.json(comments);
});

// POST /tasks/:taskId/comments
router.post("/:taskId/comments", authenticate, async (req, res) => {
  const task = await taskService.getTask(req.params.taskId, req.user);
  if (!task) return res.status(404).json({ error: "Task not found or access denied" });

  const comment = await commentService.createComment(req.params.taskId, req.body.content, req.user);
  res.status(201).json(comment);
});

// DELETE /tasks/:taskId/comments/:commentId
router.delete("/:taskId/comments/:commentId", authenticate, requireManager, async (req, res) => {
  await commentService.deleteComment(req.params.commentId, req.params.taskId);
  res.json({ message: "Comment deleted" });
});

// GET /tasks/:taskId/audit
router.get("/:taskId/audit", authenticate, async (req, res) => {
  const task = await taskService.getTask(req.params.taskId, req.user);
  if (!task) return res.status(404).json({ error: "Task not found or access denied" });

  const logs = await taskService.getAuditLogs(req.params.taskId);
  res.json(logs);
});

module.exports = router;
