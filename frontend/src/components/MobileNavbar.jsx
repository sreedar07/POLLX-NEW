import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Check,
  Sun,
  Moon,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  History,
  Info,
  Layers,
  Monitor,
  Smartphone,
  Sparkles,
  Gamepad2,
  BarChart3,
  Vote
} from "lucide-react";

export const MobileNavbar = ({
  currentRoute,
  navigate,
  deviceMode,
  setDeviceMode,
  onShareClick,
}) => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleNavClick = (route) => {
    navigate(route);
    setDrawerOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 150,
          background: "var(--bg-card)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Brand */}
        <div
          onClick={() => handleNavClick("home")}
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Check size={18} color="#ffffff" strokeWidth={3} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-main)",
              }}
            >
              Poll<span style={{ color: "#3b82f6" }}>X</span>
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "999px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                fontWeight: 700,
                letterSpacing: "0.05em",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Mobile
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quick theme switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? (
              <Moon size={16} color="#60a5fa" />
            ) : (
              <Sun size={16} color="#f59e0b" />
            )}
          </button>

          {/* Mode Switcher Pill */}
          <button
            onClick={() => setDeviceMode(deviceMode === "desktop" ? "auto" : "desktop")}
            title="Switch to Web / Desktop Interface"
            style={{
              height: "34px",
              padding: "0 10px",
              borderRadius: "10px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "var(--text-dim)",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Monitor size={14} />
            <span>Web</span>
          </button>

          {/* Drawer Toggle */}
          <button
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: drawerOpen ? "rgba(59, 130, 246, 0.2)" : "var(--surface-muted)",
              border: drawerOpen ? "1px solid #3b82f6" : "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: drawerOpen ? "#3b82f6" : "var(--text-main)",
              cursor: "pointer",
            }}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Drawer Overlay & Content */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 140,
            background: "rgba(3, 7, 18, 0.7)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: "58px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-strong)",
              padding: "20px 16px 24px",
              boxShadow: "0 16px 36px rgba(0,0,0,0.5)",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
            }}
          >
            {/* User Profile Card in Drawer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "var(--surface-muted)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "16px",
              }}
            >
              {isAuthenticated ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      {(user?.full_name || user?.username || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {user?.full_name || user?.username}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: isAdmin ? "#38bdf8" : "var(--text-dim)" }}>
                        {isAdmin ? "Verified Administrator" : "Registered Voter"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setDrawerOpen(false);
                    }}
                    title="Log Out"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      Welcome to PollX
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      Sign in for ballot receipts & badges
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => handleNavClick("login")}
                    style={{ padding: "8px 16px", fontSize: "0.82rem", borderRadius: "999px" }}
                  >
                    <User size={14} />
                    <span>Sign In</span>
                  </button>
                </>
              )}
            </div>

            {/* Navigation Drawer Menu Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                onClick={() => handleNavClick("home")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  background: currentRoute === "home" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: currentRoute === "home" ? "#60a5fa" : "var(--text-main)",
                  fontWeight: currentRoute === "home" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Sparkles size={18} />
                <span>Home Page</span>
              </button>

              <button
                onClick={() => handleNavClick("poll")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  background: currentRoute === "poll" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: currentRoute === "poll" ? "#60a5fa" : "var(--text-main)",
                  fontWeight: currentRoute === "poll" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Vote size={18} />
                <span>Active Poll & Ballots</span>
              </button>

              <button
                onClick={() => handleNavClick("my-votes")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  background: currentRoute === "my-votes" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: currentRoute === "my-votes" ? "#60a5fa" : "var(--text-main)",
                  fontWeight: currentRoute === "my-votes" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <History size={18} />
                <span>My Voting History & Receipts</span>
              </button>

              <button
                onClick={() => handleNavClick("features")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  background: currentRoute === "features" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: currentRoute === "features" ? "#60a5fa" : "var(--text-main)",
                  fontWeight: currentRoute === "features" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Layers size={18} />
                <span>Platform Features</span>
              </button>

              <button
                onClick={() => handleNavClick("about")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  background: currentRoute === "about" ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: currentRoute === "about" ? "#60a5fa" : "var(--text-main)",
                  fontWeight: currentRoute === "about" ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Info size={18} />
                <span>About PollX</span>
              </button>

              {isAdmin && (
                <>
                  <div style={{ height: "1px", background: "var(--border-subtle)", margin: "8px 0" }} />
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", padding: "4px 14px", fontWeight: 700, textTransform: "uppercase" }}>
                    Admin Controls
                  </div>
                  <button
                    onClick={() => handleNavClick("admin")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "none",
                      background: currentRoute === "admin" ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: currentRoute === "admin" ? "#38bdf8" : "var(--text-main)",
                      fontWeight: currentRoute === "admin" ? 700 : 500,
                      fontSize: "0.92rem",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <LayoutDashboard size={18} color="#38bdf8" />
                    <span>Admin Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleNavClick("create")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "none",
                      background: currentRoute === "create" ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: currentRoute === "create" ? "#38bdf8" : "var(--text-main)",
                      fontWeight: currentRoute === "create" ? 700 : 500,
                      fontSize: "0.92rem",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <PlusCircle size={18} color="#38bdf8" />
                    <span>Create New Poll</span>
                  </button>
                </>
              )}
            </div>

            {/* View Switcher footer */}
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "12px",
                background: "var(--surface-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Smartphone size={16} />
                <span>Current: Mobile View</span>
              </div>
              <button
                onClick={() => {
                  setDeviceMode("desktop");
                  setDrawerOpen(false);
                }}
                style={{
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border-subtle)",
                  color: "#60a5fa",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Switch to Web Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavbar;
