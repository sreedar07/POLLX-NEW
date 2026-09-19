package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/controllers"
	"live-polling-backend/database"
	"live-polling-backend/middleware"
	"live-polling-backend/models"
	"live-polling-backend/websocket"

	"github.com/gin-gonic/gin"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	_ = os.Setenv("ADMIN_EMAIL", "sreedram1709@gmail.com")
	_ = os.Setenv("ADMIN_PASSWORD", "Sreedar07@")
	cfg := config.LoadConfig()

	// Initialize with fallback in-memory test stores
	database.DB = database.NewInMemoryStorage()
	database.Realtime = database.NewInMemoryRealtimeManager()
	websocket.InitHub()

	// Seed Admin strictly from environment configuration
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	if cfg.AdminEmail != "" && cfg.AdminPassword != "" {
		_ = database.DB.SeedAdminUser(ctx, cfg.AdminEmail, "Administrator", cfg.AdminPassword)
	}
	cancel()

	router := gin.Default()
	router.Use(middleware.CORSMiddleware("*"))

	authController := controllers.NewAuthController(cfg.JWTSecret, cfg.AdminEmail)
	pollController := controllers.NewPollController()
	adminController := controllers.NewAdminController()

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

		api.GET("/votes/history", middleware.AuthRequired(cfg.JWTSecret), pollController.GetMyVotes)
		api.GET("/receipts/verify/:hash", pollController.VerifyReceipt)

		polls := api.Group("/polls")
		polls.Use(middleware.OptionalAuth(cfg.JWTSecret))
		{
			polls.GET("", pollController.GetAllPolls)
			polls.GET("/active", pollController.GetActivePoll)
			polls.GET("/:id", pollController.GetPoll)
			polls.GET("/:id/comments", pollController.GetComments)
			polls.POST("/:id/comments", pollController.AddComment)

			// Participant voting is public; JWT remains required for administrator operations.
			polls.POST("/:id/vote", pollController.Vote)

			adminOnly := polls.Group("")
			adminOnly.Use(middleware.AdminRequired(cfg.JWTSecret))
			{
				adminOnly.POST("", pollController.CreatePoll)
				adminOnly.POST("/active/reset", pollController.ResetActivePoll)
				adminOnly.GET("/user/my", pollController.GetUserPolls)
				adminOnly.PATCH("/:id/toggle", pollController.TogglePoll)
			}
		}

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

	return router
}

func TestCompleteVotingSystem(t *testing.T) {
	router := setupTestRouter()

	// 1. Verify Hardcoded Admin Credentials Login
	loginAdmin := models.LoginRequest{
		Email:    "sreedram1709@gmail.com",
		Password: "Sreedar07@",
	}
	bodyAdmin, _ := json.Marshal(loginAdmin)
	reqAdmin := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(bodyAdmin))
	reqAdmin.Header.Set("Content-Type", "application/json")
	wAdmin := httptest.NewRecorder()
	router.ServeHTTP(wAdmin, reqAdmin)

	if wAdmin.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for admin login sreedram1709@gmail.com, got %d: %s", wAdmin.Code, wAdmin.Body.String())
	}
	var adminAuthResp models.AuthResponse
	json.Unmarshal(wAdmin.Body.Bytes(), &adminAuthResp)
	if adminAuthResp.User.Role != "admin" {
		t.Fatalf("Expected admin role, got %s", adminAuthResp.User.Role)
	}

	// 2. User Registration with Password Strength and Verification Code
	regVoter := models.RegisterRequest{
		FullName:   "John Citizen",
		Username:   "johncitizen",
		Email:      "john.citizen@example.com",
		Password:   "SecurePass2026!",
		Department: "Engineering",
		Bio:        "Civic participant",
	}
	bodyVoter, _ := json.Marshal(regVoter)
	reqReg := httptest.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(bodyVoter))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	if wReg.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for voter registration, got %d: %s", wReg.Code, wReg.Body.String())
	}

	var regResp map[string]interface{}
	json.Unmarshal(wReg.Body.Bytes(), &regResp)
	code := regResp["verification_code"].(string)
	if code == "" {
		t.Fatal("Expected verification code in registration response")
	}

	// 3. Login before verification should be blocked (403 Forbidden)
	reqPreLogin := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(bodyVoter))
	reqPreLogin.Header.Set("Content-Type", "application/json")
	wPreLogin := httptest.NewRecorder()
	router.ServeHTTP(wPreLogin, reqPreLogin)

	if wPreLogin.Code != http.StatusForbidden {
		t.Fatalf("Expected 403 Forbidden for unverified voter login, got %d", wPreLogin.Code)
	}

	// 4. Confirm Email using 6-digit Code
	verifyPayload := models.VerifyEmailRequest{
		Email: "john.citizen@example.com",
		Code:  code,
	}
	bodyVerify, _ := json.Marshal(verifyPayload)
	reqVerify := httptest.NewRequest("POST", "/api/auth/verify-email", bytes.NewBuffer(bodyVerify))
	reqVerify.Header.Set("Content-Type", "application/json")
	wVerify := httptest.NewRecorder()
	router.ServeHTTP(wVerify, reqVerify)

	if wVerify.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for email verification, got %d: %s", wVerify.Code, wVerify.Body.String())
	}
	var voterAuthResp models.AuthResponse
	json.Unmarshal(wVerify.Body.Bytes(), &voterAuthResp)
	if !voterAuthResp.User.IsVerified {
		t.Fatal("Expected user to be verified after confirming email code")
	}

	// 5. Admin Creates an Election with Blind Mode
	pollPayload := models.CreatePollRequest{
		Title:       "2026 Presidential Council Election",
		Description: "Official vote for council chairperson",
		Category:    "Governance",
		IsBlind:     true,
		Options:     []string{"Alice Johnson", "Bob Smith", "Charlie Davis"},
	}
	bodyPoll, _ := json.Marshal(pollPayload)
	reqPoll := httptest.NewRequest("POST", "/api/polls", bytes.NewBuffer(bodyPoll))
	reqPoll.Header.Set("Content-Type", "application/json")
	reqPoll.Header.Set("Authorization", "Bearer "+adminAuthResp.Token)
	wPoll := httptest.NewRecorder()
	router.ServeHTTP(wPoll, reqPoll)

	if wPoll.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for poll creation, got %d: %s", wPoll.Code, wPoll.Body.String())
	}
	var createdPoll models.Poll
	json.Unmarshal(wPoll.Body.Bytes(), &createdPoll)
	pollID := createdPoll.ID.Hex()

	// 6. Test Blind Mode Before Voting: Votes should be masked (-1)
	reqActive := httptest.NewRequest("GET", "/api/polls/active?fingerprint=fp_voter_1", nil)
	wActive := httptest.NewRecorder()
	router.ServeHTTP(wActive, reqActive)

	var activeResp struct {
		HasVoted bool        `json:"has_voted"`
		Poll     models.Poll `json:"poll"`
	}
	json.Unmarshal(wActive.Body.Bytes(), &activeResp)
	if activeResp.Poll.Options[0].Votes != -1 {
		t.Fatalf("Expected blind mode vote masking (-1) before ballot is cast, got %d", activeResp.Poll.Options[0].Votes)
	}

	// 7. Public Participant Voting: Anonymous voter casts ballot with fingerprint
	votePayload := models.VoteRequest{
		OptionID:    "opt_1",
		Fingerprint: "fp_voter_1",
		Department:  "Engineering",
	}
	bodyVote, _ := json.Marshal(votePayload)
	reqAnonVote := httptest.NewRequest("POST", "/api/polls/"+pollID+"/vote", bytes.NewBuffer(bodyVote))
	reqAnonVote.Header.Set("Content-Type", "application/json")
	wAnonVote := httptest.NewRecorder()
	router.ServeHTTP(wAnonVote, reqAnonVote)

	if wAnonVote.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for public participant vote submission, got %d: %s", wAnonVote.Code, wAnonVote.Body.String())
	}

	// 8. Authenticated Voter casts ballot with Demographic Department
	votePayload2 := models.VoteRequest{
		OptionID:    "opt_2",
		Fingerprint: "fp_voter_2",
		Department:  "Engineering",
	}
	bodyVote2, _ := json.Marshal(votePayload2)
	reqVote := httptest.NewRequest("POST", "/api/polls/"+pollID+"/vote", bytes.NewBuffer(bodyVote2))
	reqVote.Header.Set("Content-Type", "application/json")
	reqVote.Header.Set("Authorization", "Bearer "+voterAuthResp.Token)
	wVote := httptest.NewRecorder()
	router.ServeHTTP(wVote, reqVote)

	if wVote.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for authenticated vote, got %d: %s", wVote.Code, wVote.Body.String())
	}
	var voteResp models.VoteResponse
	json.Unmarshal(wVote.Body.Bytes(), &voteResp)
	if voteResp.ReceiptHash == "" {
		t.Fatal("Expected cryptographic receipt hash in vote response")
	}

	// 8b. Duplicate vote prevention
	reqDup := httptest.NewRequest("POST", "/api/polls/"+pollID+"/vote", bytes.NewBuffer(bodyVote2))
	reqDup.Header.Set("Content-Type", "application/json")
	reqDup.Header.Set("Authorization", "Bearer "+voterAuthResp.Token)
	wDup := httptest.NewRecorder()
	router.ServeHTTP(wDup, reqDup)

	if wDup.Code != http.StatusConflict {
		t.Fatalf("Expected 409 Conflict for duplicate vote, got %d", wDup.Code)
	}

	// 9. Zero-Knowledge Cryptographic Receipt Verification on Ledger
	reqReceipt := httptest.NewRequest("GET", "/api/receipts/verify/"+voteResp.ReceiptHash, nil)
	wReceipt := httptest.NewRecorder()
	router.ServeHTTP(wReceipt, reqReceipt)

	if wReceipt.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for receipt verification, got %d: %s", wReceipt.Code, wReceipt.Body.String())
	}
	var receiptCheck map[string]interface{}
	json.Unmarshal(wReceipt.Body.Bytes(), &receiptCheck)
	if receiptCheck["verified"] != true || receiptCheck["status"] != "CONFIRMED_ON_LEDGER" {
		t.Fatalf("Expected receipt to be confirmed on ledger, got %v", receiptCheck)
	}

	// 10. Voter Views Personal Ballot History
	reqHistory := httptest.NewRequest("GET", "/api/votes/history", nil)
	reqHistory.Header.Set("Authorization", "Bearer "+voterAuthResp.Token)
	wHistory := httptest.NewRecorder()
	router.ServeHTTP(wHistory, reqHistory)

	if wHistory.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for voter history, got %d", wHistory.Code)
	}

	// 11. Admin Real-Time Analytics Dashboard
	reqAnalytics := httptest.NewRequest("GET", "/api/admin/analytics?poll_id="+pollID, nil)
	reqAnalytics.Header.Set("Authorization", "Bearer "+adminAuthResp.Token)
	wAnalytics := httptest.NewRecorder()
	router.ServeHTTP(wAnalytics, reqAnalytics)

	if wAnalytics.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for admin analytics, got %d: %s", wAnalytics.Code, wAnalytics.Body.String())
	}

	// 12. Admin Audit Trail Logging
	reqAudit := httptest.NewRequest("GET", "/api/admin/audit-logs", nil)
	reqAudit.Header.Set("Authorization", "Bearer "+adminAuthResp.Token)
	wAudit := httptest.NewRecorder()
	router.ServeHTTP(wAudit, reqAudit)

	if wAudit.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for audit logs, got %d", wAudit.Code)
	}

	// 13. Admin CSV Export
	reqCSV := httptest.NewRequest("GET", "/api/admin/export/csv?poll_id="+pollID, nil)
	reqCSV.Header.Set("Authorization", "Bearer "+adminAuthResp.Token)
	wCSV := httptest.NewRecorder()
	router.ServeHTTP(wCSV, reqCSV)

	if wCSV.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for CSV export, got %d", wCSV.Code)
	}
	if wCSV.Header().Get("Content-Type") != "text/csv" {
		t.Fatalf("Expected text/csv content type, got %s", wCSV.Header().Get("Content-Type"))
	}

	// 14. Test ZIP Download Route Removal (Ensure 404 Not Found)
	reqZip := httptest.NewRequest("GET", "/download", nil)
	wZip := httptest.NewRecorder()
	router.ServeHTTP(wZip, reqZip)
	if wZip.Code != http.StatusNotFound {
		t.Fatalf("Expected 404 Not Found for removed ZIP download endpoint, got %d", wZip.Code)
	}

	// 15. Test Login Brute Force Protection (Rate Limiting)
	middleware.ResetLoginRateLimits()
	badLoginPayload, _ := json.Marshal(models.LoginRequest{Email: "brute@force.com", Password: "wrong"})
	for i := 0; i < 5; i++ {
		reqL := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(badLoginPayload))
		reqL.Header.Set("Content-Type", "application/json")
		wL := httptest.NewRecorder()
		router.ServeHTTP(wL, reqL)
	}
	// 6th attempt should be blocked with 429 Too Many Requests
	reqBlocked := httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(badLoginPayload))
	reqBlocked.Header.Set("Content-Type", "application/json")
	wBlocked := httptest.NewRecorder()
	router.ServeHTTP(wBlocked, reqBlocked)

	if wBlocked.Code != http.StatusTooManyRequests {
		t.Fatalf("Expected 429 Too Many Requests on 6th rapid login attempt, got %d", wBlocked.Code)
	}
}
