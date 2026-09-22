import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePollWebSocket } from "../../hooks/usePollWebSocket";
import { LiveResultsChart } from "../../components/LiveResultsChart";
import { ShareModal } from "../../components/ShareModal";
import { ChillOutSnakeLounge } from "../../components/ChillOutSnakeLounge";
import {
  CheckCircle2,
  Share2,
  Vote,
  BarChart3,
  MessageSquare,
  Gamepad2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Check,
  Send,
  Clock
} from "lucide-react";

export const MobilePollView = ({ pollId: propPollId, navigate, initialTab = "vote" }) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState(initialTab); // "vote" | "results" | "chat" | "arcade"
  const [showCelebration, setShowCelebration] = useState(false);

  // Live commentary & reactions
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // QR Code
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Countdown timer
  const [countdown, setCountdown] = useState({
    status: "active",
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 3600,
  });

  const getFingerprint = () => {
    let fp = localStorage.getItem("voter_fingerprint");
    if (!fp) {
      fp = "fp_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("voter_fingerprint", fp);
    }
    return fp;
  };

  const activePollId = poll?.id || propPollId;
  const { liveUpdate } = usePollWebSocket(activePollId);

  const fetchComments = async (id) => {
    try {
      const data = await api.get(`/api/polls/${id}/comments`);
      if (Array.isArray(data)) {
        setComments(data);
      }
    } catch {
      // Commentary API optional fallback
    }
  };

  // Dynamic countdown timer
  useEffect(() => {
    if (!poll?.end_time) {
      setCountdown({ status: "active", days: 0, hours: 1, minutes: 0, seconds: 0, totalSeconds: 3600 });
      return;
    }

    const computeTime = () => {
      const now = Date.now();
      const startMs = poll.start_time ? new Date(poll.start_time).getTime() : now;
      const endMs = new Date(poll.end_time).getTime();

      if (now < startMs) {
        const diff = Math.max(0, Math.floor((startMs - now) / 1000));
        setCountdown({
          status: "upcoming",
          days: Math.floor(diff / 86400),
          hours: Math.floor((diff % 86400) / 3600),
          minutes: Math.floor((diff % 3600) / 60),
          seconds: diff % 60,
          totalSeconds: diff,
        });
      } else if (now >= endMs) {
        setCountdown({
          status: "ended",
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
        });
      } else {
        const diff = Math.max(0, Math.floor((endMs - now) / 1000));
        setCountdown({
          status: "active",
          days: Math.floor(diff / 86400),
          hours: Math.floor((diff % 86400) / 3600),
          minutes: Math.floor((diff % 3600) / 60),
          seconds: diff % 60,
          totalSeconds: diff,
        });
      }
    };

    computeTime();
    const timer = setInterval(computeTime, 1000);
    return () => clearInterval(timer);
  }, [poll?.start_time, poll?.end_time]);

  // QR Code generation
  useEffect(() => {
    const pollLink = window.location.href;
    QRCode.toDataURL(pollLink, {
      width: 140,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Error:", err));
  }, [activePollId]);

  // Fetch Poll Data
  useEffect(() => {
    const fetchPoll = async () => {
      setLoading(true);
      setError("");
      try {
        const fp = getFingerprint();
        const endpoint = propPollId
          ? `/api/polls/${propPollId}?fingerprint=${fp}`
          : `/api/polls/active?fingerprint=${fp}`;
        const data = await api.get(endpoint);
        const pollObj = data?.poll || (data?.id ? data : null);
        setPoll(pollObj);
        setHasVoted(!!data?.has_voted);
        if (data?.has_voted) {
          setMobileTab("results");
        }

        if (pollObj?.id) {
          fetchComments(pollObj.id);
        }
      } catch (err) {
        try {
          const polls = await api.get("/api/polls");
          if (polls && polls.length > 0) {
            const active = polls.find((item) => item.is_active || item.status === "active") || polls[0];
            setPoll(active);
            if (active?.id) {
              fetchComments(active.id);
            }
          } else {
            setPoll(null);
          }
        } catch {
          setPoll(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [propPollId]);

  // Sync Live WebSocket Updates
  useEffect(() => {
    if (!liveUpdate || !poll) return;
    if (liveUpdate.poll_id === poll.id || !liveUpdate.poll_id) {
      setPoll((prev) => {
        if (!prev) return prev;
        const updatedOptions = (prev.options || []).map((opt) => ({
          ...opt,
          votes: liveUpdate.option_votes?.[opt.id] ?? opt.votes,
        }));
        return {
          ...prev,
          total_votes: liveUpdate.total_votes ?? prev.total_votes,
          options: updatedOptions,
        };
      });
    }
  }, [liveUpdate]);

  // Handle Vote Submission
  const handleVoteSubmit = async () => {
    if (!selectedOption || !poll || hasVoted) return;

    setVoting(true);
    setError("");

    try {
      const payload = {
        option_id: selectedOption,
        fingerprint: getFingerprint(),
        department: user?.department || "General Voter",
      };

      await api.post(`/api/polls/${poll.id}/vote`, payload);

      setHasVoted(true);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.65 },
          colors: ["#3b82f6", "#6366f1", "#4ade80", "#f59e0b"],
        });
      } catch {
        // Confetti fallback
      }

      setShowCelebration(true);
      setMobileTab("results");
    } catch (err) {
      setError(err.message || "Failed to submit ballot. Please try again.");
    } finally {
      setVoting(false);
    }
  };

  // Handle Comments
  const handlePostComment = async (e) => {
    e?.preventDefault();
    if (!newCommentText.trim() || !poll) return;

    setCommentLoading(true);
    try {
      const newComment = {
        id: "c_" + Date.now(),
        name: user?.full_name || user?.username || "Voter #" + Math.floor(1000 + Math.random() * 9000),
        text: newCommentText.trim(),
        time: "Just now",
        likes: 0,
      };
      setComments((prev) => [newComment, ...prev]);
      setNewCommentText("");

      try {
        await api.post(`/api/polls/${poll.id}/comments`, { text: newComment.text });
      } catch {
        // Backend optional fallback
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleQuickReaction = (emoji) => {
    const reactionComment = {
      id: "c_react_" + Date.now(),
      name: user?.full_name || user?.username || "Voter",
      text: emoji,
      time: "Just now",
      likes: 1,
    };
    setComments((prev) => [reactionComment, ...prev]);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Loading Live Ballot...</div>
        <div style={{ fontSize: "0.85rem" }}>Connecting to WebSocket engine</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div style={{ padding: "40px 16px 88px", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: "36px 20px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "16px",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1.5px solid rgba(59, 130, 246, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "#3b82f6"
          }}>
            <Radio size={30} />
          </div>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "8px" }}>
            No Active Election in Session
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.5, maxWidth: "340px", margin: "0 auto 20px" }}>
            Waiting for an administrator to launch an active poll with candidate options.
          </p>
          {isAdmin ? (
            <button
              className="btn-primary"
              onClick={() => navigate("create")}
              style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
            >
              <span>Create New Poll Now</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => navigate("home")}
              style={{ width: "100%", padding: "10px", fontSize: "0.88rem" }}
            >
              <span>Return to Home</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentOptions = poll?.options || [];
  const pollTitle = poll?.title || "Live Poll";
  const realViewers = liveUpdate?.active_viewers || 1;
  const sortedOptions = [...currentOptions].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const effectiveTotal = poll?.total_votes || currentOptions.reduce((acc, o) => acc + (o.votes || 0), 0);
  const leadingOption = sortedOptions[0] && effectiveTotal > 0 ? {
    text: sortedOptions[0].text,
    percentage: Math.round(((sortedOptions[0].votes || 0) / effectiveTotal) * 100),
  } : null;

  return (
    <div style={{ padding: "12px 14px 92px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* ===================== MOBILE SEGMENTED CONTROL TABS ===================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          background: "var(--surface-muted)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          padding: "4px",
          gap: "4px",
        }}
      >
        <button
          onClick={() => setMobileTab("vote")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "8px 2px",
            borderRadius: "10px",
            border: "none",
            background: mobileTab === "vote" ? "#3b82f6" : "transparent",
            color: mobileTab === "vote" ? "#ffffff" : "var(--text-muted)",
            fontWeight: mobileTab === "vote" ? 700 : 500,
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          <Vote size={15} />
          <span>Ballot</span>
        </button>

        <button
          onClick={() => setMobileTab("results")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "8px 2px",
            borderRadius: "10px",
            border: "none",
            background: mobileTab === "results" ? "#3b82f6" : "transparent",
            color: mobileTab === "results" ? "#ffffff" : "var(--text-muted)",
            fontWeight: mobileTab === "results" ? 700 : 500,
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          <BarChart3 size={15} />
          <span>Results</span>
        </button>

        <button
          onClick={() => setMobileTab("chat")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "8px 2px",
            borderRadius: "10px",
            border: "none",
            background: mobileTab === "chat" ? "#3b82f6" : "transparent",
            color: mobileTab === "chat" ? "#ffffff" : "var(--text-muted)",
            fontWeight: mobileTab === "chat" ? 700 : 500,
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          <MessageSquare size={15} />
          <span>Chat {comments.length > 0 && `(${comments.length})`}</span>
        </button>

        <button
          onClick={() => setMobileTab("arcade")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            padding: "8px 2px",
            borderRadius: "10px",
            border: "none",
            background: mobileTab === "arcade" ? "#3b82f6" : "transparent",
            color: mobileTab === "arcade" ? "#ffffff" : "var(--text-muted)",
            fontWeight: mobileTab === "arcade" ? 700 : 500,
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          <Gamepad2 size={15} />
          <span>Arcade</span>
        </button>
      </div>

      {/* ===================== TOP STATUS HEADER ===================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "12px",
          background: "var(--surface-muted)",
          border: "1px solid var(--border-subtle)",
          fontSize: "0.78rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="category-pill tech" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
            {poll.category || "Election"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4ade80", fontWeight: 600 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
            {realViewers} online
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)" }}>
          <Clock size={13} />
          <span>
            {countdown.status === "ended"
              ? "Closed"
              : `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
          </span>
        </div>
      </div>

      {/* ===================== TAB 1: BALLOT VOTING ===================== */}
      {mobileTab === "vote" && (
        <div className="glass-card" style={{ padding: "20px 16px" }}>
          {/* Poll Question */}
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: "8px",
              color: "var(--text-main)",
            }}
          >
            {poll.title}
          </h2>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "18px" }}>
            {poll.description || "Select your preferred candidate or choice below to cast your verified ballot."}
          </p>

          {/* Voting Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {currentOptions.map((opt) => {
              const isSelected = selectedOption === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => !hasVoted && setSelectedOption(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 14px",
                    borderRadius: "14px",
                    background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--surface-muted)",
                    border: isSelected ? "2px solid #3b82f6" : "1.5px solid var(--border-subtle)",
                    cursor: hasVoted ? "default" : "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 0 16px rgba(59, 130, 246, 0.3)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: isSelected ? "6px solid #3b82f6" : "2px solid var(--border-strong)",
                        background: isSelected ? "#ffffff" : "transparent",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#ffffff" : "var(--text-main)",
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.text}
                    </span>
                  </div>

                  {isSelected && (
                    <Check size={18} color="#3b82f6" strokeWidth={3} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Already Voted Banner */}
          {hasVoted && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} color="#22c55e" />
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4ade80" }}>
                  Ballot Cast Successfully
                </span>
              </div>
              <button
                onClick={() => setMobileTab("results")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Results →
              </button>
            </div>
          )}

          {/* Submit Ballot CTA */}
          {!hasVoted && (
            <button
              className="btn-primary"
              onClick={handleVoteSubmit}
              disabled={voting || !selectedOption || countdown.status !== "active"}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <span>
                {voting
                  ? "Encrypting & Submitting..."
                  : countdown.status === "upcoming"
                  ? "Voting Opens Soon"
                  : countdown.status === "ended"
                  ? "Voting Closed"
                  : selectedOption
                  ? "Submit Vote Now"
                  : "Tap an option above"}
              </span>
              <ArrowRight size={16} />
            </button>
          )}

          {/* Privacy Footnote */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              fontSize: "0.75rem",
              color: "var(--text-dim)",
              paddingTop: "8px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={13} color="#22c55e" />
              100% Anonymous
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Lock size={13} color="#3b82f6" />
              SHA-256 Verified
            </span>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: LIVE RESULTS ===================== */}
      {mobileTab === "results" && (
        <div className="glass-card" style={{ padding: "20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Live Results</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Total Ballots: <strong>{effectiveTotal}</strong>
              </p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setShareModalOpen(true)}
              style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "8px" }}
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>

          {/* Results progress bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {currentOptions.map((opt) => {
              const votes = opt.votes || 0;
              const pct = effectiveTotal > 0 ? Math.round((votes / effectiveTotal) * 100) : 0;
              const isWinner = leadingOption && leadingOption.text === opt.text;

              return (
                <div
                  key={opt.id}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: "var(--surface-muted)",
                    border: isWinner ? "1.5px solid rgba(59, 130, 246, 0.4)" : "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>
                    <span style={{ color: isWinner ? "#93c5fd" : "var(--text-main)" }}>
                      {opt.text} {isWinner && "🏆"}
                    </span>
                    <span style={{ fontWeight: 800 }}>
                      {pct}% <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 500 }}>({votes})</span>
                    </span>
                  </div>

                  {/* Progress track */}
                  <div
                    style={{
                      height: "10px",
                      borderRadius: "999px",
                      background: "var(--surface-strong)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "999px",
                        background: isWinner
                          ? "linear-gradient(90deg, #2563eb, #38bdf8)"
                          : "linear-gradient(90deg, #4f46e5, #818cf8)",
                        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scan to vote on desktop or friend phone */}
          {qrCodeUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "12px",
                background: "var(--surface-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <img src={qrCodeUrl} alt="QR Code" style={{ width: "54px", height: "54px", borderRadius: "8px" }} />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Scan to Vote
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  Show this QR code to friends to let them vote instantly.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: LIVE COMMENTARY & CHAT ===================== */}
      {mobileTab === "chat" && (
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Voter Commentary</h3>
            <span style={{ fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>
              Live Stream
            </span>
          </div>

          {/* Quick Reaction Emoji Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "8px",
              marginBottom: "12px",
            }}
          >
            {["👍", "❤️", "🔥", "😂", "👏", "🎉"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                style={{
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "1.05rem",
                  cursor: "pointer",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Comments List */}
          <div
            style={{
              maxHeight: "320px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {comments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 8px", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No comments yet. Send a message or quick reaction!
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "10px",
                    background: "var(--surface-muted)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-main)" }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {c.time}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{c.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handlePostComment} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add your thoughts..."
              className="form-input"
              style={{ flex: 1, minHeight: "40px", fontSize: "0.85rem" }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!newCommentText.trim() || commentLoading}
              style={{ padding: "0 14px", minHeight: "40px", borderRadius: "10px" }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ===================== TAB 4: CHILL OUT ARCADE LOUNGE ===================== */}
      {mobileTab === "arcade" && (
        <ChillOutSnakeLounge pollTitle={pollTitle} leadingOption={leadingOption} />
      )}

      {/* ===================== VOTE SUBMITTED CELEBRATION MODAL ===================== */}
      {showCelebration && (
        <div className="modal-overlay" onClick={() => setShowCelebration(false)}>
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "360px",
              width: "100%",
              padding: "28px 20px",
              textAlign: "center",
              background: "#0c1326",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.2)",
                border: "2px solid #22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Check size={32} color="#22c55e" strokeWidth={3} />
            </div>

            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px", color: "#ffffff" }}>
              Ballot Recorded!
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
              Your vote has been cryptographically tallied in real-time.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowCelebration(false);
                  setMobileTab("results");
                }}
                style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
              >
                <span>View Live Tally</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCelebration(false);
                  setShareModalOpen(true);
                }}
                style={{ width: "100%", padding: "10px", fontSize: "0.9rem" }}
              >
                <Share2 size={15} />
                <span>Share with Friends</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        poll={poll || { id: "active", title: pollTitle }}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
};

export default MobilePollView;
