# =========================================================================
# PollX — All-in-One Multi-Stage Production Dockerfile for Render Deployment
# =========================================================================

# Stage 1: Build React 19 Frontend with Vite
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go Gin Backend
FROM golang:alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# Stage 3: Minimal Secure Production Runtime
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

# Copy Go binary and built static frontend bundle
COPY --from=backend-builder /app/backend/server ./server
COPY --from=frontend-builder /app/frontend/dist ./dist

# Standard Render port
EXPOSE 8080
ENV PORT=8080
ENV GIN_MODE=release

CMD ["./server"]
