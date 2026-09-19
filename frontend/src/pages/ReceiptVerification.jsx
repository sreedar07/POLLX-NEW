import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { FileCheck2, ShieldCheck, AlertCircle, ArrowLeft, Search, CheckCircle2, Lock, Shield } from "lucide-react";

export const ReceiptVerification = ({ navigate }) => {
  const [hashInput, setHashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = localStorage.getItem("verify_hash");
    if (prefill) {
      setHashInput(prefill);
      localStorage.removeItem("verify_hash");
      verifyReceipt(prefill);
    }
  }, []);

  const verifyReceipt = async (receiptToVerify) => {
    const target = receiptToVerify || hashInput.trim();
    if (!target) {
      setError("Please enter a valid cryptographic receipt hash.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await api.get(`/api/receipts/verify/${encodeURIComponent(target)}`);
      setResult(data);
    } catch (err) {
      setError(err.message || "Receipt not found. The ballot receipt is invalid, altered, or unrecorded.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyReceipt();
  };

  return (
    <div style={{ maxWidth: "720px", margin: "40px auto", padding: "0 16px" }}>
      {/* Header */}
      <button
        onClick={() => navigate("poll")}
        style={{
          background: "none",
          color: "var(--accent-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.85rem",
          marginBottom: "12px",
          cursor: "pointer"
        }}
      >
        <ArrowLeft size={14} /> Back to Live Election
      </button>

      <div className="glass-card" style={{ padding: "36px", marginBottom: "28px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
            boxShadow: "0 0 20px rgba(15, 118, 110, 0.16)"
          }}>
            <FileCheck2 size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Zero-Knowledge Ballot Verification</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "520px", margin: "6px auto 0" }}>
            Verify that your ballot was cryptographically committed and officially counted on the election ledger, without exposing your voter identity.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Enter Cryptographic Receipt Hash:
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              required
              placeholder="e.g. VOTE-addf7a0097b4e5dbcf99..."
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: "260px", fontFamily: "monospace", fontSize: "0.9rem" }}
            />
            <button
              type="submit"
              disabled={loading || !hashInput.trim()}
              className="btn-primary"
              style={{ padding: "12px 24px" }}
            >
              <Search size={16} />
              <span>{loading ? "Auditing..." : "Audit Ballot"}</span>
            </button>
          </div>
        </form>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px",
            background: "rgba(185, 28, 28, 0.08)",
            border: "1px solid rgba(185, 28, 28, 0.14)",
            borderRadius: "var(--radius-md)",
            color: "#b91c1c",
            fontSize: "0.85rem",
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Result Certificate */}
        {result && (
          <div style={{
            marginTop: "24px",
            padding: "24px",
            background: "rgba(21, 128, 61, 0.06)",
            border: "1px solid rgba(21, 128, 61, 0.14)",
            borderRadius: "var(--radius-lg)",
            animation: "fadeIn 0.3s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <CheckCircle2 size={24} color="#15803d" />
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#16a34a", fontWeight: 700, letterSpacing: "0.05em" }}>
                  Proof-of-Inclusion Certified
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
                  Ballot Confirmed on Election Ledger
                </h3>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", fontSize: "0.85rem", marginBottom: "18px" }}>
              <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Election Question</span>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>{result.poll_title}</div>
              </div>
              <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Choice Selected</span>
                <div style={{ fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>{result.option_selected}</div>
              </div>
              <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Certified Timestamp (UTC)</span>
                <div style={{ fontWeight: 600, marginTop: "2px" }}>
                  {new Date(result.timestamp).toUTCString()}
                </div>
              </div>
              <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Ledger Integrity Status</span>
                <div style={{ fontWeight: 700, color: "#0f766e", marginTop: "2px" }}>
                  {result.status}
                </div>
              </div>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(26, 54, 93, 0.07)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8rem",
              color: "#334155"
            }}>
              <Shield size={16} color="var(--accent-primary)" />
              <span>
                SHA-256 cryptographic verification validates that this vote was tallied precisely as cast without ballot stuffing or tampering.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Security Explanation */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Lock size={16} color="var(--accent-secondary)" /> How Cryptographic Verification Works
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.6" }}>
          When each ballot is cast, PulseVote computes an irreversible SHA-256 cryptographic hash chaining the election identifier, candidate choice, client hash, and timestamp. Voters receive this receipt code immediately upon voting. You can verify that your vote is registered in the database audit log at any time, while keeping your personal voting secret safe from public disclosure.
        </p>
      </div>
    </div>
  );
};
