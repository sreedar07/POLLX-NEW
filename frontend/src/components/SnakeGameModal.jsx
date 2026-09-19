import React, { useState, useEffect, useRef } from "react";
import { X, Play, RotateCcw, Trophy, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

export const SnakeGameModal = ({ isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("pollx_snake_high") || "560", 10);
  });
  const [leaderboardTab, setLeaderboardTab] = useState("today");

  const gameState = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    direction: { x: 0, y: -1 },
    nextDirection: { x: 0, y: -1 },
    food: { x: 5, y: 5 },
    gridSize: 20,
    tileCount: 16,
    speed: 120,
  });

  const generateFood = () => {
    const { tileCount, snake } = gameState.current;
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      // Don't spawn on snake
      const onSnake = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  };

  const resetGame = () => {
    gameState.current.snake = [
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 },
    ];
    gameState.current.direction = { x: 0, y: -1 };
    gameState.current.nextDirection = { x: 0, y: -1 };
    gameState.current.food = generateFood();
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }

    const handleKeyDown = (e) => {
      const { direction } = gameState.current;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (direction.y === 0) gameState.current.nextDirection = { x: 0, y: -1 };
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        if (direction.y === 0) gameState.current.nextDirection = { x: 0, y: 1 };
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (direction.x === 0) gameState.current.nextDirection = { x: -1, y: 0 };
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (direction.x === 0) gameState.current.nextDirection = { x: 1, y: 0 };
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const { snake, nextDirection, food, tileCount } = gameState.current;
      gameState.current.direction = nextDirection;

      const head = { ...snake[0] };
      head.x += nextDirection.x;
      head.y += nextDirection.y;

      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        setIsGameOver(true);
        setIsPlaying(false);
        return;
      }

      // Self collision
      if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        setIsGameOver(true);
        setIsPlaying(false);
        return;
      }

      snake.unshift(head);

      // Check food
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => {
          const next = prev + 20;
          if (next > highScore) {
            setHighScore(next);
            localStorage.setItem("pollx_snake_high", next.toString());
          }
          return next;
        });
        gameState.current.food = generateFood();
      } else {
        snake.pop();
      }

      // Draw
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const size = canvas.width / tileCount;

      // Background grid
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size, 0);
        ctx.lineTo(i * size, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * size);
        ctx.lineTo(canvas.width, i * size);
        ctx.stroke();
      }

      // Food (glowing red apple)
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake body (emerald green blocks)
      snake.forEach((seg, idx) => {
        ctx.fillStyle = idx === 0 ? "#22c55e" : "#16a34a";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = idx === 0 ? 8 : 0;
        ctx.beginPath();
        ctx.roundRect(seg.x * size + 1.5, seg.y * size + 1.5, size - 3, size - 3, 4);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }, gameState.current.speed);

    return () => clearInterval(interval);
  }, [isPlaying, highScore]);

  // Initial canvas draw
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { tileCount, snake, food } = gameState.current;
    const size = canvas.width / tileCount;

    ctx.fillStyle = "#0c1322";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    for (let i = 0; i < tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * size);
      ctx.lineTo(canvas.width, i * size);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#22c55e" : "#16a34a";
      ctx.beginPath();
      ctx.roundRect(seg.x * size + 1.5, seg.y * size + 1.5, size - 3, size - 3, 4);
      ctx.fill();
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const leaderboardData = {
    today: [
      { rank: 1, name: "SnakeKing", score: 1240, badge: "🥇" },
      { rank: 2, name: "PixelPro", score: 980, badge: "🥈" },
      { rank: 3, name: "GameMaster", score: 820, badge: "🥉" },
      { rank: 4, name: "CodeNinja", score: 560, badge: "4" },
      { rank: 5, name: "You", score: Math.max(score, 120), badge: "5", isUser: true },
    ],
    week: [
      { rank: 1, name: "VortexDev", score: 2450, badge: "🥇" },
      { rank: 2, name: "SnakeKing", score: 1980, badge: "🥈" },
      { rank: 3, name: "NeonByte", score: 1420, badge: "🥉" },
      { rank: 4, name: "PixelPro", score: 980, badge: "4" },
      { rank: 5, name: "You", score: Math.max(score, 120), badge: "5", isUser: true },
    ],
    allTime: [
      { rank: 1, name: "ArcadeGod", score: 4890, badge: "👑" },
      { rank: 2, name: "VortexDev", score: 3200, badge: "🥈" },
      { rank: 3, name: "SnakeKing", score: 2850, badge: "🥉" },
      { rank: 4, name: "ShadowVote", score: 2110, badge: "4" },
      { rank: 5, name: "You", score: Math.max(score, 120), badge: "5", isUser: true },
    ],
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "760px",
          width: "100%",
          padding: "28px",
          borderRadius: "24px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "var(--surface-muted)",
            border: "none",
            color: "var(--text-muted)",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        {/* Title Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(6, 182, 212, 0.4)",
          }}>
            <Gamepad2 size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "2px" }}>
              Snake Game
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Take a break and compete with others!
            </p>
          </div>
        </div>

        {/* Grid: Game canvas left + Leaderboard right */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          gap: "24px",
          alignItems: "start",
        }}>
          {/* Canvas column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid rgba(59, 130, 246, 0.3)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
            }}>
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                style={{ display: "block", background: "#0c1322" }}
              />

              {!isPlaying && !isGameOver && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(12, 19, 34, 0.8)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}>
                  <p style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                    Ready to Play?
                  </p>
                  <button className="btn-primary" onClick={resetGame}>
                    <Play size={16} />
                    <span>Start Game</span>
                  </button>
                </div>
              )}

              {isGameOver && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(12, 19, 34, 0.85)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}>
                  <span style={{ color: "#ef4444", fontWeight: 800, fontSize: "1.2rem" }}>
                    GAME OVER!
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Your Score: <strong style={{ color: "#ffffff" }}>{score}</strong>
                  </span>
                  <button className="btn-primary" onClick={resetGame}>
                    <RotateCcw size={16} />
                    <span>Play Again</span>
                  </button>
                </div>
              )}
            </div>

            {/* Controls hint */}
            <div style={{
              marginTop: "12px",
              fontSize: "0.75rem",
              color: "var(--text-dim)",
              textAlign: "center",
            }}>
              Use <strong>Arrow Keys</strong> or <strong>W, A, S, D</strong> to navigate
            </div>

            {/* Mobile Touch Arrows */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 36px)",
              gap: "4px",
              marginTop: "10px",
            }}>
              <div></div>
              <button
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => {
                  if (gameState.current.direction.y === 0) gameState.current.nextDirection = { x: 0, y: -1 };
                }}
              >
                <ArrowUp size={16} />
              </button>
              <div></div>
              <button
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => {
                  if (gameState.current.direction.x === 0) gameState.current.nextDirection = { x: -1, y: 0 };
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => {
                  if (gameState.current.direction.y === 0) gameState.current.nextDirection = { x: 0, y: 1 };
                }}
              >
                <ArrowDown size={16} />
              </button>
              <button
                style={{
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => {
                  if (gameState.current.direction.x === 0) gameState.current.nextDirection = { x: 1, y: 0 };
                }}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Score + Leaderboard */}
          <div style={{
            background: "var(--surface-muted)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            padding: "16px 20px",
          }}>
            {/* Score cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}>
              <div style={{
                background: "var(--bg-card)",
                borderRadius: "12px",
                padding: "10px 14px",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
                  Score
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#38bdf8" }}>
                  {score}
                </div>
              </div>

              <div style={{
                background: "var(--bg-card)",
                borderRadius: "12px",
                padding: "10px 14px",
                border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
                  High Score
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a855f7" }}>
                  {highScore}
                </div>
              </div>
            </div>

            {/* Leaderboard Header & Tabs */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Trophy size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Leaderboard</span>
              </div>

              {/* Tabs: Today, This Week, All Time */}
              <div style={{
                display: "flex",
                background: "var(--surface-strong)",
                padding: "2px",
                borderRadius: "8px",
                gap: "2px",
              }}>
                {[
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "allTime", label: "All Time" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setLeaderboardTab(t.id)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: "none",
                      background: leaderboardTab === t.id ? "#3b82f6" : "transparent",
                      color: leaderboardTab === t.id ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "30px 1fr 60px",
                fontSize: "0.75rem",
                color: "var(--text-dim)",
                fontWeight: 600,
                padding: "0 8px 4px",
                borderBottom: "1px solid var(--border-subtle)",
              }}>
                <span>#</span>
                <span>Player</span>
                <span style={{ textAlign: "right" }}>Score</span>
              </div>

              {leaderboardData[leaderboardTab].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "30px 1fr 60px",
                    alignItems: "center",
                    padding: "8px",
                    borderRadius: "8px",
                    background: p.isUser ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    border: p.isUser ? "1px solid rgba(59, 130, 246, 0.35)" : "1px solid transparent",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{p.badge}</span>
                  <span style={{
                    fontWeight: p.isUser ? 700 : 500,
                    color: p.isUser ? "#60a5fa" : "var(--text-main)",
                  }}>
                    {p.name} {p.isUser && "(You)"}
                  </span>
                  <span style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}>
                    {p.score}
                  </span>
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={resetGame}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "10px",
                fontSize: "0.9rem",
              }}
            >
              <Play size={16} />
              <span>{isPlaying ? "Restart Game" : "Start Game"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
