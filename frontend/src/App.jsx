import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import useAuthStore from "./context/authStore";
import Sidebar from "./components/layout/Sidebar";
import Login from "./pages/Login";
import Board from "./pages/Board";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Teams from "./pages/Teams";
import Users from "./pages/Users";

function ProtectedRoute({ children, managerOnly }) {
  const { user, isManager } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && !isManager()) return <Navigate to="/" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-card)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "var(--success)", secondary: "var(--bg)" } },
          error: { iconTheme: { primary: "var(--danger)", secondary: "var(--bg)" } },
        }}
      />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout><Board /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute managerOnly><Layout><Teams /></Layout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute managerOnly><Layout><Users /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
