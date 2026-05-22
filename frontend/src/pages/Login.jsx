import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../context/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(79,124,247,0.08) 0%, transparent 60%)"
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>
            ⬡ MINI-JIRA
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Team task management on AWS</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Sign in</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                className="input" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="input" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: "14px", background: "var(--bg)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-dim)" }}>Demo accounts</div>
            <div>Manager: abdalla@company.com / Pass@123</div>
            <div>Employee: mahmoud@company.com / Pass@123</div>
            <div>Employee: zyad@company.com / Pass@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
