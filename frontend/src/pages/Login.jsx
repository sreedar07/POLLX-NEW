import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Login = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("admin");
      } else {
        navigate("poll");
      }
    } catch (err) {
      if (err.message && err.message.includes("not verified")) {
        setUnverifiedEmail(email);
      }
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "460px", margin: "50px auto", padding: "0 16px" }}>
      <div className="glass-card" style={{ padding: "36px" }}>
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 0 20px rgba(26, 54, 93, 0.16)"
          }}>
            <Shield size={26} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Sign In to PulseVote</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "6px" }}>
            Access verified voting, ballot history, or administrative results.
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "12px",
            background: "rgba(185, 28, 28, 0.08)",
            border: "1px solid rgba(185, 28, 28, 0.14)",
            borderRadius: "var(--radius-md)",
            color: "#b91c1c",
            fontSize: "0.85rem",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={() => navigate("register")}
                style={{ background: "none", color: "#0f766e", textDecoration: "underline", fontSize: "0.8rem", textAlign: "left", cursor: "pointer", marginTop: "4px" }}
              >
                Go to verification screen →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: "18px" }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              autoComplete="off"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px", fontWeight: 600 }}
          >
            {loading ? "Authenticating..." : "Sign In to Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          New voter without an account?{" "}
          <span
            onClick={() => navigate("register")}
            style={{ color: "var(--accent-secondary)", cursor: "pointer", fontWeight: 600 }}
          >
            Register Here
          </span>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
          <span
            onClick={() => navigate("poll")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--accent-secondary)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Live Poll</span>
          </span>
        </div>
      </div>
    </div>
  );
};
