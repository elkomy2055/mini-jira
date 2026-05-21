import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";

function CreateUserModal({ teams, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "Pass@123", role: "employee", teamId: "", teamName: "" });
  const [loading, setLoading] = useState(false);

  const handleTeamChange = (e) => {
    const team = teams.find((t) => t.teamId === e.target.value);
    setForm((f) => ({ ...f, teamId: e.target.value, teamName: team?.name || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      toast.success(`User ${form.name} created!`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add User</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sara Ahmed" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="sara@company.com" />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input className="input" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Role</label>
              <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="form-group">
              <label>Team</label>
              <select className="select" value={form.teamId} onChange={handleTeamChange}>
                <option value="">No team</option>
                {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Creating..." : "Create User"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([api.get("/auth/users"), api.get("/teams")]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterTeam && u.teamId !== filterTeam) return false;
    return true;
  });

  const roleClass = { manager: "badge-inprogress", employee: "badge-todo", admin: "badge-inreview" };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Users</div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add User</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <select className="select" style={{ width: "auto" }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select className="select" style={{ width: "auto" }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
        </select>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                {["User", "Email", "Role", "Team", "Joined"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.userId} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}><span className={`badge ${roleClass[u.role] || "badge-todo"}`}>{u.role}</span></td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{u.teamName || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-dim)" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateUserModal teams={teams} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchData(); }} />}
    </div>
  );
}
