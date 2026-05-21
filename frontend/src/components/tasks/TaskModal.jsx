import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../utils/api";
import useAuthStore from "../../context/authStore";

const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function TaskModal({ task: initialTask, onClose, onUpdated }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const { user, isManager } = useAuthStore();

  useEffect(() => {
    fetchComments();
    fetchAudit();
  }, [task.taskId]);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/tasks/${task.taskId}/comments`);
      setComments(data);
    } catch {}
  };

  const fetchAudit = async () => {
    try {
      const { data } = await api.get(`/tasks/${task.taskId}/audit`);
      setAuditLogs(data);
    } catch {}
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await api.put(`/tasks/${task.taskId}`, { status: newStatus });
      setTask((t) => ({ ...t, status: newStatus }));
      toast.success(`Status updated to "${newStatus}"`);
      fetchAudit();
      onUpdated?.();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editMode) {
      setEditData({ title: task.title, description: task.description, priority: task.priority, deadline: task.deadline });
      setEditMode(true);
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/tasks/${task.taskId}`, editData);
      setTask((t) => ({ ...t, ...editData }));
      setEditMode(false);
      toast.success("Task updated");
      onUpdated?.();
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${task.taskId}`);
      toast.success("Task deleted");
      onClose();
      onUpdated?.();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/tasks/${task.taskId}/comments`, { content: newComment });
      setNewComment("");
      fetchComments();
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const priorityClass = { Critical: "badge-critical", High: "badge-high", Medium: "badge-medium", Low: "badge-low" };
  const statusClass = { "To Do": "badge-todo", "In Progress": "badge-inprogress", "In Review": "badge-inreview", "Done": "badge-done" };
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done";
  const canEdit = isManager() || task.assigneeId === user?.sub;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            {editMode ? (
              <input className="input" value={editData.title} onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))} style={{ fontSize: 18, fontWeight: 700 }} />
            ) : (
              <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{task.title}</h2>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span className={`badge ${statusClass[task.status] || "badge-todo"}`}>{task.status}</span>
              <span className={`badge ${priorityClass[task.priority] || "badge-medium"}`}>{task.priority}</span>
              {task.teamName && <span className="badge badge-todo">{task.teamName}</span>}
              {isOverdue && <span className="badge badge-critical">⚠ Overdue</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canEdit && (
              <button className="btn btn-ghost btn-sm" onClick={handleEdit} disabled={saving}>
                {editMode ? (saving ? "Saving..." : "Save") : "Edit"}
              </button>
            )}
            {editMode && <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>}
            {isManager() && !editMode && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
          {["details", "comments", "history"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === tab ? "var(--accent)" : "var(--text-muted)", transition: "all 0.15s" }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "comments" && comments.length > 0 && <span style={{ marginLeft: 4, background: "var(--bg-hover)", padding: "1px 5px", borderRadius: 10, fontSize: 10 }}>{comments.length}</span>}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 24 }}>
            <div>
              <div className="form-group">
                <label>Description</label>
                {editMode ? (
                  <textarea className="textarea" value={editData.description} onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))} />
                ) : (
                  <div style={{ fontSize: 14, color: task.description ? "var(--text)" : "var(--text-dim)", background: "var(--bg)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", minHeight: 80 }}>
                    {task.description || "No description provided."}
                  </div>
                )}
              </div>

              {(task.imageUrl || task.resizedImageUrl) && (
                <div className="form-group">
                  <label>Attachment</label>
                  <img src={task.resizedImageUrl || task.imageUrl} alt="Task" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
                  <a href={task.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", display: "block", marginTop: 4 }}>View original</a>
                </div>
              )}

              {/* Status change for employee assignee */}
              {!isManager() && task.assigneeId === user?.sub && (
                <div className="form-group">
                  <label>Update Status</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUSES.map((s) => (
                      <button key={s} className={`btn btn-sm ${task.status === s ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => handleStatusChange(s)} disabled={saving || task.status === s}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label>Assignee</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
                    {(task.assigneeName || "?")[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.assigneeName || "Unassigned"}</div>
                </div>
              </div>

              <div>
                <label>Team</label>
                <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>{task.teamName || "—"}</div>
              </div>

              <div>
                <label>Deadline</label>
                {editMode ? (
                  <input className="input" type="date" value={editData.deadline?.split("T")[0] || ""} onChange={(e) => setEditData((d) => ({ ...d, deadline: e.target.value }))} />
                ) : (
                  <div style={{ fontSize: 13, color: isOverdue ? "var(--danger)" : "var(--text)", marginTop: 4 }}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                  </div>
                )}
              </div>

              <div>
                <label>Priority</label>
                {editMode ? (
                  <select className="select" value={editData.priority} onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value }))}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <div style={{ marginTop: 4 }}><span className={`badge ${priorityClass[task.priority]}`}>{task.priority}</span></div>
                )}
              </div>

              {isManager() && (
                <div>
                  <label>Change Status</label>
                  <select className="select" value={task.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={saving} style={{ marginTop: 4 }}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label>Created</label>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(task.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, maxHeight: 300, overflowY: "auto" }}>
              {comments.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>No comments yet</div>
              )}
              {comments.map((c) => (
                <div key={c.commentId} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
                      {(c.authorName || "?")[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.authorName}</span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{c.content}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} style={{ display: "flex", gap: 8 }}>
              <input className="input" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} />
              <button className="btn btn-primary" type="submit" disabled={!newComment.trim()}>Post</button>
            </form>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {auditLogs.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 24 }}>No history yet</div>
            )}
            {auditLogs.map((log) => (
              <div key={log.logId} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{log.changedByName}</strong> moved task
                    {log.oldStatus && <> from <span className={`badge badge-${(log.oldStatus || "").replace(/ /g, "").toLowerCase()}`}>{log.oldStatus}</span></>}
                    {" "}to <span className={`badge badge-${(log.newStatus || "").replace(/ /g, "").toLowerCase()}`}>{log.newStatus}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{new Date(log.changedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
