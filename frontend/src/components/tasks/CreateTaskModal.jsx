import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../utils/api";

export default function CreateTaskModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", deadline: "", assigneeId: "", assigneeName: "", teamId: "", teamName: "", projectId: "" });
  const [image, setImage] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/teams").then(({ data }) => setTeams(Array.isArray(data) ? data : [])).catch(() => {});
    api.get("/auth/users").then(({ data }) => setUsers(Array.isArray(data) ? data : [])).catch(() => {});
    api.get("/projects").then(({ data }) => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const teamUsers = form.teamId ? (Array.isArray(users) ? users.filter((u) => u.teamId === form.teamId) : []) : (Array.isArray(users) ? users : []);

  const handleTeamChange = (e) => {
    const team = teams.find((t) => t.teamId === e.target.value);
    setForm((f) => ({ ...f, teamId: e.target.value, teamName: team?.name || "", assigneeId: "", assigneeName: "" }));
  };

  const handleAssigneeChange = (e) => {
    const user = users.find((u) => u.userId === e.target.value);
    setForm((f) => ({ ...f, assigneeId: e.target.value, assigneeName: user?.name || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.teamId || !form.assigneeId) {
      toast.error("Title, team, and assignee are required");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      if (image) formData.append("image", image);

      // Also add assignee email for SNS notification
      const assigneeUser = users.find((u) => u.userId === form.assigneeId);
      if (assigneeUser?.email) formData.append("assigneeEmail", assigneeUser.email);

      await api.post("/tasks", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Task created!");
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Create New Task</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Priority</label>
              <select className="select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input className="input" type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label>Team *</label>
            <select className="select" required value={form.teamId} onChange={handleTeamChange}>
              <option value="">Select team...</option>
              {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Assignee *</label>
            <select className="select" required value={form.assigneeId} onChange={handleAssigneeChange}>
              <option value="">Select assignee...</option>
              {teamUsers.filter((u) => u.role !== "manager").map((u) => <option key={u.userId} value={u.userId}>{u.name} ({u.email})</option>)}
            </select>
          </div>

          {projects.length > 0 && (
            <div className="form-group">
              <label>Project (optional)</label>
              <select className="select" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.projectId} value={p.projectId}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Image attachment (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])}
              style={{ display: "block", fontSize: 13, color: "var(--text-muted)" }} />
            {image && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>✓ {image.name}</div>}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
