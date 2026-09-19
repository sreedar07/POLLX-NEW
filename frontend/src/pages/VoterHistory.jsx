import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Calendar, CheckCircle2, Copy, Check, ArrowLeft, Award, Lock } from "lucide-react";

export const VoterHistory = ({ navigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedHash, setCopiedHash] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("login");
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await api.get("/api/votes/history");
        setVotes(data || []);
      } catch (err) {
        setError(err.message || "Failed to load voting history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated, navigate]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(""), 2500);
  };

  return (
    <div style={{ maxWidth: "840px", margin: "40px auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <button
            onClick={() => navigate("poll")}
            style={{
              background: "none",
              color: "var(--accent-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              marginBottom: "8px",
              cursor: "pointer"
            }}
          >
            <ArrowLeft size={14} /> Back to Live Election
          </button>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>My Ballot History & Receipts</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
            Cryptographically signed record of all ballots cast by <strong>{user?.full_name || user?.username}</strong>.
          </p>
        </div>

        {user?.badges && user.badges.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {user.badges.map((b, idx) => (
              <span key={idx} className="badge-chip">
                <Award size={13} color="var(--accent-amber)" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading your certified voting records...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: "30px", textAlign: "center", color: "#b91c1c" }}>
          {error}
        </div>
      ) : votes.length === 0 ? (
        <div className="glass-card" style={{ padding: "50px 20px", textAlign: "center" }}>
          <ShieldCheck size={48} color="var(--accent-primary)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>No Ballots Cast Yet</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "420px", margin: "8px auto 24px" }}>
            You haven't participated in any elections yet. Cast your first ballot to earn the <strong>Active Citizen</strong> badge and receive your cryptographic receipt.
          </p>
          <button className="btn-primary" onClick={() => navigate("poll")}>
            View Active Elections →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {votes.map((v, i) => (
            <div key={v.id || i} className="glass-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-secondary)", fontWeight: 700, letterSpacing: "0.05em" }}>
                    Official Ballot
                  </span>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "2px" }}>
                    {v.poll_title}
                  </h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)", fontSize: "0.8rem" }}>
                  <Calendar size={14} />
                  <span>{new Date(v.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Choice Selected */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: "rgba(21, 128, 61, 0.07)",
                border: "1px solid rgba(21, 128, 61, 0.12)",
                borderRadius: "var(--radius-md)",
                marginBottom: "16px"
              }}>
                <CheckCircle2 size={18} color="#15803d" />
                <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                  Choice Selected: <strong>{v.option_text}</strong>
                </span>
              </div>

              {/* Cryptographic Receipt */}
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Lock size={12} /> Cryptographic Proof-of-Inclusion Hash (Receipt)
                </label>
                <div className="receipt-box">
                  <span style={{ marginRight: "10px" }}>{v.receipt_hash}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleCopy(v.receipt_hash)}
                      title="Copy Receipt Hash"
                      style={{
                        background: "rgba(226, 232, 240, 0.95)",
                        color: "var(--text-main)",
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {copiedHash === v.receipt_hash ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                      <span>{copiedHash === v.receipt_hash ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
