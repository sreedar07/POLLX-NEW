import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, QrCode, Share2 } from "lucide-react";

// Clean custom SVG icons for social platforms
const WhatsAppIcon = ({ size = 18, color = "#22c55e" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

const TwitterIcon = ({ size = 18, color = "#38bdf8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = ({ size = 18, color = "#0284c7" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const FacebookIcon = ({ size = 18, color = "#2563eb" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

export const ShareModal = ({ poll, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showQR, setShowQR] = useState(false);

  const pollUrl = `${window.location.origin}/#poll${poll?.id ? `-${poll.id}` : ""}`;
  const pollTitle = poll?.title || "Check out this live poll on PollX!";

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(pollUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, pollUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pollUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${pollTitle}\n${pollUrl}`)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(pollTitle)}&url=${encodeURIComponent(pollUrl)}`, "_blank");
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pollUrl)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pollUrl)}`, "_blank");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "28px",
          position: "relative",
          borderRadius: "24px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "var(--surface-muted)",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "4px" }}>
          Share Anywhere
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
          Engage your audience with real-time voting.
        </p>

        {/* 6 Grid items: Copy Link, QR Code, WhatsApp, Twitter, LinkedIn, Facebook */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "20px",
        }}>
          {/* Copy Link */}
          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-strong)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-subtle)"}
          >
            {copied ? <Check size={18} color="#22c55e" /> : <Copy size={18} color="#3b82f6" />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          {/* QR Code */}
          <button
            onClick={() => setShowQR(!showQR)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: showQR ? "rgba(59, 130, 246, 0.15)" : "var(--surface-muted)",
              border: showQR ? "1px solid #3b82f6" : "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <QrCode size={18} color="#8b5cf6" />
            <span>QR Code</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={shareWhatsApp}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <WhatsAppIcon size={18} color="#22c55e" />
            <span>WhatsApp</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={shareTwitter}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <TwitterIcon size={18} color="#38bdf8" />
            <span>Twitter</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={shareLinkedIn}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <LinkedInIcon size={18} color="#0284c7" />
            <span>LinkedIn</span>
          </button>

          {/* Facebook */}
          <button
            onClick={shareFacebook}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <FacebookIcon size={18} color="#2563eb" />
            <span>Facebook</span>
          </button>
        </div>

        {/* Expandable QR Display */}
        {showQR && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px",
            background: "var(--surface-strong)",
            borderRadius: "16px",
            marginBottom: "16px",
            border: "1px solid var(--border-subtle)",
          }}>
            {qrDataUrl && (
              <img 
                src={qrDataUrl} 
                alt="Poll QR Code" 
                style={{ borderRadius: "10px", width: "160px", height: "160px" }} 
              />
            )}
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "8px" }}>
              Scan to open poll on your smartphone
            </span>
          </div>
        )}

        {/* Copy Link Input Bar */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            readOnly
            value={pollUrl}
            className="form-input"
            style={{ fontSize: "0.85rem", background: "var(--surface-muted)" }}
          />
          <button
            className="btn-primary"
            onClick={handleCopy}
            style={{ whiteSpace: "nowrap", padding: "8px 18px" }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
