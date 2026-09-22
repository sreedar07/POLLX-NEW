import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { MobileNavbar } from "./components/MobileNavbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Home } from "./pages/Home";
import { MobileHome } from "./pages/mobile/MobileHome";
import { CreatePoll } from "./pages/CreatePoll";
import { PollView } from "./pages/PollView";
import { MobilePollView } from "./pages/mobile/MobilePollView";
import { VoterHistory } from "./pages/VoterHistory";
import { ShareModal } from "./components/ShareModal";
import { useDeviceMode } from "./hooks/useDeviceMode";
import { ShieldCheck, Zap, Radio, QrCode, Gamepad2, Award, ArrowRight, Smartphone, Monitor } from "lucide-react";

const FeaturesPage = ({ navigate }) => (
  <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      <span className="category-pill tech" style={{ marginBottom: "16px" }}>
        Platform Features
      </span>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, marginTop: "12px" }}>
        Engineered for Next-Gen Engagement
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
        Experience the world's most dynamic real-time live voting and polling infrastructure.
      </p>
    </div>

    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "20px",
      marginBottom: "40px",
    }}>
      {[
        { icon: Radio, title: "Zero-Latency WebSockets", desc: "Live bidrectional push updates stream instantly to thousands of concurrent voters without refresh.", color: "#38bdf8" },
        { icon: Zap, title: "Redis Atomic Tallying", desc: "Sub-millisecond counter increments (HINCRBY) handle massive concurrent traffic spikes effortlessly.", color: "#818cf8" },
        { icon: ShieldCheck, title: "Cryptographic Ballot Receipts", desc: "Every cast ballot generates an immutable SHA-256 receipt for zero-knowledge audit lookup.", color: "#4ade80" },
        { icon: Gamepad2, title: "Engagement Arcade", desc: "Keep audiences entertained between rounds with the built-in competitive retro Snake Game.", color: "#f59e0b" },
        { icon: QrCode, title: "Instant QR Voting", desc: "Project one-tap QR codes onto auditorium screens or share directly on WhatsApp and LinkedIn.", color: "#ec4899" },
        { icon: Award, title: "Civic Gamification", desc: "Earn dynamic voter achievement badges and verified citizen certificates.", color: "#c084fc" },
      ].map((f, idx) => {
        const Icon = f.icon;
        return (
          <div key={idx} className="glass-card" style={{ padding: "24px" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: `${f.color}15`,
              color: f.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
              border: `1px solid ${f.color}30`,
            }}>
              <Icon size={22} />
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px" }}>{f.title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        );
      })}
    </div>

    <div style={{ textAlign: "center" }}>
      <button className="btn-primary" onClick={() => navigate("poll")} style={{ padding: "12px 28px", fontSize: "1rem" }}>
        <span>Try Live Poll</span>
        <ArrowRight size={16} />
      </button>
    </div>
  </div>
);

const AboutPage = ({ navigate }) => (
  <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 20px" }}>
    <div className="glass-card" style={{ padding: "36px 24px" }}>
      <span className="category-pill tech" style={{ marginBottom: "16px" }}>
        About PollX
      </span>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, marginTop: "12px", marginBottom: "16px" }}>
        Discuss &bull; Vote &bull; Build a Better Tomorrow
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.02rem", lineHeight: 1.6, marginBottom: "24px" }}>
        PollX was built from the ground up to solve trust, transparency, and engagement issues in digital voting. Whether for classroom interactions, developer conferences, corporate AGMs, or civic elections, PollX delivers tamper-proof integrity and live visual delight.
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px",
        marginTop: "24px",
        marginBottom: "32px",
      }}>
        <div style={{ padding: "18px", borderRadius: "14px", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)" }}>
          <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "6px" }}>🔒 100% Verifiable</h4>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>Every vote is backed by cryptographic proofs and audit logging.</p>
        </div>
        <div style={{ padding: "18px", borderRadius: "14px", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)" }}>
          <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "6px" }}>⚡ Zero Refreshes</h4>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>Instant WebSocket push ensures results reflect the pulse of the room.</p>
        </div>
      </div>
      <button className="btn-primary" onClick={() => navigate("poll")}>
        <span>Explore Active Polls</span>
        <ArrowRight size={16} />
      </button>
    </div>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { isMobile, deviceMode, setDeviceMode } = useDeviceMode();
  const [route, setRoute] = useState("home");
  const [pollId, setPollId] = useState(null);
  const [globalShareOpen, setGlobalShareOpen] = useState(false);
  const [mobilePollInitialTab, setMobilePollInitialTab] = useState("vote");

  const parseHash = () => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "/" || hash === "home") {
      setRoute("home");
      setPollId(null);
    } else if (hash === "poll" || hash === "explore") {
      setRoute("poll");
      setPollId(null);
    } else if (hash.startsWith("poll-")) {
      setRoute("poll");
      setPollId(hash.replace("poll-", ""));
    } else if (hash === "features") {
      setRoute("features");
      setPollId(null);
    } else if (hash === "about") {
      setRoute("about");
      setPollId(null);
    } else if (hash === "create") {
      setRoute("create");
      setPollId(null);
    } else if (["admin", "dashboard"].includes(hash)) {
      setRoute("admin");
      setPollId(null);
    } else if (["login", "signin"].includes(hash)) {
      setRoute("login");
      setPollId(null);
    } else if (["register", "signup"].includes(hash)) {
      setRoute("register");
      setPollId(null);
    } else if (["my-votes", "history"].includes(hash)) {
      setRoute("my-votes");
      setPollId(null);
    } else {
      setRoute("poll");
      setPollId(null);
    }
  };

  useEffect(() => {
    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  const navigate = (to) => {
    window.location.hash = to;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "1.1rem",
      }}>
        Loading PollX...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation: Renders MobileNavbar for mobile view, Navbar for desktop web */}
      {isMobile ? (
        <MobileNavbar
          currentRoute={route}
          navigate={navigate}
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          onShareClick={() => setGlobalShareOpen(true)}
        />
      ) : (
        <Navbar 
          currentRoute={route} 
          navigate={navigate} 
          onShareClick={() => setGlobalShareOpen(true)}
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
        />
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: isMobile ? "68px" : "0" }}>
        {route === "home" && (
          isMobile ? <MobileHome navigate={navigate} /> : <Home navigate={navigate} />
        )}
        {route === "poll" && (
          isMobile ? (
            <MobilePollView pollId={pollId} navigate={navigate} initialTab={mobilePollInitialTab} />
          ) : (
            <PollView pollId={pollId} navigate={navigate} />
          )
        )}
        {route === "features" && <FeaturesPage navigate={navigate} />}
        {route === "about" && <AboutPage navigate={navigate} />}
        {route === "create" && (isAuthenticated && isAdmin ? <CreatePoll navigate={navigate} /> : <Login navigate={navigate} />)}
        {route === "login" && <Login navigate={navigate} />}
        {route === "register" && <Register navigate={navigate} />}
        {route === "my-votes" && <VoterHistory navigate={navigate} />}
        {route === "admin" && (
          isAuthenticated && isAdmin ? (
            <Dashboard navigate={navigate} />
          ) : (
            <Login navigate={navigate} />
          )
        )}
      </main>

      {/* Mobile Bottom Dock Bar */}
      {isMobile && (
        <MobileBottomNav
          currentRoute={route}
          navigate={navigate}
          onSelectSection={(sec) => setMobilePollInitialTab(sec)}
        />
      )}

      {/* Global Share Modal */}
      <ShareModal
        poll={{ id: pollId || "active", title: "PollX Live Polling Platform" }}
        isOpen={globalShareOpen}
        onClose={() => setGlobalShareOpen(false)}
      />

      {/* Brand Footer (Desktop & Tablet) */}
      {!isMobile && (
        <footer style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--text-dim)",
          fontSize: "0.85rem",
          marginTop: "auto",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.05rem" }}>
              Poll<span style={{ color: "#3b82f6" }}>X</span>
            </span>
            <span>&bull;</span>
            <span>Discuss &bull; Vote &bull; Build a Better Tomorrow</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* View Indicator & Switcher */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.78rem",
            }}>
              <Monitor size={13} color="#38bdf8" />
              <span>Web Interface</span>
              <button
                onClick={() => setDeviceMode("mobile")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.76rem",
                  padding: 0,
                }}
              >
                Switch to Mobile
              </button>
            </div>

            <div style={{ fontSize: "0.82rem" }}>
              Go &bull; Gin &bull; Redis &bull; React 19
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
