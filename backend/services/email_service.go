package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"strings"
	"time"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	smtpFrom     string
}

func NewEmailService(host, port, username, password, from string) *EmailService {
	if from == "" && username != "" {
		from = username
	}
	if from == "" {
		from = "no-reply@pollx.live"
	}
	return &EmailService{
		smtpHost:     strings.TrimSpace(host),
		smtpPort:     strings.TrimSpace(port),
		smtpUsername: strings.TrimSpace(username),
		smtpPassword: strings.TrimSpace(password),
		smtpFrom:     strings.TrimSpace(from),
	}
}

func (s *EmailService) IsConfigured() bool {
	return s.smtpHost != "" && s.smtpPort != "" && s.smtpUsername != "" && s.smtpPassword != ""
}

// SendOTP sends a 6-digit OTP code to the recipient's email address
func (s *EmailService) SendOTP(toEmail, otp, purpose string) error {
	toEmail = strings.ToLower(strings.TrimSpace(toEmail))
	if purpose == "" {
		purpose = "2-Step Verification"
	}

	// Always log OTP to server console for auditing and instant local/staging verification
	log.Printf("📧 [EMAIL OTP SERVICE] >>> To: %s | OTP Code: [%s] | Purpose: %s | Timestamp: %s",
		toEmail, otp, purpose, time.Now().Format(time.RFC3339))

	if !s.IsConfigured() {
		log.Printf("ℹ️ [EMAIL OTP SERVICE] SMTP not configured in environment. OTP [%s] logged above.", otp)
		return nil
	}

	subject := fmt.Sprintf("PollX - Your %s Code: %s", purpose, otp)
	
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c16; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #121a2c; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #3b82f6; margin-bottom: 20px; }
    .logo span { color: #f8fafc; }
    .otp-box { display: inline-block; padding: 14px 28px; background: rgba(59, 130, 246, 0.15); border: 2px solid #3b82f6; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #60a5fa; margin: 24px 0; }
    .info { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>Poll</span>X</div>
    <h2 style="margin: 0 0 8px; color: #f8fafc;">%s</h2>
    <p class="info">Enter the 6-digit verification code below to complete your login and verify your identity.</p>
    <div class="otp-box">%s</div>
    <p class="info">This code will expire in <strong>10 minutes</strong>. If you did not request this code, please disregard this email.</p>
    <div class="footer">PollX Live Polling &bull; Cryptographically Verified Voting System</div>
  </div>
</body>
</html>`, purpose, otp)

	msg := []byte(fmt.Sprintf("From: PollX Security <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n\r\n%s", s.smtpFrom, toEmail, subject, body))

	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	// Send using TLS or STARTTLS
	go func() {
		var err error
		if s.smtpPort == "465" {
			tlsConfig := &tls.Config{
				ServerName: s.smtpHost,
			}
			conn, dialErr := tls.Dial("tcp", addr, tlsConfig)
			if dialErr != nil {
				log.Printf("⚠️ [SMTP ERROR] TLS Dial to %s failed: %v", addr, dialErr)
				return
			}
			defer conn.Close()

			client, clientErr := smtp.NewClient(conn, s.smtpHost)
			if clientErr != nil {
				log.Printf("⚠️ [SMTP ERROR] SMTP client init failed: %v", clientErr)
				return
			}
			defer client.Quit()

			auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
			if err = client.Auth(auth); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Auth failed: %v", err)
				return
			}
			if err = client.Mail(s.smtpFrom); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Mail sender failed: %v", err)
				return
			}
			if err = client.Rcpt(toEmail); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Rcpt failed: %v", err)
				return
			}
			w, dataErr := client.Data()
			if dataErr != nil {
				log.Printf("⚠️ [SMTP ERROR] Data write failed: %v", dataErr)
				return
			}
			_, _ = w.Write(msg)
			_ = w.Close()
			log.Printf("✅ [SMTP SUCCESS] OTP email delivered to %s via port 465", toEmail)
		} else {
			// Port 587 or 25 with STARTTLS
			auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
			conn, dialErr := net.DialTimeout("tcp", addr, 10*time.Second)
			if dialErr != nil {
				log.Printf("⚠️ [SMTP ERROR] Dial to %s failed: %v", addr, dialErr)
				return
			}
			defer conn.Close()

			c, clientErr := smtp.NewClient(conn, s.smtpHost)
			if clientErr != nil {
				log.Printf("⚠️ [SMTP ERROR] Client error: %v", clientErr)
				return
			}
			defer c.Quit()

			if ok, _ := c.Extension("STARTTLS"); ok {
				tlsConfig := &tls.Config{ServerName: s.smtpHost}
				if err = c.StartTLS(tlsConfig); err != nil {
					log.Printf("⚠️ [SMTP ERROR] StartTLS error: %v", err)
					return
				}
			}

			if err = c.Auth(auth); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Auth error: %v", err)
				return
			}
			if err = c.Mail(s.smtpFrom); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Mail error: %v", err)
				return
			}
			if err = c.Rcpt(toEmail); err != nil {
				log.Printf("⚠️ [SMTP ERROR] Rcpt error: %v", err)
				return
			}
			w, dataErr := c.Data()
			if dataErr != nil {
				log.Printf("⚠️ [SMTP ERROR] Data error: %v", dataErr)
				return
			}
			_, _ = w.Write(msg)
			_ = w.Close()
			log.Printf("✅ [SMTP SUCCESS] OTP email delivered to %s via %s", toEmail, addr)
		}
	}()

	return nil
}
