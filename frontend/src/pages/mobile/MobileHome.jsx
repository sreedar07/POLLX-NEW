import React, { useState } from "react";
import {
  ArrowRight,
  Share2,
  Tag,
  Lock,
  LogIn,
  Radio,
  ShieldCheck,
  Gamepad2,
  QrCode,
  Vote
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ShareModal } from "../../components/ShareModal";
import heroBallotImage from "../../assets/hero-ballot.png";

export const MobileHome = ({ navigate }) => {
  const { isAdmin } = useAuth();
  const [adminNoticeOpen, setAdminNoticeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleCreatePollClick = () => {
    if (isAdmin) {
      navigate("create");
    } else {
      setAdminNoticeOpen(true);
    }
  };

  return (
    <div
      style={{
        padding: "16px 16px 88px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* ===================== HERO CARD ===================== */}
      <div
        className="glass-card"
        style={{
          padding: "24px 20px",
          background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Live Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "999px",
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            color: "#93c5fd",
            fontSize: "0.75rem",
            fontWeight: 700,
            marginBottom: "16px",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span>Live Voting Engine</span>
        </div>

        {/* Mobile Headline */}
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "12px",
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          Your Voice<br />
          <span className="text-gradient-shining">
            Shapes Tomorrow
          </span>
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            marginBottom: "20px",
          }}
        >
          Cast tamper-proof ballots, view real-time WebSocket tallying, and earn cryptographic receipts.
        </p>

        {/* Action Buttons (Stacked for Mobile Thumb Accessibility) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="btn-primary"
            onClick={() => navigate("poll")}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: "1rem",
              fontWeight: 700,
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            <Vote size={18} />
            <span>Vote in Live Poll</span>
            <ArrowRight size={16} />
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              className="btn-secondary"
              onClick={() => setShareOpen(true)}
              style={{
                padding: "11px",
                fontSize: "0.85rem",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Share2 size={15} />
              <span>Share Poll</span>
            </button>

            <button
              className="btn-secondary"
              onClick={handleCreatePollClick}
              style={{
                padding: "11px",
                fontSize: "0.85rem",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Tag size={15} />
              <span>New Poll</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== COMPACT 3D BALLOT SHOWCASE ===================== */}
      <div
        className="glass-card"
        style={{
          padding: "18px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={heroBallotImage}
            alt="Ballot Box"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "80px",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 16px rgba(56, 189, 248, 0.4))",
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <ShieldCheck size={16} color="#4ade80" />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
              Zero-Knowledge Audit
            </h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
            Every ballot yields a certified SHA-256 receipt for independent verification.
          </p>
        </div>
      </div>

      {/* ===================== QUICK FEATURE CARDS (MOBILE TOUCH FRIENDLY) ===================== */}
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px", color: "var(--text-main)" }}>
          Mobile Experience Features
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Feature 1 */}
          <div
            className="glass-card"
            onClick={() => navigate("poll")}
            style={{
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              <Radio size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 2px" }}>
                Zero-Latency Live Tally
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                Instant WebSocket push updates as votes are submitted globally.
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-dim)" />
          </div>

          {/* Feature 2 */}
          <div
            className="glass-card"
            onClick={() => navigate("poll")}
            style={{
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Gamepad2 size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 2px" }}>
                Chill Out Snake Lounge
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                Play retro Snake with mobile thumb controls while awaiting live tally results.
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-dim)" />
          </div>

          {/* Feature 3 */}
          <div
            className="glass-card"
            onClick={() => setShareOpen(true)}
            style={{
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(236, 72, 153, 0.15)",
                color: "#ec4899",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(236, 72, 153, 0.3)",
              }}
            >
              <QrCode size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 2px" }}>
                Scan to Vote Anywhere
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                Generate QR codes or share directly on WhatsApp and social feeds.
              </p>
            </div>
            <ArrowRight size={16} color="var(--text-dim)" />
          </div>
        </div>
      </div>

      {/* Admin Notice Modal */}
      {adminNoticeOpen && (
        <div className="modal-overlay" onClick={() => setAdminNoticeOpen(false)}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "380px",
              padding: "26px 20px",
              textAlign: "center",
              background: "#0b1328",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#38bdf8",
              }}
            >
              <Lock size={26} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "8px" }}>
              Administrator Only
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
              Poll creation is restricted to verified administrators. Voters can explore and cast ballots.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setAdminNoticeOpen(false);
                  navigate("login");
                }}
                style={{ width: "100%", padding: "12px", fontSize: "0.92rem" }}
              >
                <LogIn size={16} />
                <span>Sign in as Admin</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => setAdminNoticeOpen(false)}
                style={{ width: "100%", padding: "10px", fontSize: "0.88rem" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        poll={{ id: "active", title: "PollX Live Polling Platform" }}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
};

export default MobileHome;
