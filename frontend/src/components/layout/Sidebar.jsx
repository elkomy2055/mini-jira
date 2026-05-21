import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../context/authStore";

const icons = {
  board: "⬡",
  tasks: "✦",
  projects: "◈",
  teams: "◉",
  users: "◎",
  dashboard: "▦",
};

export default function Sidebar() {
  const { user, logout, isManager } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">⬡ MINI-JIRA</div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          {icons.board} Board
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          {icons.tasks} Tasks
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          {icons.projects} Projects
        </NavLink>

        {isManager() && (
          <>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <NavLink to="/teams" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              {icons.teams} Teams
            </NavLink>
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              {icons.users} Users
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            <span className={`badge badge-${user?.role === "manager" ? "inprogress" : "todo"}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: "100%", justifyContent: "center" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
