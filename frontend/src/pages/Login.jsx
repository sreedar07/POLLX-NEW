import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, ShieldCheck, AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Mail, RefreshCw, CheckCircle2 } from "lucide-react";

export const Login = ({ navigate }) => {
  const { login, verifyOTP, resendOTP } = useAuth();
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleCredentialsSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const resp = await login(email, password);

      // Direct login (e.g. administrator bypass)
      if (resp?.token) {
        if (resp.user?.role === "admin") {
          navigate("admin");
        } else {
          navigate("poll");
        }
        return;
      }

      // 2-Step Verification required
      if (resp?.requires_2fa) {
        setStep("otp");
        if (resp.verification_code) {
          setDevOtpPreview(resp.verification_code);
          setOtpCode(resp.verification_code);
        }
        setInfoMessage(resp.message || "A 6-digit OTP code has been sent to your email ID.");
        setResendTimer(30);
      }
    } catch (err) {
      if (err.unverified || (err.message && err.message.toLowerCase().includes("not activated"))) {
        setStep("otp");
        setInfoMessage("Please enter the 6-digit verification code sent to your email to verify and activate your account.");
        setResendTimer(30);
      } else {
        setError(err.message || "Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const user = await verifyOTP(email, otpCode);
      if (user.role === "admin") {
        navigate("admin");
      } else {
        navigate("poll");
      }
    } catch (err) {
      setError(err.message || "Invalid or expired OTP. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError("");
    setInfoMessage("");
    try {
      const res = await resendOTP(email);
      setResendTimer(30);
      setInfoMessage(res.message || "A new 6-digit OTP has been sent to your email ID.");
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    }
  };

  return (
    <div style={{ maxWidth: "460px", margin: "40px auto", padding: "0 16px" }}>
      <div className="glass-card" style={{ padding: "36px 28px" }}>
        {/* Header Icon */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: step === "otp"
              ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
              : "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
            boxShadow: "0 0 24px rgba(59, 130, 246, 0.35)",
          }}>
            {step === "otp" ? (
              <KeyRound size={28} color="#ffffff" />
            ) : (
              <Shield size={28} color="#ffffff" />
            )}
          </div>
          
          <h2 style={{ fontSize: "1.65rem", fontWeight: 800, margin: "0 0 6px" }}>
            {step === "otp" ? "2-Step Verification" : "Sign In to PollX"}
          </h2>
          
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0, lineHeight: 1.5 }}>
            {step === "otp" ? (
              <span>
                Enter the 6-digit verification code (OTP) sent to:<br />
                <strong style={{ color: "#38bdf8" }}>{email}</strong>
              </span>
            ) : (
              "Sign in with your email and password to vote, verify ballots, or view live elections."
            )}
          </p>
        </div>

        {/* Informational Message */}
        {infoMessage && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px",
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "#93c5fd",
            fontSize: "0.85rem",
            marginBottom: "18px",
          }}>
            <Mail size={16} color="#38bdf8" flexShrink={0} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "#f87171",
            fontSize: "0.85rem",
            marginBottom: "18px",
          }}>
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        {/* ===================== STEP 1: EMAIL & PASSWORD ===================== */}
        {step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} autoComplete="off">
            <div style={{ marginBottom: "18px" }}>
              <label className="form-label" style={{ fontSize: "0.88rem", fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.95rem" }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label className="form-label" style={{ fontSize: "0.88rem", fontWeight: 600 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: "44px", fontSize: "0.95rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontWeight: 700, fontSize: "1rem" }}
            >
              {loading ? "Authenticating..." : "Continue to 2-Step Verification →"}
            </button>
          </form>
        ) : (
          /* ===================== STEP 2: 2-STEP VERIFICATION (EMAIL OTP) ===================== */
          <form onSubmit={handleOtpSubmit} autoComplete="off">
            <div style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ fontSize: "0.88rem", fontWeight: 600, textAlign: "center", display: "block" }}>
                6-Digit Verification Code (OTP)
              </label>
              <input
                type="text"
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="form-input"
                style={{
                  fontSize: "1.8rem",
                  letterSpacing: "8px",
                  textAlign: "center",
                  fontWeight: 800,
                  height: "56px",
                  color: "#38bdf8",
                  borderColor: "rgba(56, 189, 248, 0.5)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontWeight: 700, fontSize: "1rem", marginBottom: "14px" }}
            >
              {loading ? "Verifying OTP..." : "Verify OTP & Complete Sign In"}
            </button>

            {/* Resend OTP & Back button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setError("");
                  setInfoMessage("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ArrowLeft size={14} />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                style={{
                  background: "transparent",
                  border: "none",
                  color: resendTimer > 0 ? "var(--text-dim)" : "var(--accent-primary)",
                  cursor: resendTimer > 0 ? "default" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <RefreshCw size={13} className={resendTimer > 0 ? "" : ""} />
                <span>{resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer links */}
        <div style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          New voter?{" "}
          <span
            onClick={() => navigate("register")}
            style={{ color: "var(--accent-secondary)", cursor: "pointer", fontWeight: 600 }}
          >
            Create Account
          </span>
        </div>

        <div style={{ textAlign: "center", marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
          <span
            onClick={() => navigate("poll")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Live Poll</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
