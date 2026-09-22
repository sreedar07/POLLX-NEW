import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Gamepad2, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Zap,
  Flame,
  Volume2,
  VolumeX
} from "lucide-react";

export const ChillOutSnakeLounge = ({ pollTitle, leadingOption }) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("pollx_snake_high") || "420", 10);
  });
  const [speedLevel, setSpeedLevel] = useState("normal"); // "chill" (140ms) | "normal" (100ms) | "turbo" (70ms)

  const gameState = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    direction: { x: 0, y: -1 },
    nextDirection: { x: 0, y: -1 },
    food: { x: 5, y: 5 },
    tileCount: 18,
  });

  const getSpeedMs = () => {
    if (speedLevel === "chill") return 130;
    if (speedLevel === "turbo") return 65;
    return 95;
  };

  const generateFood = () => {
    const { tileCount, snake } = gameState.current;
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      const onSnake = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  };

  const startGame = () => {
    gameState.current.snake = [
      { x: 9, y: 9 },
      { x: 9, y: 10 },
      { x: 9, y: 11 },
    ];
    gameState.current.direction = { x: 0, y: -1 };
    gameState.current.nextDirection = { x: 0, y: -1 };
    gameState.current.food = generateFood();
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const changeDirection = (dir) => {
    const { direction } = gameState.current;
    if (dir === "up" && direction.y === 0) gameState.current.nextDirection = { x: 0, y: -1 };
    if (dir === "down" && direction.y === 0) gameState.current.nextDirection = { x: 0, y: 1 };
    if (dir === "left" && direction.x === 0) gameState.current.nextDirection = { x: -1, y: 0 };
    if (dir === "right" && direction.x === 0) gameState.current.nextDirection = { x: 1, y: 0 };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent scrolling when using arrow keys inside game
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        if (isPlaying) e.preventDefault();
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") changeDirection("up");
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") changeDirection("down");
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") changeDirection("left");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") changeDirection("right");
      if (e.code === "Space" && !isPlaying) startGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

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

      // Food check
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => {
          const next = prev + 15;
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

      // Canvas Render
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const size = canvas.width / tileCount;

      // Deep arcade background
      ctx.fillStyle = "#070c18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle cyber grid
      ctx.strokeStyle = "rgba(59, 130, 246, 0.07)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size, 0);
        ctx.lineTo(i * size, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * size);
        ctx.lineTo(canvas.width, i * size);
        ctx.stroke();
      }

      // Glowing Food Target
      ctx.fillStyle = "#f43f5e";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake Body
      snake.forEach((seg, idx) => {
        if (idx === 0) {
          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = idx % 2 === 0 ? "#2563eb" : "#1d4ed8";
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.roundRect(seg.x * size + 1.5, seg.y * size + 1.5, size - 3, size - 3, 4);
        ctx.fill();
      });

    }, getSpeedMs());

    return () => clearInterval(interval);
  }, [isPlaying, speedLevel, highScore]);

  // Initial canvas paint when idle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isPlaying) return;
    const ctx = canvas.getContext("2d");
    const { tileCount, snake, food } = gameState.current;
    const size = canvas.width / tileCount;

    ctx.fillStyle = "#070c18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
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
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#38bdf8" : "#2563eb";
      ctx.beginPath();
      ctx.roundRect(seg.x * size + 1.5, seg.y * size + 1.5, size - 3, size - 3, 4);
      ctx.fill();
    });
  }, [isPlaying, isGameOver]);

  return (
    <div className="chill-out-lounge" id="chill-out-section">
      {/* Header Banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "28px",
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px rgba(6, 182, 212, 0.5)",
          }}>
            <Gamepad2 size={28} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                Chill Out Arcade
              </h2>
              <span style={{
                fontSize: "0.75rem",
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#4ade80",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                fontWeight: 700,
              }}>
                Interactive
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "4px 0 0" }}>
              You've voted! Take a break and chill out with retro Snake while votes roll in.
            </p>
          </div>
        </div>

        {/* Live Poll Ticker while playing */}
        {leadingOption && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "0.85rem",
            color: "#93c5fd",
          }}>
            <Sparkles size={16} color="#38bdf8" />
            <span>Leading: <strong>{leadingOption.text}</strong> ({leadingOption.percentage}%)</span>
          </div>
        )}
      </div>

      {/* Main Arcade Frame */}
      <div 
        className="snake-arcade-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "28px",
          alignItems: "center",
        }}
      >
        {/* Left: Interactive Canvas Screen */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <div 
            className="arcade-screen-frame" 
            style={{ 
              position: "relative", 
              width: "100%",
              maxWidth: "360px", 
              aspectRatio: "1/1",
            }}
          >
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              style={{ display: "block", borderRadius: "14px", width: "100%", height: "100%" }}
            />

            {/* Overlay when game not playing */}
            {!isPlaying && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(7, 12, 24, 0.85)",
                backdropFilter: "blur(6px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                textAlign: "center",
              }}>
                {isGameOver ? (
                  <>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f43f5e", marginBottom: "6px" }}>
                      GAME OVER
                    </div>
                    <div style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "18px" }}>
                      Final Score: <strong>{score}</strong>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={startGame}
                      style={{ padding: "12px 28px", fontSize: "1rem" }}
                    >
                      <RotateCcw size={18} />
                      <span>Play Again</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
                      Retro Snake
                    </div>
                    <p style={{ fontSize: "0.88rem", color: "#94a3b8", maxWidth: "240px", marginBottom: "20px" }}>
                      Use Arrow Keys or WASD to navigate and collect glowing targets!
                    </p>
                    <button
                      className="btn-primary"
                      onClick={startGame}
                      style={{ padding: "12px 32px", fontSize: "1.05rem" }}
                    >
                      <Play size={20} />
                      <span>Start Game</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* On-screen Touch D-Pad for Mobile & Easy Controls */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 48px)",
            gridTemplateRows: "repeat(2, 44px)",
            gap: "6px",
            marginTop: "20px",
            justifyContent: "center",
          }}>
            <div />
            <button
              className="btn-secondary"
              onClick={() => changeDirection("up")}
              style={{ padding: 0, borderRadius: "10px" }}
              title="Up"
            >
              <ArrowUp size={20} />
            </button>
            <div />

            <button
              className="btn-secondary"
              onClick={() => changeDirection("left")}
              style={{ padding: 0, borderRadius: "10px" }}
              title="Left"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => changeDirection("down")}
              style={{ padding: 0, borderRadius: "10px" }}
              title="Down"
            >
              <ArrowDown size={20} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => changeDirection("right")}
              style={{ padding: 0, borderRadius: "10px" }}
              title="Right"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Right: Scoreboards, Speed controls & Leaderboard */}
        <div>
          {/* Stats Bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "24px",
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "18px 22px",
            }}>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>CURRENT SCORE</div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                {score}
              </div>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "18px 22px",
            }}>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <Trophy size={14} color="#f59e0b" />
                <span>HIGH SCORE</span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fbbf24", marginTop: "2px" }}>
                {highScore}
              </div>
            </div>
          </div>

          {/* Speed Selector */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600, marginBottom: "10px" }}>
              DIFFICULTY SPEED:
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {[
                { id: "chill", label: "Chill" },
                { id: "normal", label: "Normal" },
                { id: "turbo", label: "Turbo ⚡" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpeedLevel(s.id)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "12px",
                    background: speedLevel === s.id ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.04)",
                    border: speedLevel === s.id ? "1.5px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: speedLevel === s.id ? "#ffffff" : "#94a3b8",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Arcade Leaderboard */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "18px",
            padding: "20px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#ffffff",
            }}>
              <span>Voter High Scores</span>
              <span style={{ color: "#38bdf8" }}>Live Leaderboard</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { rank: 1, name: "Sreedar (Admin)", score: 580, badge: "🥇" },
                { rank: 2, name: "Arjun_Dev", score: 520, badge: "🥈" },
                { rank: 3, name: "Roopa_Voter", score: 460, badge: "🥉" },
                { rank: 4, name: "You", score: highScore, badge: "⭐" },
              ].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: p.name === "You" ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.02)",
                    border: p.name === "You" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent",
                    fontSize: "0.88rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{p.badge}</span>
                    <span style={{ fontWeight: p.name === "You" ? 700 : 500, color: "#ffffff" }}>
                      {p.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, color: "#38bdf8" }}>
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChillOutSnakeLounge;
