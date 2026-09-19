# PulseVote — Secure Online Voting System & Live Polling Platform

> A production-grade, highly secure online voting and real-time live polling platform built with **Go (Gin)**, **MongoDB Atlas**, **Redis Pub/Sub**, **WebSockets**, and **React 19 (Vite)**.

---

## 🌟 Executive Summary & Security Highlights

| Requirement Area | Implementation Details |
| :--- | :--- |
| **Account-Based Access Control** | **Strictly enforced**: Only registered & logged-in voters can submit a ballot. `POST /api/polls/:id/vote` requires a valid JWT Bearer token (`401 Unauthorized` for anonymous requests). The UI redirects unauthenticated users to Sign In / Register. |
| **Admin Credentials Security** | Managed exclusively via environment variables (`ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`). Zero hardcoded credentials in client-side code, database seed scripts, or UI forms. Login forms are clean without pre-fills. |
| **Brute Force Rate Limiting** | Automated IP-based sliding window rate limiter protects `/api/auth/login`. Blocks rapid brute-force attempts with `429 Too Many Requests` and a `Retry-After: 60` header. |
| **Password & Form Security** | Sensitive credentials use proper masking (`type="password"`), `autoComplete="current-password"` for login, and `autoComplete="new-password"` for registration with form autocomplete protections. |
| **Voter Registration & Verification** | Full Name, Username, Email, Password (with interactive strength meter), Department/Demographic, and Statement. Mandatory 6-digit confirmation code required before account activation (unverified login rejected with `403 Forbidden`). |
| **Fraud Prevention & Integrity** | Enforces 1 vote per user per poll using User ID, deterministic client fingerprinting, and IP address deduplication (`409 Conflict` on duplicate attempts). Pre-vote confirmation screen and personal ballot history audit trail. |
| **Admin Live Dashboard** | Real-time vote counts and percentages, dynamic bar graphs, interactive SVG doughnut/pie charts, demographic breakdown, and time-velocity filters. |
| **Data Export & Audit** | Streaming CSV download (`/api/admin/export/csv`), official printable PDF audit certificate (`/api/admin/export/pdf`), and immutable timestamped audit logs (`/api/admin/audit-logs`). |
| **No ZIP Downloads** | Completely eliminated: No ZIP download buttons, generation scripts, or download endpoints exist. Any attempt to access `/download` returns `404 Not Found`. |
| **Creative Features (6)** | 1. Blockchain-Inspired Cryptographic Receipts (SHA-256 zero-knowledge verification)<br>2. "Blind Vote" Bandwagon Prevention Mode<br>3. Gamification & Civic Badges<br>4. Interactive Live Commentary Feed<br>5. "I Voted!" Social Sharing Card Generator<br>6. Contrast-Accessible Dark & Light Theme System |

---

## 🔐 Administrator Access & Environment Configuration

Admin access is managed strictly via secure environment configuration:

- In `backend/.env`:
  ```env
  ADMIN_EMAIL=admin@example.com
  ADMIN_PASSWORD=replace-with-a-strong-password
  ```
- **Security Guarantee:**
  - No credentials appear anywhere in the React frontend bundle or client-side JavaScript.
  - The login form starts with clean, empty inputs and no autofill/demo credentials.
  - If `ADMIN_EMAIL` or `ADMIN_PASSWORD` is omitted from the environment, seed routines are automatically bypassed.

---

## 🎨 6 Creative & Advanced Features

### 1. 🛡️ Blockchain-Inspired Cryptographic Receipts
- Every submitted ballot generates an irreversible SHA-256 cryptographic receipt (`VOTE-<16-hex-bytes>`).
- Voters can verify their ballot at `/verify-receipt` using a zero-knowledge audit lookup: the system confirms the ballot is immutably recorded on the ledger without revealing the voter's identity.

### 2. 🙈 "Blind Vote" Bandwagon Prevention Mode
- Admins can flag elections as "Blind Vote".
- When enabled, candidate tallies and percentages remain veiled (`-1` / masked) to prospective voters until after they cast their ballot, preventing herd mentality and social influence bias.

### 3. 🏆 Civic Gamification & Voter Badges
Voters unlock dynamic civic achievements:
- **Verified Citizen 🛡️**: Earned upon completing 6-digit email confirmation.
- **Early Bird ⚡**: Awarded to the first 5 voters in an election.
- **Active Voter 🗳️**: Awarded upon casting a verified ballot.
- **Democracy Champion 🌟**: Awarded to multi-election participants.

### 4. 💬 Interactive Live Commentary Feed
- Real-time anonymous reaction feed during active elections.
- Voters can post commentary and reactions with automatic profanity filtering.
- Administrators have full moderation controls directly from their dashboard (Approve / Dismiss).

### 5. 📢 "I Voted!" Social Badge Card Generator
- After submitting a ballot, voters can generate an instant, downloadable "I Voted! 🗳️" civic badge card ready for social sharing without disclosing secret ballot selections.

### 6. 🌓 Contrast-Accessible Dark & Light Theme
- Seamless theme toggle in the main navigation bar.
- Uses CSS variables (`--bg-primary`, `--card-bg`, `--text-primary`, `--accent-primary`) with WCAG 2.1 AA compliant color contrast ratios.

---

## 🏗️ System Architecture

```
                                  +------------------------------------+
                                  |      Voter & Admin Browsers        |
                                  |    React 19 + Lucide Icons + Vite  |
                                  +-----------------+------------------+
                                                    |
                              HTTP REST (JSON) / JWT | WebSocket (RFC 6455)
                                                    v
                                  +------------------------------------+
                                  |        Go Backend (Gin Engine)     |
                                  |  - Mandatory Auth Guard on Votes   |
                                  |  - IP Brute Force Rate Limiter     |
                                  |  - Role-Based Access Control (RBAC)|
                                  |  - Verification Token Generator    |
                                  |  - SHA-256 Ballot Receipt Hasher   |
                                  |  - Realtime Hub / Client Manager   |
                                  +--------+------------------+--------+
                                           |                  |
                                           v                  v
                   +-------------------------------+  +-------------------------------+
                   |      Redis (Realtime Engine)  |  |    MongoDB Atlas (Storage)    |
                   |  - Atomic HINCRBY Tallying    |  |  - users collection          |
                   |  - SADD Fingerprint Deduplication| - polls collection          |
                   |  - Pub/Sub Channel Broadcast  |  |  - votes (ledger records)     |
                   |  - In-Memory Fallback Active  |  |  - audit_logs collection      |
                   +-------------------------------+  |  - comments collection       |
                                                      +-------------------------------+
```

---

## 📡 API Endpoint Reference

### Authentication & Administrator Verification
- `POST /api/auth/register` — Register a user account (optional for participants; required for admin access) (FullName, Email, Password, Department, Bio). Returns 6-digit activation code.
- `POST /api/auth/login` — Sign in with email and password (protected by rate limiting, max 5 attempts/min). Returns JWT token. Blocks unverified accounts (`403 Forbidden`).
- `POST /api/auth/verify-email` — Confirms email address using the 6-digit code and activates the account.
- `POST /api/auth/resend-code` — Resends a new 6-digit activation code to the voter's email.
- `GET /api/auth/me` — Fetches the currently authenticated user session.

### Elections & Public Participant Voting
- `GET /api/polls` — Returns all active and historical elections.
- `GET /api/polls/active` — Returns the current active election (masks tallies if in "Blind Vote" mode).
- `GET /api/polls/:id` — Returns election details and option breakdown.
- `POST /api/polls/:id/vote` — Public participant endpoint; authentication is optional. Participants can vote without creating an account; anonymous ballots are deduplicated with a server-generated voter fingerprint. Deduplicates by User ID, IP, and fingerprint (`409 Conflict` on duplicate). Returns SHA-256 cryptographic receipt and badges.
- `GET /api/votes/history` — Returns the authenticated voter's personal certified ballot history.
- `GET /api/receipts/verify/:hash` — Zero-knowledge public audit lookup for a cryptographic receipt.

### Comments & Live Reactions
- `GET /api/polls/:id/comments` — Returns approved live comments for the election.
- `POST /api/polls/:id/comments` — Posts a live reaction or commentary.

### Administrative Control & Analytics
- `POST /api/polls` — Admin creates a new election (supports Title, Description, Category, Blind Vote, and Options).
- `PATCH /api/polls/:id/toggle` — Admin opens or closes an election.
- `POST /api/polls/active/reset` — Admin resets vote tallies for the active election.
- `GET /api/admin/analytics` — Detailed election analytics, option percentages, demographic breakdown, and recent votes.
- `GET /api/admin/audit-logs` — Immutable system audit log records.
- `GET /api/admin/export/csv` — Streams certified election results in CSV format.
- `GET /api/admin/export/pdf` — Generates a printable official election audit certificate.
- `PUT /api/admin/comments/:id/approve` — Approves a live comment.
- `DELETE /api/admin/comments/:id` — Deletes a flagged comment.

---

## 🧪 Verification & Automated Testing

### Go Unit Tests
```bash
cd backend
go test -v ./...
```
*Output: `PASS: TestCompleteVotingSystem (0.26s)`*

### Comprehensive 17-Step End-to-End System Audit
```bash
node scratch/test_online_voting_system.js
```
*Output:*
```
========================================================
   PULSEVOTE COMPLETE ONLINE VOTING SYSTEM E2E AUDIT    
========================================================
--- Step 1: Administrator Authentication (via env config) -> PASS
--- Step 2: Voter Registration with Email Confirmation -> PASS
--- Step 3: Verifying Unverified Account Sign-In Rejection -> PASS (HTTP 403)
--- Step 4: Activating Voter Account via 6-Digit Code -> PASS
--- Step 5: Admin Launches Election with Blind Vote Mode -> PASS
--- Step 6: Verifying Blind Vote Bandwagon Prevention Masking -> PASS
--- Step 6b: Testing Account-Based Access Control (Anonymous Vote Rejection) -> PASS (HTTP 401)
--- Step 7: Casting Certified Ballot with Cryptographic Receipt -> PASS
--- Step 8: Testing Fraud Prevention (Duplicate Vote Prevention) -> PASS (HTTP 409)
--- Step 9: Zero-Knowledge Public Ballot Receipt Audit -> PASS
--- Step 10: Voter Ballot History Audit Trail -> PASS
--- Step 11: Live Commentary & Reaction Feed -> PASS
--- Step 12: Admin Real-Time Analytics & Demographic Breakdown -> PASS
--- Step 13: Comprehensive System Audit Trail Logging -> PASS
--- Step 14: Results Data Export (CSV Streaming) -> PASS
--- Step 15: Official Printable Election Audit Report (PDF/HTML) -> PASS
--- Step 16: Verifying Removal of ZIP Download Routes -> PASS (HTTP 404)
--- Step 17: Verifying Login Rate Limiting (Brute Force Protection) -> PASS (HTTP 429)
========================================================
  >>> ALL 17 E2E VERIFICATION CHECKS PASSED 100% <<<    
========================================================
```


## Deployment notes
- Backend is a Render Docker web service using `backend/Dockerfile`. The image builds the actual root `main.go` binary (the previous Dockerfile referenced a missing `cmd/server`).
- Frontend can be deployed as a Render Static Site with `npm ci && npm run build`, publishing `frontend/dist`.
- Set `MONGO_URI`, `REDIS_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `CORS_ORIGIN` in Render. Never commit `.env` files or real credentials.
- For a separate Render frontend/backend, set `VITE_API_URL=https://<backend>.onrender.com` and `VITE_WS_URL=wss://<backend>.onrender.com` before building the frontend.
- Technology layers: React frontend, Go/Gin backend, MongoDB database, Redis realtime layer.
