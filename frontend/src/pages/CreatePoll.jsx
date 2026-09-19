import React, { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, HelpCircle, ArrowRight, AlertCircle, CheckCircle2, Lock, LogIn } from "lucide-react";

export const CreatePoll = ({ navigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Strict Administrator Access Control
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: "560px", margin: "60px auto", padding: "40px 24px", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: "40px 28px", border: "1.5px solid rgba(239, 68, 68, 0.35)" }}>
          <div style={{
            width: "68px",
            height: "68px",
            borderRadius: "22px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1.5px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "#f87171",
          }}>
            <Lock size={34} />
          </div>

          <h2 style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: "12px", color: "#ffffff" }}>
            Administrator Access Only
          </h2>

          <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "28px" }}>
            Only verified administrators have permission to create and manage polls. Voting users can explore active polls, cast their votes, and view live percentage results.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px", margin: "0 auto" }}>
            <button
              className="btn-primary"
              onClick={() => navigate("login")}
              style={{ width: "100%", padding: "12px", fontSize: "0.98rem" }}
            >
              <LogIn size={18} />
              <span>Log in as Administrator</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => navigate("poll")}
              style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
            >
              <span>Go to Active Poll (Vote)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const [category, setCategory] = useState("General");
  const [durationPreset, setDurationPreset] = useState("60"); // minutes
  const [customEndTime, setCustomEndTime] = useState("");
  const [startImmediately, setStartImmediately] = useState(true);
  const [customStartTime, setCustomStartTime] = useState("");
  const [isBlind, setIsBlind] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter a question or title for your poll.");
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("At least two non-empty options are required.");
      return;
    }

    // Check duplicates
    const unique = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (unique.size !== cleanOptions.length) {
      setError("All options must be unique.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: cleanTitle,
        description: description.trim(),
        category: category.trim() || "General Election",
        is_blind: isBlind,
        options: cleanOptions,
        duration_minutes: parseInt(durationPreset, 10) || 60,
      };

      if (!startImmediately && customStartTime) {
        payload.start_time = new Date(customStartTime).toISOString();
      }

      if (durationPreset === "custom" && customEndTime) {
        payload.end_time = new Date(customEndTime).toISOString();
      }

      const poll = await api.post("/api/polls", payload);

      // Navigate straight to the created live poll
      navigate(`poll-${poll.id}`);
    } catch (err) {
      setError(err.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", padding: "0 16px" }}>
      <div className="glass-card" style={{ padding: "36px" }}>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span className="category-pill tech">Administrator Console</span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>Certified Election Setup</span>
          </div>
          <h2 style={{ fontSize: "1.85rem", fontWeight: 800 }}>Create Your Live Poll</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "4px" }}>
            Define the election question, candidate options, and active duration. The live countdown timer will strictly track your scheduled window.
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            background: "rgba(185, 28, 28, 0.08)",
            border: "1px solid rgba(185, 28, 28, 0.14)",
            borderRadius: "var(--radius-md)",
            color: "#b91c1c",
            fontSize: "0.85rem",
            marginBottom: "20px",
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question / Title */}
          <div style={{ marginBottom: "20px" }}>
            <label className="form-label">
              Poll Question <span style={{ color: "var(--accent-rose)" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Which initiative should our team prioritize for Q4?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Description (Optional) */}
          <div style={{ marginBottom: "20px" }}>
            <label className="form-label">Context or Description (Optional)</label>
            <textarea
              placeholder="Add extra context, voting criteria, or instructions for voters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: "24px" }}>
            <label className="form-label">Category</label>
            <input
              type="text"
              placeholder="e.g. Technology, Governance, Campus Vote, General"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Timing & End Time Configuration */}
          <div style={{
            padding: "20px",
            borderRadius: "14px",
            background: "var(--surface-muted)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "28px"
          }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              ⏱️ Poll Timing & Auto-End Schedule
            </h3>

            {/* Start Schedule */}
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ marginBottom: "8px" }}>Start Time</label>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                  <input
                    type="radio"
                    name="startSchedule"
                    checked={startImmediately}
                    onChange={() => setStartImmediately(true)}
                  />
                  <span>Start immediately upon publishing</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                  <input
                    type="radio"
                    name="startSchedule"
                    checked={!startImmediately}
                    onChange={() => setStartImmediately(false)}
                  />
                  <span>Schedule specific start time</span>
                </label>
              </div>

              {!startImmediately && (
                <input
                  type="datetime-local"
                  required
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="form-input"
                  style={{ marginTop: "10px" }}
                />
              )}
            </div>

            {/* Duration / End Time */}
            <div>
              <label className="form-label" style={{ marginBottom: "8px" }}>Duration / End Time</label>
              <select
                value={durationPreset}
                onChange={(e) => setDurationPreset(e.target.value)}
                className="form-input"
                style={{ marginBottom: durationPreset === "custom" ? "10px" : "0" }}
              >
                <option value="5">5 Minutes (Flash Poll)</option>
                <option value="15">15 Minutes (Quick Vote)</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour (Standard)</option>
                <option value="120">2 Hours</option>
                <option value="1440">24 Hours (Full Day)</option>
                <option value="2880">48 Hours (2 Days)</option>
                <option value="custom">Custom End Date & Time...</option>
              </select>

              {durationPreset === "custom" && (
                <input
                  type="datetime-local"
                  required
                  placeholder="Choose end date & time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="form-input"
                />
              )}
            </div>
          </div>

          {/* Options List */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Voting Options (Min 2, Max 10) <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                {options.length} of 10 options
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#3b82f6",
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={`Enter choice ${idx + 1}...`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="form-input"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      style={{
                        padding: "8px 10px",
                        background: "rgba(185, 28, 28, 0.1)",
                        border: "1px solid rgba(185, 28, 28, 0.25)",
                        borderRadius: "var(--radius-sm)",
                        color: "#ef4444",
                        cursor: "pointer"
                      }}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="btn-secondary"
                style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
              >
                <Plus size={16} />
                <span>Add Another Option</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1rem" }}
          >
            {loading ? "Publishing Realtime Poll..." : "Publish Live Poll & Launch Countdown"}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
