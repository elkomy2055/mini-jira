import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import useAuthStore from "../context/authStore";

function ProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({ name: project?.name || "", description: project?.description || "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) { await api.put(`/projects/${project.projectId}`, form); toast.success("Project updated"); }
      else { await api.post("/projects", form); toast.success("Project created"); }
      onSaved();
    } catch { toast.error("Failed to save project"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{project ? "Edit Project" : "New Project"}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Q3 Revamp" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Project description..." />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const { isManager } = useAuthStore();

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (projectId) => {
    if (!window.confirm("Delete this project?")) return;
    try { await api.delete(`/projects/${projectId}`); toast.success("Deleted"); fetchProjects(); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Projects</div>
        {isManager() && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        projects.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>◈</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>No projects yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {projects.map((p) => (
              <div key={p.projectId} className="card" style={{ cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{p.name}</div>
                  {isManager() && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingProject(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.projectId)}>Del</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{p.description || "No description"}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Created {new Date(p.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )
      )}

      {showCreate && <ProjectModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchProjects(); }} />}
      {editingProject && <ProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSaved={() => { setEditingProject(null); fetchProjects(); }} />}
    </div>
  );
}
