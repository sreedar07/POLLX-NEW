import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Check, 
  Sun, 
  Moon, 
  Share2, 
  LogIn, 
  LogOut, 
  UserCheck, 
  LayoutDashboard,
  Award,
  Sparkles
} from "lucide-react";

export const Navbar = ({ currentRoute, navigate, onShareClick }) => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 36px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg-card)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      transition: "all 0.25s ease",
    }}>
      {/* Brand: [✓] PollX */}
      <div 
        onClick={() => navigate("home")}
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 16px rgba(99, 102, 241, 0.45)",
        }}>
          <Check size={22} color="#ffffff" strokeWidth={3} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-main)",
          }}>
            Poll<span style={{ color: "#3b82f6" }}>X</span>
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "28px",
      }}>
        <span 
          onClick={() => navigate("home")}
          style={{
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: currentRoute === "home" ? 700 : 500,
            color: currentRoute === "home" ? "var(--text-main)" : "var(--text-muted)",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-main)"}
          onMouseLeave={(e) => e.currentTarget.style.color = currentRoute === "home" ? "var(--text-main)" : "var(--text-muted)"}
        >
          Home
        </span>

        <span 
          onClick={() => navigate("poll")}
          style={{
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: currentRoute === "poll" ? 700 : 500,
            color: currentRoute === "poll" ? "var(--text-main)" : "var(--text-muted)",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-main)"}
          onMouseLeave={(e) => e.currentTarget.style.color = currentRoute === "poll" ? "var(--text-main)" : "var(--text-muted)"}
        >
          Explore
        </span>

        <span 
          onClick={() => navigate("features")}
          style={{
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: currentRoute === "features" ? 700 : 500,
            color: currentRoute === "features" ? "var(--text-main)" : "var(--text-muted)",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-main)"}
          onMouseLeave={(e) => e.currentTarget.style.color = currentRoute === "features" ? "var(--text-main)" : "var(--text-muted)"}
        >
          Features
        </span>

        <span 
          onClick={() => navigate("about")}
          style={{
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: currentRoute === "about" ? 700 : 500,
            color: currentRoute === "about" ? "var(--text-main)" : "var(--text-muted)",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-main)"}
          onMouseLeave={(e) => e.currentTarget.style.color = currentRoute === "about" ? "var(--text-main)" : "var(--text-muted)"}
        >
          About
        </span>

        {isAdmin && (
          <span 
            onClick={() => navigate("admin")}
            style={{
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: currentRoute === "admin" ? 700 : 500,
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <LayoutDashboard size={15} />
            Admin
          </span>
        )}
      </div>

      {/* Right Controls: Theme Toggle & Login/Share */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Dark/Light Switch Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: "56px",
            height: "28px",
            borderRadius: "999px",
            background: theme === "dark" ? "#1e293b" : "#e2e8f0",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            padding: "2px",
            position: "relative",
            cursor: "pointer",
            transition: "all 0.25s ease",
          }}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          <div style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: theme === "dark" ? "#3b82f6" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: theme === "dark" ? "translateX(28px)" : "translateX(2px)",
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease",
            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
          }}>
            {theme === "dark" ? (
              <Moon size={12} color="#ffffff" />
            ) : (
              <Sun size={13} color="#f59e0b" />
            )}
          </div>
        </button>

        {/* Share Button if viewing poll */}
        {currentRoute === "poll" && (
          <button 
            className="btn-secondary"
            onClick={onShareClick}
            style={{ padding: "8px 16px", fontSize: "0.88rem" }}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
        )}

        {/* Auth / Profile */}
        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
              {user?.full_name || user?.username || "Admin"}
            </span>
            <button
              className="btn-secondary"
              onClick={logout}
              title="Sign Out"
              style={{ padding: "8px 12px" }}
            >
              <LogOut size={15} color="var(--text-muted)" />
            </button>
          </div>
        ) : (
          <button 
            className="btn-primary"
            onClick={() => navigate("login")}
            style={{ padding: "8px 20px", fontSize: "0.9rem" }}
          >
            <LogIn size={15} />
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};
