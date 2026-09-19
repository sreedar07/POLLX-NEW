import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePollWebSocket } from "../hooks/usePollWebSocket";
import { LiveResultsChart, getOptionTheme } from "../components/LiveResultsChart";
import { ShareModal } from "../components/ShareModal";
import { 
  CheckCircle2, 
  Share2, 
  Clock, 
  Users, 
  Send, 
  Smile, 
  Heart, 
  Eye, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Sparkles,
  QrCode,
  Check,
  ChevronDown,
  BarChart2
} from "lucide-react";

export const PollView = ({ pollId: propPollId, navigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [poll, setPoll] = useState(null);
  const [allPolls, setAllPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("vote"); // "vote" | "submitted" | "results"

  // Live commentary & quick reactions
  const [comments, setComments] = useState([
    { id: "c1", name: "Arjun", time: "2 min ago", text: "Python is the future! 🔥", likes: 12, liked: false },
    { id: "c2", name: "Roopa", time: "1 min ago", text: "JavaScript for web dev always!", likes: 8, liked: false },
    { id: "c3", name: "KGR", time: "1 min ago", text: "C++ is still the king 👑", likes: 15, liked: false },
    { id: "c4", name: "Varun", time: "50 sec ago", text: "I'm surprised Java still has votes ☕", likes: 6, liked: false },
    { id: "c5", name: "Nithya", time: "40 sec ago", text: "Let's go Python! 🐍 🐍", likes: 9, liked: false },
    { id: "c6", name: "Hari", time: "30 sec ago", text: "This poll is interesting 👍", likes: 4, liked: false },
    { id: "c7", name: "Sana", time: "20 sec ago", text: "Which one is best for AI?", likes: 3, liked: false },
    { id: "c8", name: "Praveen", time: "10 sec ago", text: "Python + AI = ❤️", likes: 11, liked: false },
    { id: "c9", name: "Anonymous", time: "just now", text: "Other option also deserves love!", likes: 2, liked: false },
  ]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // QR Code for Scan to Vote
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Countdown timer: 2 Days, 5 Hours, 32 Minutes, 18 Seconds
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 5,
    minutes: 32,
    seconds: 18,
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
  const { isConnected, liveUpdate } = usePollWebSocket(activePollId);

  // Countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      .catch((err) => console.error(err));
  }, [poll]);

  const fetchActivePoll = async (targetId = propPollId, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const fp = getFingerprint();
      const endpoint = targetId ? `/api/polls/${targetId}?fingerprint=${fp}` : `/api/polls/active?fingerprint=${fp}`;
      const data = await api.get(endpoint);
      setPoll(data.poll);
      setHasVoted(data.has_voted);
      if (data.has_voted) {
        setViewMode("results");
      }
      setError("");

      if (data.poll?.id) {
        fetchBackendComments(data.poll.id);
      }
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to load active poll");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchBackendComments = async (id) => {
    try {
      const data = await api.get(`/api/polls/${id}/comments`);
      if (data && data.length > 0) {
        setComments((prev) => {
          const map = new Map();
          data.forEach(c => map.set(c.id, {
            id: c.id,
            name: c.author_name || "Voter",
            time: "recently",
            text: c.text,
            likes: Math.floor(Math.random() * 8) + 1,
            liked: false,
          }));
          prev.forEach(c => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn("Could not fetch backend comments:", e);
    }
  };

  useEffect(() => {
    fetchActivePoll(propPollId);
  }, [propPollId]);

  // WebSocket Live update
  useEffect(() => {
    if (liveUpdate && poll && (liveUpdate.poll_id === poll.id || !liveUpdate.poll_id)) {
      setPoll((prev) => {
        if (!prev) return prev;
        const updatedOptions = prev.options.map((opt) => ({
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

  const handleVoteSubmit = async () => {
    if (!selectedOption) {
      setError("Please select one option before submitting!");
      return;
    }
    setError("");
    setVoting(true);

    try {
      await api.post(`/api/polls/${poll.id}/vote`, {
        option_id: selectedOption,
        fingerprint: getFingerprint(),
        department: user?.department || "General Voter",
      });

      // Confetti celebratory burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#6366f1", "#22c55e", "#f59e0b", "#ec4899"],
      });

      setHasVoted(true);
      setViewMode("submitted");
      fetchActivePoll(poll.id, true);
    } catch (err) {
      setError(err.message || "Failed to submit ballot");
    } finally {
      setVoting(false);
    }
  };

  const handlePostComment = async (e) => {
    e?.preventDefault();
    if (!newCommentText.trim()) return;

    const author = user?.full_name || user?.username || "You";
    const newEntry = {
      id: "c_" + Date.now(),
      name: author,
      time: "just now",
      text: newCommentText.trim(),
      likes: 1,
      liked: true,
    };

    setComments(prev => [newEntry, ...prev]);
    setNewCommentText("");

    if (poll?.id) {
      try {
        await api.post(`/api/polls/${poll.id}/comments`, {
          text: newCommentText.trim(),
        });
      } catch (err) {
        console.warn("Backend comment sync skipped:", err);
      }
    }
  };

  const handleQuickReaction = (emoji) => {
    const author = user?.full_name || user?.username || "You";
    const reactionEntry = {
      id: "r_" + Date.now(),
      name: author,
      time: "just now",
      text: `${emoji} reaction sent!`,
      likes: 1,
      liked: true,
    };
    setComments(prev => [reactionEntry, ...prev]);
  };

  const toggleLike = (commentId) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          likes: c.liked ? c.likes - 1 : c.likes + 1,
          liked: !c.liked,
        };
      }
      return c;
    }));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "1.1rem",
      }}>
        Loading election details...
      </div>
    );
  }

  // Fallback options if none in DB
  const defaultOptions = [
    { id: "opt-py", text: "Python", votes: 504 },
    { id: "opt-js", text: "JavaScript", votes: 336 },
    { id: "opt-java", text: "Java", votes: 180 },
    { id: "opt-cpp", text: "C++", votes: 120 },
    { id: "opt-other", text: "Other", votes: 60 },
  ];

  const currentOptions = (poll?.options && poll.options.length > 0) ? poll.options : defaultOptions;
  const pollTitle = poll?.title || "Which programming language do you like the most?";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Top Banner Navigation: Category Badge or Live Results Toggle */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {viewMode === "results" ? (
            <div className="pulse-badge live-green">
              <span className="pulse-dot green" />
              <span>Live &bull; 2,340 watching</span>
            </div>
          ) : (
            <span className="category-pill tech">
              Technology
            </span>
          )}

          {/* Quick toggle between Vote and Results */}
          <div style={{
            display: "flex",
            background: "var(--surface-muted)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "999px",
            padding: "2px",
          }}>
            <button
              onClick={() => setViewMode("vote")}
              style={{
                border: "none",
                background: viewMode === "vote" ? "#3b82f6" : "transparent",
                color: viewMode === "vote" ? "#fff" : "var(--text-muted)",
                borderRadius: "999px",
                padding: "4px 14px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Voting Page
            </button>
            <button
              onClick={() => setViewMode("results")}
              style={{
                border: "none",
                background: viewMode === "results" ? "#3b82f6" : "transparent",
                color: viewMode === "results" ? "#fff" : "var(--text-muted)",
                borderRadius: "999px",
                padding: "4px 14px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Results Page
            </button>
          </div>
        </div>

        {/* Countdown Timer top right (if in results view) */}
        {viewMode === "results" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 600 }}>
              &bull; Poll ends in
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <div className="countdown-box"><span className="val">{timeLeft.days}</span><span className="lbl">Days</span></div>
              <div className="countdown-box"><span className="val">{timeLeft.hours}</span><span className="lbl">Hours</span></div>
              <div className="countdown-box"><span className="val">{timeLeft.minutes}</span><span className="lbl">Minutes</span></div>
              <div className="countdown-box"><span className="val">{timeLeft.seconds}</span><span className="lbl">Seconds</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div 
        className="poll-columns-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Voting / Submitted / Results */}
        <div 
          className="glass-card"
          style={{
            padding: "32px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* ===================== VIEW 1: VOTE SUBMITTED CELEBRATION ===================== */}
          {viewMode === "submitted" ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}>
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.18)",
                border: "2px solid #22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(34, 197, 94, 0.4)",
              }}>
                <Check size={38} color="#22c55e" strokeWidth={3} />
              </div>

              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "8px 0 0" }}>
                Vote Submitted!
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "340px", margin: 0 }}>
                Thank you for making your voice count!
              </p>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
                maxWidth: "280px",
                marginTop: "16px",
              }}>
                <button
                  className="btn-primary"
                  onClick={() => setViewMode("results")}
                  style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
                >
                  <span>View Results</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => setShareModalOpen(true)}
                  style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
                >
                  <Share2 size={16} />
                  <span>Share This Poll</span>
                </button>
              </div>
            </div>
          ) : viewMode === "results" ? (
            /* ===================== VIEW 2: LIVE RESULTS ===================== */
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "8px" }}>
                {pollTitle}
              </h1>

              <LiveResultsChart
                options={currentOptions}
                totalVotes={poll?.total_votes || 1200}
                onShareClick={() => setShareModalOpen(true)}
                pollTitle={pollTitle}
                pollId={poll?.id}
              />
            </div>
          ) : (
            /* ===================== VIEW 3: VOTING INTERFACE ===================== */
            <div>
              <h1 style={{ fontSize: "1.65rem", fontWeight: 800, marginBottom: "6px" }}>
                {pollTitle}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "16px" }}>
                Choose one option that you love the most!
              </p>

              {/* Poll Metadata bar */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: "0.82rem",
                color: "var(--text-dim)",
                marginBottom: "24px",
                flexWrap: "wrap",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Eye size={14} /> 1.2K votes
                </span>
                <span>&bull;</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={14} /> Ends in 2 days
                </span>
                <span>&bull;</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={14} /> Created by Admin
                </span>
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "var(--error-bg)",
                  color: "var(--error-text)",
                  border: "1px solid var(--error-border)",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                }}>
                  {error}
                </div>
              )}

              {/* Options List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                {currentOptions.map((opt, idx) => {
                  const theme = getOptionTheme(opt.text, idx);
                  const isSelected = selectedOption === opt.id || selectedOption === opt.text;

                  return (
                    <div
                      key={opt.id || opt.text}
                      className={`option-row ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedOption(opt.id || opt.text)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Custom Radio Button */}
                        <div style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: isSelected ? "5px solid #3b82f6" : "2px solid var(--border-strong)",
                          background: "var(--bg-card)",
                          transition: "all 0.18s ease",
                          flexShrink: 0,
                        }} />

                        {/* Language icon badge */}
                        <span style={{ fontSize: "1.2rem" }}>
                          {theme.icon}
                        </span>

                        {/* Option label */}
                        <span style={{
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: "0.98rem",
                          color: "var(--text-main)",
                        }}>
                          {opt.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Vote Button */}
              <button
                className="btn-primary"
                onClick={handleVoteSubmit}
                disabled={voting || !selectedOption}
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  marginBottom: "14px",
                }}
              >
                <span>{voting ? "Submitting Ballot..." : "Submit Vote"}</span>
                <ArrowRight size={18} />
              </button>

              {/* Privacy sub-tags */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                fontSize: "0.8rem",
                color: "var(--text-dim)",
                marginBottom: "28px",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <ShieldCheck size={14} color="#22c55e" />
                  No account required
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Lock size={14} color="#3b82f6" />
                  Your vote is anonymous
                </span>
              </div>

              {/* Bottom Split Widgets: Scan to Vote + Countdown */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                paddingTop: "20px",
                borderTop: "1px solid var(--border-subtle)",
              }}>
                {/* Scan to Vote */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "var(--surface-muted)",
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-subtle)",
                }}>
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      style={{ width: "64px", height: "64px", borderRadius: "8px" }}
                    />
                  ) : (
                    <div style={{ width: "64px", height: "64px", background: "var(--surface-strong)", borderRadius: "8px" }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>
                      Scan to Vote
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.3, marginTop: "2px" }}>
                      Open this poll on your phone
                    </div>
                  </div>
                </div>

                {/* Poll Ends In Countdown */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  background: "var(--surface-muted)",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-subtle)",
                }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: "6px" }}>
                    Poll ends in
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <div className="countdown-box" style={{ minWidth: "42px", padding: "4px" }}>
                      <span className="val" style={{ fontSize: "1rem" }}>{timeLeft.days}</span>
                      <span className="lbl">Days</span>
                    </div>
                    <div className="countdown-box" style={{ minWidth: "42px", padding: "4px" }}>
                      <span className="val" style={{ fontSize: "1rem" }}>{timeLeft.hours}</span>
                      <span className="lbl">Hours</span>
                    </div>
                    <div className="countdown-box" style={{ minWidth: "42px", padding: "4px" }}>
                      <span className="val" style={{ fontSize: "1rem" }}>{timeLeft.minutes}</span>
                      <span className="lbl">Min</span>
                    </div>
                    <div className="countdown-box" style={{ minWidth: "42px", padding: "4px" }}>
                      <span className="val" style={{ fontSize: "1rem" }}>{timeLeft.seconds}</span>
                      <span className="lbl">Sec</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Commentary Section */}
        <div 
          className="glass-card"
          style={{
            padding: "24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-strong)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "720px",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                width: "4px",
                height: "18px",
                borderRadius: "2px",
                background: "#3b82f6",
              }} />
              <h3 style={{ fontSize: "1.08rem", fontWeight: 800, margin: 0 }}>
                Live Commentary
              </h3>
            </div>
            <span style={{
              fontSize: "0.78rem",
              color: "#4ade80",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
              128 watching
            </span>
          </div>

          {/* Comments Stream */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingRight: "6px",
            marginBottom: "14px",
          }}>
            {comments.map((c) => (
              <div
                key={c.id}
                className="comment-bubble"
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "10px",
                  padding: "10px 12px",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>

                {/* Comment details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      {c.time}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                    {c.text}
                  </div>
                </div>

                {/* Heart like button */}
                <button
                  onClick={() => toggleLike(c.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: c.liked ? "#ef4444" : "var(--text-dim)",
                    fontSize: "0.78rem",
                    padding: "2px",
                  }}
                >
                  <Heart size={14} fill={c.liked ? "#ef4444" : "transparent"} />
                  <span>{c.likes}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Quick Reactions Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>
              Quick Reactions:
            </span>
            <div className="quick-reactions-bar">
              {["👍", "❤️", "😂", "😮", "🍕", "👏"].map((emoji) => (
                <button
                  key={emoji}
                  className="reaction-btn"
                  onClick={() => handleQuickReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Input */}
          <form onSubmit={handlePostComment} style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="form-input"
                style={{
                  paddingRight: "36px",
                  minHeight: "42px",
                  fontSize: "0.88rem",
                }}
              />
              <button
                type="button"
                onClick={() => setNewCommentText((prev) => prev + " 🔥")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                <Smile size={18} />
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={!newCommentText.trim() || commentLoading}
              style={{
                padding: "0 16px",
                minHeight: "42px",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Share Anywhere Modal */}
      <ShareModal
        poll={poll || { id: "active", title: pollTitle }}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
};
