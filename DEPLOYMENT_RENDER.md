# Deploying PollX to Render (Step-by-Step Guide)

This guide walks you through deploying **PollX** to [Render](https://render.com) using two simple approaches.

---

## ⚡ Option 1: Render Blueprint (Recommended)

This repository includes a pre-configured [`render.yaml`](./render.yaml) Blueprint that automatically provisions:
1. **`pollx-backend`**: Docker Web Service running the Go/Gin backend and WebSocket hub.
2. **`pollx-frontend`**: High-performance Static Site serving the React 19 / Vite frontend with automatic HTTPS and SPA routing rewrites.

### Deployment Steps:
1. **Push your code to GitHub / GitLab**.
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** in the top-right corner and select **Blueprint**.
4. Connect your repository (`POLLX-NEW`).
5. Render will automatically read `render.yaml` and display the two services (`pollx-backend` and `pollx-frontend`).
6. Click **Apply**.
7. Once `pollx-backend` finishes deploying, note its public URL (e.g., `https://pollx-backend.onrender.com`).
8. In the Render Dashboard, open **`pollx-frontend`** -> **Environment**:
   - Set `VITE_API_URL` to `https://pollx-backend.onrender.com`
   - Set `VITE_WS_URL` to `wss://pollx-backend.onrender.com`
9. Click **Save Changes** (Render will trigger a quick redeploy with your backend URLs linked).

---

## 🐳 Option 2: Single-Service All-in-One Container

If you want to use only **1 Free Web Service** on Render, this repository includes a multi-stage root [`Dockerfile`](./Dockerfile) that builds the React frontend and packages it directly into the Go binary.

### Deployment Steps:
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name:** `pollx-app`
   - **Language / Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Context Directory:** `.`
   - **Plan:** `Free`
4. **Environment Variables**:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `PORT` | `8080` | Default listening port |
   | `JWT_SECRET` | `(Click Generate)` | Secure random JWT token |
   | `ADMIN_EMAIL` | `admin@example.com` | Administrator login email |
   | `ADMIN_PASSWORD` | `(Any strong password)` | Administrator login password |
5. Click **Create Web Service**.
6. Render will automatically build the React Vite bundle, compile the Go server, and serve everything under a single URL!

---

## 🗄️ Database & Cache Setup (MongoDB & Redis)

- **Zero-Config Resilient In-Memory Fallback:**
  If you do not specify `MONGO_URI` or `REDIS_URI`, PollX will automatically activate its thread-safe in-memory storage and in-memory Pub/Sub manager. The application runs immediately without requiring any database setup!

- **Using Production MongoDB Atlas & Redis:**
  To persist data across container restarts, add these environment variables in your Render backend service:
  - `MONGO_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/pollx?retryWrites=true&w=majority`
  - `REDIS_URI`: `rediss://default:<password>@<host>:<port>` (e.g., from Upstash or Redis Cloud)

---

## 🔍 Verification & Health Check

Once deployed, you can verify your service status:
- Backend Health Check: `GET https://your-backend.onrender.com/health`
  ```json
  {
    "service": "live-polling-backend",
    "status": "healthy",
    "real_mongo": false,
    "real_redis": false
  }
  ```
- Public Frontend: `https://your-frontend.onrender.com`
