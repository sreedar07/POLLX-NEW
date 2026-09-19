import React, { useState } from "react";
import { 
  ArrowRight, 
  BarChart2, 
  Users, 
  Activity, 
  Vote, 
  Gamepad2, 
  Check, 
  Radio, 
  Sparkles,
  Layers,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { SnakeGameModal } from "../components/SnakeGameModal";

export const Home = ({ navigate }) => {
  const [snakeModalOpen, setSnakeModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "48px 24px" }}>
      {/* ===================== HERO SECTION ===================== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.15fr 0.85fr",
        gap: "40px",
        alignItems: "center",
        marginBottom: "72px",
      }}>
        {/* Left Column: Headline & CTAs */}
        <div>
          {/* Live Badge */}
          <div className="pulse-badge" style={{ marginBottom: "20px" }}>
            <span className="pulse-dot" />
            <span>Live &bull; 2,340 votes today</span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
            fontWeight: 800,
            lineHeight: 1.12,
            marginBottom: "18px",
            letterSpacing: "-0.03em",
          }}>
            Your Voice<br />
            <span style={{
              background: "linear-gradient(135deg, #ffffff 40%, #93c5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Shapes Tomorrow
            </span>
          </h1>

          <p style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#60a5fa",
            marginBottom: "10px",
          }}>
            Create. Share. Vote. See Results Live.
          </p>

          <p style={{
            fontSize: "1.05rem",
            color: "var(--text-muted)",
            maxWidth: "520px",
            lineHeight: 1.5,
            marginBottom: "32px",
          }}>
            Modern polling for a smarter, more engaged world. Instant verification, live audience commentary, and interactive charts.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn-primary"
              onClick={() => navigate("poll")}
              style={{
                padding: "14px 28px",
                fontSize: "1.05rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <span>Explore Polls</span>
              <ArrowRight size={18} />
            </button>

            <button
              className="btn-secondary"
              onClick={() => navigate("create")}
              style={{
                padding: "14px 26px",
                fontSize: "1.05rem",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <span>Create a Poll</span>
            </button>
          </div>
        </div>

        {/* Right Column: 3D Floating Ballot Box & Reaction Badges */}
        <div style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "360px",
        }}>
          {/* Main Glowing 3D Ballot Box Card */}
          <div 
            className="glass-card floating-hero-card"
            style={{
              width: "280px",
              height: "280px",
              borderRadius: "28px",
              background: "linear-gradient(145deg, rgba(30, 58, 138, 0.5) 0%, rgba(15, 23, 42, 0.85) 100%)",
              border: "1.5px solid rgba(99, 102, 241, 0.4)",
              boxShadow: "0 20px 60px rgba(59, 130, 246, 0.35)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Slot with glowing checkmark ballot entering */}
            <div style={{
              width: "120px",
              height: "10px",
              borderRadius: "5px",
              background: "rgba(10, 15, 30, 0.9)",
              border: "1px solid rgba(99, 102, 241, 0.6)",
              marginBottom: "18px",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)",
            }} />

            {/* Glowing Ballot entering slot */}
            <div style={{
              width: "90px",
              height: "60px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              boxShadow: "0 4px 25px rgba(99, 102, 241, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              border: "1px solid rgba(255,255,255,0.3)",
            }}>
              <Check size={32} color="#ffffff" strokeWidth={3} />
            </div>

            <div style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}>
              Poll<span style={{ color: "#38bdf8" }}>X</span> Live
            </div>
            <div style={{ fontSize: "0.75rem", color: "#93c5fd", marginTop: "4px" }}>
              Secure &bull; Verifiable
            </div>
          </div>

          {/* Floating Reaction Badges around the box */}
          {/* Badge 1: Thumbs Up (Top Right) */}
          <div 
            className="floating-badge-1"
            style={{
              position: "absolute",
              top: "10%",
              right: "8%",
              background: "rgba(59, 130, 246, 0.25)",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              padding: "10px 14px",
              fontSize: "1.4rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            👍
          </div>

          {/* Badge 2: Smiley Face (Bottom Left) */}
          <div 
            className="floating-badge-2"
            style={{
              position: "absolute",
              bottom: "12%",
              left: "6%",
              background: "rgba(245, 158, 11, 0.25)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              padding: "10px 14px",
              fontSize: "1.4rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            😊
          </div>

          {/* Badge 3: Graph / Chart (Bottom Right) */}
          <div 
            className="floating-badge-1"
            style={{
              position: "absolute",
              bottom: "14%",
              right: "4%",
              background: "rgba(236, 72, 153, 0.25)",
              border: "1px solid rgba(236, 72, 153, 0.5)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              padding: "10px 14px",
              fontSize: "1.4rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            📊
          </div>

          {/* Badge 4: Message Bubble (Top Left) */}
          <div 
            className="floating-badge-2"
            style={{
              position: "absolute",
              top: "8%",
              left: "10%",
              background: "rgba(139, 92, 246, 0.25)",
              border: "1px solid rgba(139, 92, 246, 0.5)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              padding: "8px 12px",
              fontSize: "1.2rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            💬
          </div>
        </div>
      </div>

      {/* ===================== STATS ROW ===================== */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        marginBottom: "64px",
      }}>
        {[
          { icon: Layers, label: "Polls Created", value: "10K+", color: "#38bdf8" },
          { icon: Vote, label: "Votes Cast", value: "1M+", color: "#818cf8" },
          { icon: Users, label: "Active Users", value: "50K+", color: "#c084fc" },
          { icon: Activity, label: "Uptime", value: "99.9%", color: "#4ade80" },
        ].map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <div 
              key={i}
              className="glass-card"
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "var(--bg-card)",
              }}
            >
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: `${stat.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: stat.color,
                border: `1px solid ${stat.color}35`,
              }}>
                <IconComp size={22} />
              </div>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "2px" }}>
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================== FEATURED POLLS SECTION ===================== */}
      <div style={{ marginBottom: "60px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}>
          <h2 style={{ fontSize: "1.55rem", fontWeight: 800, margin: 0 }}>
            Featured Polls
          </h2>
          <button 
            onClick={() => navigate("poll")}
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>View All</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* 3 Featured Poll Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}>
          {/* Card 1: Favorite Programming Language? */}
          <div 
            className="glass-card"
            onClick={() => navigate("poll")}
            style={{
              padding: "24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "150px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "12px" }}>
                Favorite Programming Language?
              </h3>
              <span className="category-pill tech">Technology</span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
              fontSize: "0.85rem",
              color: "var(--text-dim)",
            }}>
              <span>2.4K votes</span>
              <span className="pulse-badge live-green" style={{ padding: "2px 8px" }}>
                <span className="pulse-dot green" />
                Live
              </span>
            </div>
          </div>

          {/* Card 2: Should AI be regulated? */}
          <div 
            className="glass-card"
            onClick={() => navigate("poll")}
            style={{
              padding: "24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "150px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "12px" }}>
                Should AI be regulated?
              </h3>
              <span className="category-pill edu">Education</span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
              fontSize: "0.85rem",
              color: "var(--text-dim)",
            }}>
              <span>1.3K votes</span>
              <span className="category-pill ending" style={{ padding: "2px 8px" }}>
                Ending Soon
              </span>
            </div>
          </div>

          {/* Card 3: Best Movie of 2024? */}
          <div 
            className="glass-card"
            onClick={() => navigate("poll")}
            style={{
              padding: "24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "150px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "12px" }}>
                Best Movie of 2024?
              </h3>
              <span className="category-pill ent">Entertainment</span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
              fontSize: "0.85rem",
              color: "var(--text-dim)",
            }}>
              <span>3.1K votes</span>
              <span className="pulse-badge live-green" style={{ padding: "2px 8px" }}>
                <span className="pulse-dot green" />
                Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== PLAY SNAKE GAME BANNER ===================== */}
      <div 
        className="glass-card"
        style={{
          padding: "28px 36px",
          borderRadius: "24px",
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(59, 130, 246, 0.15) 100%)",
          border: "1.5px solid rgba(99, 102, 241, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
          }}>
            <Gamepad2 size={30} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "4px" }}>
              Play Snake Game
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: 0 }}>
              Take a break and compete on the leaderboard!
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setSnakeModalOpen(true)}
          style={{
            padding: "12px 28px",
            fontSize: "1rem",
            borderRadius: "var(--radius-pill)",
          }}
        >
          <span>Play Now</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Snake Game Modal */}
      <SnakeGameModal
        isOpen={snakeModalOpen}
        onClose={() => setSnakeModalOpen(false)}
      />
    </div>
  );
};
