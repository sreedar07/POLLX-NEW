import React from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Home, 
  Vote, 
  BarChart3, 
  Gamepad2, 
  User, 
  History,
  LayoutDashboard
} from "lucide-react";

export const MobileBottomNav = ({ currentRoute, navigate, onSelectSection }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      action: () => navigate("home"),
      isActive: currentRoute === "home",
    },
    {
      id: "vote",
      label: "Vote",
      icon: Vote,
      action: () => {
        navigate("poll");
        if (onSelectSection) onSelectSection("vote");
      },
      isActive: currentRoute === "poll" && (!window.location.hash.includes("mode=results") && !window.location.hash.includes("mode=arcade")),
    },
    {
      id: "results",
      label: "Results",
      icon: BarChart3,
      action: () => {
        navigate("poll");
        if (onSelectSection) onSelectSection("results");
      },
      isActive: currentRoute === "poll" && window.location.hash.includes("mode=results"),
    },
    {
      id: "arcade",
      label: "Arcade",
      icon: Gamepad2,
      action: () => {
        navigate("poll");
        if (onSelectSection) onSelectSection("arcade");
      },
      isActive: currentRoute === "poll" && window.location.hash.includes("mode=arcade"),
    },
    {
      id: "profile",
      label: isAdmin ? "Admin" : isAuthenticated ? "History" : "Account",
      icon: isAdmin ? LayoutDashboard : isAuthenticated ? History : User,
      action: () => {
        if (isAdmin) {
          navigate("admin");
        } else if (isAuthenticated) {
          navigate("my-votes");
        } else {
          navigate("login");
        }
      },
      isActive: ["login", "register", "my-votes", "admin"].includes(currentRoute),
    },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 140,
        background: "var(--bg-card)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "6px 8px calc(6px + env(safe-area-inset-bottom, 6px))",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;
        return (
          <button
            key={item.id}
            onClick={item.action}
            aria-label={item.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 2px",
              background: "transparent",
              border: "none",
              color: active ? "#3b82f6" : "var(--text-dim)",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.15s ease, color 0.15s ease",
            }}
          >
            {/* Active glowing indicator pill */}
            {active && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  width: "20px",
                  height: "3px",
                  borderRadius: "999px",
                  background: "#3b82f6",
                  boxShadow: "0 0 10px #3b82f6",
                }}
              />
            )}

            <div
              style={{
                width: "36px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
            </div>

            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: active ? 700 : 500,
                marginTop: "2px",
                letterSpacing: "-0.01em",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
