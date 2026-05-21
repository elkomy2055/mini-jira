import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";

function TeamModal({ team, onClose, onSaved }) {
  const [form, setForm] = useState({ name: team?.name || "", description: team?.description || "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (team) { await api.put(`/teams/${team.teamId}`, form); }
      else { await api.post("/teams", form); }
      toast.success(team ? "Team updated" : "Team created");
      onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{team ? "Edit Team" : "New Team"}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Team Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Frontend, Backend, QA" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTeams = async () => {
    try {
      const { data } = await api.get("/teams");
      setTeams(data);
      // Fetch members for each team
      const memberData = {};
      await Promise.all(data.map(async (t) => {
        try {
          const res = await api.get(`/teams/${t.teamId}/members`);
          memberData[t.teamId] = res.data;
        } catch { memberData[t.teamId] = []; }
      }));
      setMembers(memberData);
    } catch { toast.error("Failed to load teams"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleDelete = async (teamId) => {
    if (!window.confirm("Delete this team?")) return;
    try { await api.delete(`/teams/${teamId}`); toast.success("Deleted"); fetchTeams(); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Teams</div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Team</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        teams.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>◉</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>No teams yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {teams.map((t) => (
              <div key={t.teamId} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{t.description || "No description"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.teamId)}>Del</button>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                    Members ({(members[t.teamId] || []).length})
                  </div>
                  {(members[t.teamId] || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>No members assigned</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(members[t.teamId] || []).map((u) => (
                        <div key={u.userId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showCreate && <TeamModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchTeams(); }} />}
      {editing && <TeamModal team={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchTeams(); }} />}
    </div>
  );
}
