package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/controllers"
	"live-polling-backend/database"
	"live-polling-backend/middleware"
	"live-polling-backend/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize MongoDB and Redis storage managers
	database.InitMongo(cfg.MongoURI)
	database.InitRedis(cfg.RedisURI)

	// Seed Administrator account strictly from environment variables (No hardcoded credentials)
	if cfg.AdminEmail != "" && cfg.AdminPassword != "" {
		seedCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := database.DB.SeedAdminUser(seedCtx, cfg.AdminEmail, "Administrator", cfg.AdminPassword); err != nil {
			log.Printf("[Admin Seed] Warning: %v\n", err)
		} else {
			log.Println("[Admin Seed] Initialized Administrator account from environment configuration")
		}
		cancel()
	} else {
		log.Println("[Admin Seed] Notice: ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment; skipping seed.")
	}

	// Auto-seed default Poll question if not exists
	seedPollCtx, cancelPoll := context.WithTimeout(context.Background(), 5*time.Second)
	if defaultPoll, err := database.DB.SeedDefaultPoll(seedPollCtx); err != nil {
		log.Printf("[Default Poll Seed] Warning: %v\n", err)
	} else if defaultPoll != nil {
		log.Printf("[Default Poll Seed] Successfully ensured default poll: '%s' with %d options\n", defaultPoll.Title, len(defaultPoll.Options))
	}
	cancelPoll()

	// Initialize Real-time WebSocket Hub
	websocket.InitHub()

	router := gin.Default()

	// Apply CORS
	router.Use(middleware.CORSMiddleware(cfg.CORSOrigin))

	// Health Check / System Diagnostics Endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":     "healthy",
			"service":    "live-polling-backend",
			"real_mongo": database.DB.IsRealDB(),
			"real_redis": database.Realtime.IsRealRedis(),
		})
	})

	// Controllers
	authController := controllers.NewAuthController(cfg.JWTSecret, cfg.AdminEmail)
	pollController := controllers.NewPollController()
	adminController := controllers.NewAdminController()

	// Public & Auth Routes
	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", middleware.RateLimitLogin(), authController.Login)
			auth.POST("/verify-email", authController.VerifyEmail)
			auth.POST("/resend-code", authController.ResendCode)
			auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authController.GetMe)
		}

		// Voter History & Zero-Knowledge Cryptographic Receipt Verification
		api.GET("/votes/history", middleware.AuthRequired(cfg.JWTSecret), pollController.GetMyVotes)
		api.GET("/receipts/verify/:hash", pollController.VerifyReceipt)

		polls := api.Group("/polls")
		polls.Use(middleware.OptionalAuth(cfg.JWTSecret))
		{
			// Viewing elections and comments
			polls.GET("", pollController.GetAllPolls)
			polls.GET("/active", pollController.GetActivePoll)
			polls.GET("/:id", pollController.GetPoll)
			polls.GET("/:id/comments", pollController.GetComments)
			polls.POST("/:id/comments", pollController.AddComment)

			// Participant voting is public; JWT remains required for administrator operations.
			polls.POST("/:id/vote", pollController.Vote)

			// Admin-only actions on polls: create poll, reset, toggle
			adminPolls := polls.Group("")
			adminPolls.Use(middleware.AdminRequired(cfg.JWTSecret))
			{
				adminPolls.POST("", pollController.CreatePoll)
				adminPolls.POST("/active/reset", pollController.ResetActivePoll)
				adminPolls.PATCH("/:id/toggle", pollController.TogglePoll)
			}
		}

		// Administrative Dashboard, Analytics, Audit Trail, & Reports
		admin := api.Group("/admin")
		admin.Use(middleware.AdminRequired(cfg.JWTSecret))
		{
			admin.GET("/analytics", adminController.GetAnalytics)
			admin.GET("/audit-logs", adminController.GetAuditLogs)
			admin.GET("/export/csv", adminController.ExportCSV)
			admin.GET("/export/pdf", adminController.ExportPDF)
			admin.PUT("/comments/:id/approve", adminController.ApproveComment)
			admin.DELETE("/comments/:id", adminController.DeleteComment)
		}
	}

	// WebSocket Route for true real-time polling updates
	router.GET("/ws/polls/:id", websocket.HandleWebSocket)

	// Serve static frontend build if present (enables single-container Docker deployment)
	staticPaths := []string{"./dist", "../frontend/dist", "./frontend/dist"}
	for _, p := range staticPaths {
		if _, err := os.Stat(p); err == nil {
			router.Static("/assets", p+"/assets")
			router.NoRoute(func(c *gin.Context) {
				if strings.HasPrefix(c.Request.URL.Path, "/api") || strings.HasPrefix(c.Request.URL.Path, "/ws") {
					c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
					return
				}
				c.File(p + "/index.html")
			})
			log.Printf("[Server] Serving static frontend build from: %s\n", p)
			break
		}
	}

	log.Printf("[Server] Starting Live Polling Backend on port :%s ...\n", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
