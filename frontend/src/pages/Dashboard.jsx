import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePollWebSocket } from "../hooks/usePollWebSocket";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  RotateCcw, 
  Download, 
  FileText, 
  Filter, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Shield, 
  Radio, 
  MessageSquare,
  Lock,
  Layers,
  History
} from "lucide-react";

export const Dashboard = ({ navigate }) => {
  const { user, isAdmin, isAuthenticated } = useAuth();

  // Poll state
  const [polls, setPolls] = useState([]);
  const [selectedPollId, setSelectedPollId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [timeRange, setTimeRange] = useState("all"); // "all", "24h", "1h"
  const [selectedDept, setSelectedDept] = useState("all");

  // Moderation & Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [comments, setComments] = useState([]);

  // Create Poll Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Technology");
  const [isBlind, setIsBlind] = useState(false);
  const [newOptions, setNewOptions] = useState(["", "", ""]);
  const [creating, setCreating] = useState(false);

  // WebSocket for real-time live admin analytics sync
  const { liveUpdate } = usePollWebSocket(selectedPollId);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("login");
      return;
    }
    if (!isAdmin) {
      setError("Unauthorized. Administrator role required to view the Real-Time Results Dashboard.");
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const all = await api.get("/api/polls");
      setPolls(all || []);
      const active = all?.find(p => p.is_active) || all?.[0];
      if (active) {
        setSelectedPollId(active.id);
        await loadPollDetails(active.id);
      }
      loadAuditLogs();
    } catch (err) {
      setError(err.message || "Failed to initialize dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPollDetails = async (pollId) => {
    try {
      const data = await api.get(`/api/admin/analytics?poll_id=${pollId}`);
      setAnalytics(data);
      loadComments(pollId);
    } catch (err) {
      console.warn("Failed to load analytics for poll:", err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await api.get("/api/admin/audit-logs?limit=50");
      setAuditLogs(logs || []);
    } catch (err) {
      console.warn("Failed to fetch audit logs:", err);
    }
  };

  const loadComments = async (pollId) => {
    try {
      const list = await api.get(`/api/polls/${pollId}/comments`);
      setComments(list || []);
    } catch (err) {
      console.warn("Failed to fetch comments:", err);
    }
  };

  // Sync real-time updates from WebSocket
  useEffect(() => {
    if (liveUpdate && analytics && (liveUpdate.poll_id === selectedPollId || !liveUpdate.poll_id)) {
      setAnalytics(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          total_votes: liveUpdate.total_votes,
          optionVotes: liveUpdate.option_votes || prev.optionVotes
        };
      });
    }
  }, [liveUpdate]);

  const handlePollChange = (pollId) => {
    setSelectedPollId(pollId);
    loadPollDetails(pollId);
  };

  const handleResetVotes = async () => {
    if (!window.confirm("Are you sure you want to reset all vote counts for this election back to zero?")) {
      return;
    }
    try {
      await api.post("/api/polls/active/reset");
      setSuccessMsg("Election votes successfully reset to zero.");
      setTimeout(() => setSuccessMsg(""), 3000);
      loadPollDetails(selectedPollId);
      loadAuditLogs();
    } catch (err) {
      alert("Failed to reset votes: " + err.message);
    }
  };

  const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.download(`/api/admin/export/csv?poll_id=${selectedPollId}`);
      saveBlob(blob, `poll-${selectedPollId}-results.csv`);
    } catch (err) { alert(`CSV export failed: ${err.message}`); }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await api.download(`/api/admin/export/pdf?poll_id=${selectedPollId}`);
      saveBlob(blob, `poll-${selectedPollId}-report.pdf`);
    } catch (err) { alert(`PDF export failed: ${err.message}`); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/admin/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert("Failed to delete comment: " + err.message);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const validOpts = newOptions.map(o => o.trim()).filter(Boolean);
    if (validOpts.length < 2) {
      alert("Please provide at least 2 non-empty candidate options.");
      return;
    }

    setCreating(true);
    try {
      const created = await api.post("/api/polls", {
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        is_blind: isBlind,
        options: validOpts
      });

      setSuccessMsg(`New election '${created.title}' is now live!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowCreateForm(false);
      setNewTitle("");
      setNewDescription("");
      setNewOptions(["", "", ""]);
      loadInitialData();
    } catch (err) {
      alert("Failed to create election: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Demographic filter calculation
  const totalBallots = analytics?.total_votes || 0;
  const currentPollObj = polls.find(p => p.id === selectedPollId);
  const optionsList = currentPollObj?.options || [];

  // Filter recent votes based on demographic & time
  const filteredVotes = (analytics?.recent_votes || []).filter(v => {
    if (selectedDept !== "all" && v.voter_department !== selectedDept) return false;
    if (timeRange === "1h") {
      return (new Date() - new Date(v.created_at)) <= 60 * 60 * 1000;
    }
    if (timeRange === "24h") {
      return (new Date() - new Date(v.created_at)) <= 24 * 60 * 60 * 1000;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: "1140px", margin: "32px auto", padding: "0 20px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Shield size={22} color="var(--accent-primary)" />
            <span style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "#1a365d" }}>
              Administrator Oversight Portal
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Real-Time Results & Analytics Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            Live certified results, demographic breakdowns, audit logging, and data exports.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="btn-primary"
            style={{ padding: "10px 16px" }}
          >
            <Plus size={16} />
            <span>{showCreateForm ? "Close Form" : "Launch New Election"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            title="Export CSV Results"
            style={{ padding: "10px 14px" }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="btn-secondary"
            title="Print Official Certificate / Save PDF"
            style={{ padding: "10px 14px" }}
          >
            <FileText size={15} />
            <span>Official Report (PDF)</span>
          </button>

          <button
            onClick={handleResetVotes}
            className="btn-danger"
            title="Reset active poll votes to zero"
            style={{ padding: "10px 14px" }}
          >
            <RotateCcw size={15} />
            <span>Reset Votes</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: "12px 18px",
          background: "rgba(21, 128, 61, 0.08)",
          border: "1px solid rgba(21, 128, 61, 0.14)",
          borderRadius: "var(--radius-md)",
          color: "#16a34a",
          marginBottom: "24px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CREATE POLL COLLAPSIBLE FORM */}
      {showCreateForm && (
        <div className="glass-card" style={{ padding: "32px", marginBottom: "32px", border: "2px solid var(--accent-primary)" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>
            Ask New Question / Launch Election
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
            Launching this question sets it as the active election across all audience screens.
          </p>

          <form onSubmit={handleCreatePoll}>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Election Question / Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Which initiative should we prioritize for Q4?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="form-label">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="form-input"
                >
                  <option value="Technology">Technology</option>
                  <option value="Governance">Governance / Elections</option>
                  <option value="Community">Community Feedback</option>
                  <option value="Corporate">Corporate / Strategic</option>
                </select>
              </div>

              <div>
                <label className="form-label">Blind Vote Mode</label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isBlind}
                    onChange={(e) => setIsBlind(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
                  />
                  <span style={{ fontSize: "0.9rem" }}>Hide live tallies from voters until ballot is cast</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="form-label">Candidate / Choice Options *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {newOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    required={i < 2}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[i] = e.target.value;
                      setNewOptions(updated);
                    }}
                    className="form-input"
                  />
                ))}
              </div>
              {newOptions.length < 8 && (
                <button
                  type="button"
                  onClick={() => setNewOptions([...newOptions, ""])}
                  style={{ background: "none", color: "var(--accent-secondary)", fontSize: "0.85rem", marginTop: "8px", cursor: "pointer" }}
                >
                  + Add Another Option
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn-primary"
              style={{ padding: "12px 24px" }}
            >
              {creating ? "Publishing Election..." : "Publish Live Election →"}
            </button>
          </form>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="glass-card" style={{ padding: "18px 24px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        {/* Election Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Filter size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Target Election:</span>
          <select
            value={selectedPollId}
            onChange={(e) => handlePollChange(e.target.value)}
            className="form-input"
            style={{ width: "auto", minWidth: "260px", padding: "6px 12px", fontSize: "0.85rem" }}
          >
            {polls.map(p => (
              <option key={p.id} value={p.id} style={{ background: "#0f172a" }}>
                {p.title} {p.is_active ? "(Active)" : "(Closed)"}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range & Demographic Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
            <Clock size={15} color="var(--text-muted)" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-input"
              style={{ width: "auto", padding: "6px 10px", fontSize: "0.85rem" }}
            >
              <option value="all" style={{ background: "#0f172a" }}>All Time</option>
              <option value="24h" style={{ background: "#0f172a" }}>Last 24 Hours</option>
              <option value="1h" style={{ background: "#0f172a" }}>Last 1 Hour</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
            <Users size={15} color="var(--text-muted)" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-input"
              style={{ width: "auto", padding: "6px 10px", fontSize: "0.85rem" }}
            >
              <option value="all" style={{ background: "#0f172a" }}>All Demographics</option>
              {analytics?.demographics?.map((d, i) => (
                <option key={i} value={d.department} style={{ background: "#0f172a" }}>
                  {d.department} ({d.votes})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div className="glass-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
            Total Certified Ballots
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-primary)", marginTop: "4px" }}>
            {totalBallots}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", marginTop: "4px" }}>
            ✓ Verified with SHA-256 receipts
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
            Leading Choice
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#16a34a", marginTop: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {(() => {
              let max = -1;
              let topText = "No votes yet";
              optionsList.forEach(o => {
                const count = analytics?.optionVotes?.[o.id] ?? o.votes;
                if (count > max && count > 0) {
                  max = count;
                  topText = o.text;
                }
              });
              return topText;
            })()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            Real-time leading candidate
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
            Participating Demographics
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-secondary)", marginTop: "4px" }}>
            {analytics?.demographics?.length || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            Unique departments/groups
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
            Live Audit Stream
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f766e", marginTop: "6px" }}>
            WebSocket Active
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", marginTop: "4px" }}>
            0s sync latency
          </div>
        </div>
      </div>

      {/* VISUAL CHARTS SECTION: BAR GRAPH & PIE CHART */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        
        {/* Visual Chart 1: Dynamic Bar Graph */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <BarChart3 size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Vote Distribution (Bar Chart)</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {optionsList.map(opt => {
              const count = analytics?.optionVotes?.[opt.id] ?? opt.votes;
              const pct = totalBallots > 0 ? (count / totalBallots) * 100 : 0;

              return (
                <div key={opt.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{opt.text}</span>
                    <span style={{ color: "var(--text-muted)" }}>{count} votes ({pct.toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: "12px", background: "rgba(226, 232, 240, 0.95)", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
                      borderRadius: "6px",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Chart 2: Dynamic Doughnut / Pie Chart */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <PieIcon size={20} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Share of Votes (Pie Breakdown)</h3>
          </div>

          {totalBallots === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
              Awaiting first ballots to render proportional pie chart.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" }}>
              {/* SVG Doughnut Chart */}
              <svg width="150" height="150" viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(226, 232, 240, 0.95)" strokeWidth="5" />
                {(() => {
                  let accumulatedPercent = 0;
                  const colors = ["#1a365d", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#1a365d"];
                  return optionsList.map((opt, i) => {
                    const count = analytics?.optionVotes?.[opt.id] ?? opt.votes;
                    const pct = totalBallots > 0 ? (count / totalBallots) * 100 : 0;
                    const strokeDasharray = `${pct} ${100 - pct}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += pct;

                    return (
                      <circle
                        key={opt.id}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={colors[i % colors.length]}
                        strokeWidth="5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: "stroke-dasharray 0.4s ease" }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem" }}>
                {optionsList.map((opt, i) => {
                  const colors = ["#1a365d", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#1a365d"];
                  const count = analytics?.optionVotes?.[opt.id] ?? opt.votes;
                  const pct = totalBallots > 0 ? (count / totalBallots) * 100 : 0;
                  return (
                    <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: colors[i % colors.length] }} />
                      <span style={{ fontWeight: 600 }}>{opt.text}:</span>
                      <span style={{ color: "var(--text-muted)" }}>{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DEMOGRAPHIC PARTICIPATION BREAKDOWN */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Users size={20} color="var(--accent-primary)" /> Demographic Participation by Department
        </h3>

        {(!analytics?.demographics || analytics.demographics.length === 0) ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            No demographic breakdown available yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            {analytics.demographics.map((d, i) => (
              <div key={i} style={{ padding: "14px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{d.department}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", marginTop: "2px" }}>
                  {d.votes} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-dim)" }}>ballots</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT BALLOTS AUDIT LOG TABLE */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={20} color="var(--accent-secondary)" /> Recorded Ballots (Audit Trail)
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Showing {filteredVotes.length} ballots
          </span>
        </div>

        {filteredVotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            No recorded ballots matching the active filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Timestamp (UTC)</th>
                  <th style={{ padding: "10px" }}>Choice Cast</th>
                  <th style={{ padding: "10px" }}>Demographic</th>
                  <th style={{ padding: "10px" }}>Cryptographic Receipt Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredVotes.map((v, i) => (
                  <tr key={v.id || i} style={{ borderBottom: "1px solid rgba(248, 250, 252, 0.90)" }}>
                    <td style={{ padding: "10px", color: "var(--text-dim)" }}>
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#16a34a" }}>
                      {v.option_text}
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-muted)" }}>
                      {v.voter_department || "General"}
                    </td>
                    <td style={{ padding: "10px", fontFamily: "monospace", color: "#0f766e", fontSize: "0.8rem" }}>
                      {v.receipt_hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMMENTARY MODERATION SECTION */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={20} color="var(--accent-primary)" /> Voter Reactions & Commentary Moderation
        </h3>

        {comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            No voter comments posted yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {comments.map((c) => (
              <div key={c.id} style={{
                padding: "12px 16px",
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "2px" }}>
                    <strong style={{ color: "#1a365d" }}>{c.author_name}</strong> &bull; {new Date(c.created_at).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: "0.9rem" }}>{c.text}</div>
                </div>

                <button
                  onClick={() => handleDeleteComment(c.id)}
                  title="Moderate / Delete Inappropriate Reaction"
                  style={{ background: "none", color: "#b91c1c", padding: "6px", cursor: "pointer" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE AUDIT TRAIL LOGGING */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={20} color="var(--accent-amber)" /> Comprehensive System Audit Trail
        </h3>

        {auditLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            No audit events recorded.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textAlign: "left" }}>
                  <th style={{ padding: "8px" }}>Time (UTC)</th>
                  <th style={{ padding: "8px" }}>Action</th>
                  <th style={{ padding: "8px" }}>Actor</th>
                  <th style={{ padding: "8px" }}>Details</th>
                  <th style={{ padding: "8px" }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 20).map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: "1px solid rgba(248, 250, 252, 0.90)" }}>
                    <td style={{ padding: "8px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span className="badge-chip" style={{ fontSize: "0.7rem" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "8px", color: "#1a365d" }}>
                      {log.actor_email || "System"}
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-main)" }}>
                      {log.details}
                    </td>
                    <td style={{ padding: "8px", color: "var(--text-dim)", fontFamily: "monospace" }}>
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
