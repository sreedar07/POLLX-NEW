import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { UserPlus, AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowRight, RefreshCw } from "lucide-react";

export const Register = ({ navigate }) => {
  const { register, verifyEmail, resendCode } = useAuth();
  
  // Registration form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification step state
  const [step, setStep] = useState("form"); // "form" or "verify"
  const [verificationCode, setVerificationCode] = useState("");
  const [simulatedCode, setSimulatedCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Password strength calculations
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const strengthScore = [hasLength, hasUpper, hasLower, hasDigitOrSpecial].filter(Boolean).length;
  const strengthColors = ["#ef4444", "#b45309", "#b45309", "#22c55e"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!hasLength || !hasUpper || !hasLower || !hasDigitOrSpecial) {
      setError("Please ensure your password meets all strength requirements (min 8 chars, uppercase, lowercase, and number/symbol).");
      return;
    }

    setLoading(true);
    try {
      const resp = await register({
        full_name: fullName,
        username: fullName,
        email,
        password,
        department,
        bio
      });

      if (resp.verification_code) {
        setSimulatedCode(resp.verification_code);
        setVerificationCode(resp.verification_code);
      }
      setStep("verify");
    } catch (err) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setVerifyLoading(true);

    try {
      await verifyEmail(email, verificationCode);
      setVerifySuccess(true);
      setTimeout(() => {
        navigate("poll");
      }, 1500);
    } catch (err) {
      setError(err.message || "Invalid verification code. Please check and try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await resendCode(email);
      if (res.verification_code) {
        setSimulatedCode(res.verification_code);
        setVerificationCode(res.verification_code);
      }
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "50px auto", padding: "0 16px" }}>
      <div className="glass-card" style={{ padding: "36px" }}>
        
        {step === "form" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
                boxShadow: "0 0 15px rgba(26, 54, 93, 0.16)"
              }}>
                <UserPlus size={26} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Voter Registration</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
                Create your verified voter account to cast ballots and receive cryptographic receipts.
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
              {/* Full Name */}
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swetha Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="voter@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Password with Strength Meter */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label className="form-label">Password *</label>
                  {password && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: strengthColors[strengthScore - 1] || "#94a3b8" }}>
                      {strengthLabels[strengthScore - 1] || "Too Weak"}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 chars (mixed case & numbers)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
                
                {/* Visual Strength Bar */}
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(strengthScore / 4) * 100}%`,
                      backgroundColor: strengthColors[strengthScore - 1] || "#94a3b8",
                    }}
                  />
                </div>

                {/* Password Criteria Checklist */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "10px", fontSize: "0.75rem" }}>
                  <span style={{ color: hasLength ? "#16a34a" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {hasLength ? "✓" : "○"} At least 8 characters
                  </span>
                  <span style={{ color: hasUpper ? "#16a34a" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {hasUpper ? "✓" : "○"} Uppercase letter
                  </span>
                  <span style={{ color: hasLower ? "#16a34a" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {hasLower ? "✓" : "○"} Lowercase letter
                  </span>
                  <span style={{ color: hasDigitOrSpecial ? "#16a34a" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                    {hasDigitOrSpecial ? "✓" : "○"} Number or symbol
                  </span>
                </div>
              </div>

              {/* Optional Demographic: Department / Organization */}
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Department / Demographic (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Sales, Community, Region"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Optional Bio */}
              <div style={{ marginBottom: "24px" }}>
                <label className="form-label">Short Bio / Voter Statement (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief statement or interest..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="form-input"
                  style={{ resize: "vertical" }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "1rem" }}
              >
                {loading ? "Registering Voter..." : "Continue to Email Confirmation →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Already registered?{" "}
              <span
                onClick={() => navigate("login")}
                style={{ color: "var(--accent-secondary)", cursor: "pointer", fontWeight: 600 }}
              >
                Sign In
              </span>
            </p>
          </>
        ) : (
          /* Step 2: Verification Screen */
          <div>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "12px",
                background: "rgba(21, 128, 61, 0.08)",
                border: "1px solid rgba(21, 128, 61, 0.14)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}>
                <Mail size={26} color="#15803d" />
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Confirm Your Email</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
                We sent a 6-digit activation code to <strong>{email}</strong>.
              </p>
            </div>

            {/* Local Simulator Helper */}
            {simulatedCode && (
              <div style={{
                padding: "12px 16px",
                background: "rgba(26, 54, 93, 0.07)",
                border: "1px dashed rgba(26, 54, 93, 0.16)",
                borderRadius: "var(--radius-md)",
                marginBottom: "20px",
                fontSize: "0.85rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#1a365d", fontWeight: 600 }}>Demo / Local Email Simulator</span>
                  <span className="badge-chip" style={{ fontSize: "0.7rem" }}>Instant Code</span>
                </div>
                <div style={{ marginTop: "6px", fontSize: "1.2rem", fontWeight: 800, letterSpacing: "4px", color: "#0f766e", fontFamily: "monospace" }}>
                  {simulatedCode}
                </div>
              </div>
            )}

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

            {verifySuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle2 size={48} color="#15803d" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#16a34a" }}>Account Activated!</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>
                  Awarded badge: <strong>Verified Citizen 🛡️</strong>. Redirecting to election...
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: "20px" }}>
                  <label className="form-label">6-Digit Activation Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="form-input"
                    style={{ textAlign: "center", fontSize: "1.4rem", letterSpacing: "6px", fontWeight: 700, fontFamily: "monospace" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading || verificationCode.length < 6}
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "1rem" }}
                >
                  {verifyLoading ? "Verifying..." : "Confirm & Activate Account"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    style={{ background: "none", color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "underline" }}
                  >
                    ← Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    style={{ background: "none", color: "var(--accent-secondary)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <RefreshCw size={12} /> Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
