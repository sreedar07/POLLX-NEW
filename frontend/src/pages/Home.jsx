import React, { useState } from "react";
import { 
  ArrowRight, 
  BarChart3, 
  Share2, 
  Plus, 
  Check, 
  ShieldAlert, 
  Tag, 
  Lock, 
  LogIn, 
  Sparkles,
  Layers,
  Vote,
  Users,
  Activity,
  ThumbsUp,
  MessageSquare,
  Smile,
  BarChart2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ShareModal } from "../components/ShareModal";
import heroBallotImage from "../assets/hero-ballot.png";

export const Home = ({ navigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();
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
    <div style={{ 
      maxWidth: "1280px", 
      margin: "0 auto", 
      padding: "50px 24px 80px",
      minHeight: "calc(100vh - 120px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      {/* ===================== HERO SECTION ===================== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "48px",
        alignItems: "center",
        marginBottom: "60px",
      }}>
        {/* Left Column: Headline, Pill & CTAs */}
        <div>
          {/* Glowing Pill Tag matching image */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 18px",
            borderRadius: "999px",
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            boxShadow: "0 0 16px rgba(59, 130, 246, 0.2)",
            color: "#93c5fd",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            marginBottom: "28px",
          }}>
            <span style={{ color: "#38bdf8" }}>⚡</span>
            <span>Live &bull; Instant &bull; Interactive</span>
          </div>

          {/* Headline matching image */}
          <h1 style={{
            fontSize: "clamp(2.8rem, 5.5vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.08,
            marginBottom: "20px",
            letterSpacing: "-0.035em",
            color: "#ffffff",
          }}>
            Your Voice<br />
            <span className="text-gradient-shining">
              Shapes Tomorrow
            </span>
          </h1>

          {/* Subtitle matching image */}
          <p style={{
            fontSize: "1.2rem",
            color: "#94a3b8",
            maxWidth: "500px",
            lineHeight: 1.55,
            marginBottom: "36px",
            fontWeight: 400,
          }}>
            Create polls, gather opinions and make better decisions &mdash; together.
          </p>

          {/* CTA Buttons matching image */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Explore Polls -> */}
            <button
              className="btn-primary"
              onClick={() => navigate("poll")}
              style={{
                padding: "14px 30px",
                fontSize: "1.05rem",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                boxShadow: "0 6px 25px rgba(37, 99, 235, 0.45)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "none",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span>Explore Polls</span>
              <ArrowRight size={18} />
            </button>

            {/* Create a Poll + (Admin Gated) */}
            <button
              onClick={handleCreatePollClick}
              style={{
                padding: "14px 28px",
                fontSize: "1.05rem",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(12px)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
              }}
            >
              <span>Create a Poll</span>
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Right Column: Ultra-Attractive 3D Glowing Glass Ballot Box */}
        <div style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "440px",
        }}>
          {/* Multi-layered Ambient Glows */}
          <div style={{
            position: "absolute",
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(147, 51, 234, 0.25) 50%, transparent 70%)",
            filter: "blur(50px)",
            zIndex: 0,
            pointerEvents: "none",
          }} />

          {/* 3D Glowing Glass Ballot Box Image Container with Float Animation */}
          <div 
            className="floating-hero-card"
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              maxWidth: "420px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img 
              src={heroBallotImage} 
              alt="3D Glowing Ballot Box with Live Reactions" 
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "440px",
                objectFit: "contain",
                borderRadius: "32px",
                filter: "drop-shadow(0 20px 45px rgba(56, 189, 248, 0.5)) drop-shadow(0 0 35px rgba(168, 85, 247, 0.4))",
                transition: "transform 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* ===================== BOTTOM 3 FEATURE CARDS ===================== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
      }}>
        {/* Card 1: Create a Poll */}
        <div 
          className="feature-card-pollx"
          onClick={handleCreatePollClick}
          style={{ cursor: "pointer" }}
        >
          <div>
            {/* Blue Icon Rounded Container */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.5)",
              marginBottom: "22px",
            }}>
              <Tag size={26} color="#ffffff" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                Create a Poll
              </h3>
              {!isAdmin && (
                <span style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontWeight: 600,
                }}>
                  Admin
                </span>
              )}
            </div>

            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Ask questions, set options, and get started in seconds.
            </p>
          </div>

          <div className="arrow-circle-btn">
            <ArrowRight size={18} />
          </div>
        </div>

        {/* Card 2: Share Anywhere */}
        <div 
          className="feature-card-pollx"
          onClick={() => setShareOpen(true)}
          style={{ cursor: "pointer" }}
        >
          <div>
            {/* Cyan/Blue Icon Rounded Container */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(14, 165, 233, 0.5)",
              marginBottom: "22px",
            }}>
              <Share2 size={26} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>
              Share Anywhere
            </h3>

            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Send your poll link via URL, QR code or social media.
            </p>
          </div>

          <div className="arrow-circle-btn">
            <ArrowRight size={18} />
          </div>
        </div>

        {/* Card 3: See Results Live */}
        <div 
          className="feature-card-pollx"
          onClick={() => navigate("poll")}
          style={{ cursor: "pointer" }}
        >
          <div>
            {/* Purple Icon Rounded Container */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(147, 51, 234, 0.5)",
              marginBottom: "22px",
            }}>
              <BarChart3 size={26} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "8px", color: "#ffffff" }}>
              See Results Live
            </h3>

            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
              Watch votes come in in real-time, no refresh needed.
            </p>
          </div>

          <div className="arrow-circle-btn">
            <ArrowRight size={18} />
          </div>
        </div>
      </div>

      {/* ===================== ADMIN ONLY RESTRICTION MODAL ===================== */}
      {adminNoticeOpen && (
        <div className="modal-overlay" onClick={() => setAdminNoticeOpen(false)}>
          <div 
            className="glass-card" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "36px",
              textAlign: "center",
              border: "1.5px solid rgba(59, 130, 246, 0.4)",
              background: "#0c1326",
            }}
          >
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "#38bdf8",
            }}>
              <Lock size={32} />
            </div>

            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "12px", color: "#ffffff" }}>
              Administrator Access Only
            </h3>

            <p style={{ color: "var(--text-muted)", fontSize: "0.98rem", lineHeight: 1.6, marginBottom: "24px" }}>
              Only verified administrators can create, edit, and configure polls. Voting users can explore active polls, cast ballots, and view live results.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setAdminNoticeOpen(false);
                  navigate("login");
                }}
                style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
              >
                <LogIn size={18} />
                <span>Log in as Administrator</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  setAdminNoticeOpen(false);
                  navigate("poll");
                }}
                style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
              >
                <span>Continue as Voter (Explore Polls)</span>
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

export default Home;
