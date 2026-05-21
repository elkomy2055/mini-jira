import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import useAuthStore from "../context/authStore";
import TaskModal from "../components/tasks/TaskModal";
import CreateTaskModal from "../components/tasks/CreateTaskModal";

const PRIORITIES = ["", "Critical", "High", "Medium", "Low"];
const STATUSES = ["", "To Do", "In Progress", "In Review", "Done"];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });
  const [teams, setTeams] = useState([]);
  const [filterTeam, setFilterTeam] = useState("");
  const { isManager } = useAuthStore();

  const fetchTasks = useCallback(async () => {
    try {
      const params = filterTeam ? `?teamId=${filterTeam}` : "";
      const { data } = await api.get(`/tasks${params}`);
      setTasks(data);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, [filterTeam]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (isManager()) api.get("/teams").then(({ data }) => setTeams(data)).catch(() => {});
  }, [isManager]);

  const filtered = tasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const statusClass = { "To Do": "badge-todo", "In Progress": "badge-inprogress", "In Review": "badge-inreview", "Done": "badge-done" };
  const priorityClass = { Critical: "badge-critical", High: "badge-high", Medium: "badge-medium", Low: "badge-low" };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">All Tasks</div>
        <div style={{ display: "flex", gap: 10 }}>
          {isManager() && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <input className="input" placeholder="Search tasks..." value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} style={{ flex: 1, minWidth: 200 }} />
        <select className="select" style={{ width: "auto" }} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: "auto" }} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => <option key={p}>{p}</option>)}
        </select>
        {isManager() && teams.length > 0 && (
          <select className="select" style={{ width: "auto" }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
            <option value="">All Teams</option>
            {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No tasks found</div>
          <div style={{ fontSize: 13 }}>Try adjusting your filters or create a new task.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                {["Title", "Status", "Priority", "Assignee", "Team", "Deadline", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done";
                return (
                  <tr key={task.taskId} onClick={() => setSelectedTask(task)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", maxWidth: 300 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text)" }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{task.description}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }}><span className={`badge ${statusClass[task.status] || "badge-todo"}`}>{task.status}</span></td>
                    <td style={{ padding: "12px 16px" }}><span className={`badge ${priorityClass[task.priority] || "badge-medium"}`}>{task.priority}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{task.assigneeName || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{task.teamName || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}>
                      {task.deadline ? (isOverdue ? "⚠ " : "") + new Date(task.deadline).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdated={fetchTasks} />}
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchTasks(); }} />}
    </div>
  );
}
