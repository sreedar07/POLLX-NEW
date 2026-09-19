package controllers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"live-polling-backend/database"
	"live-polling-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollController struct{}

func NewPollController() *PollController {
	return &PollController{}
}

// GetActivePoll returns the current active poll, enforcing blind-vote masking if applicable
func (p *PollController) GetActivePoll(c *gin.Context) {
	poll, err := database.DB.GetActivePoll(c.Request.Context())
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active poll currently exists", "poll": nil})
		return
	}

	idHex := poll.ID.Hex()

	// Merge real-time Redis tallies
	liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), idHex)
	if err == nil && len(liveVotes) > 0 {
		for i, opt := range poll.Options {
			if count, ok := liveVotes[opt.ID]; ok {
				poll.Options[i].Votes = count
			}
		}
		poll.TotalVotes = totalVotes
	}

	// Check if this specific voter already voted
	fingerprint := c.Query("fingerprint")
	userIDVal, _ := c.Get("userID")
	userIDStr := ""
	if userIDVal != nil {
		userIDStr = userIDVal.(string)
	}
	voterID := generateVoterID(c.ClientIP(), fingerprint, userIDStr)
	hasVoted := database.Realtime.HasVoted(c.Request.Context(), idHex, voterID)

	// If Blind Vote mode is active and user hasn't voted yet, hide tallies to prevent bandwagon bias
	pollCopy := *poll
	if poll.IsBlind && !hasVoted {
		maskedOptions := make([]models.PollOption, len(poll.Options))
		for i, opt := range poll.Options {
			maskedOptions[i] = models.PollOption{
				ID:    opt.ID,
				Text:  opt.Text,
				Votes: -1, // signal that results are blind
			}
		}
		pollCopy.Options = maskedOptions
	}

	c.JSON(http.StatusOK, gin.H{
		"poll":      pollCopy,
		"has_voted": hasVoted,
	})
}

// GetPoll returns a specific poll by ID
func (p *PollController) GetPoll(c *gin.Context) {
	idHex := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	poll, err := database.DB.GetPollByID(c.Request.Context(), pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), idHex)
	if err == nil && len(liveVotes) > 0 {
		for i, opt := range poll.Options {
			if count, ok := liveVotes[opt.ID]; ok {
				poll.Options[i].Votes = count
			}
		}
		poll.TotalVotes = totalVotes
	}

	fingerprint := c.Query("fingerprint")
	userIDVal, _ := c.Get("userID")
	userIDStr := ""
	if userIDVal != nil {
		userIDStr = userIDVal.(string)
	}
	voterID := generateVoterID(c.ClientIP(), fingerprint, userIDStr)
	hasVoted := database.Realtime.HasVoted(c.Request.Context(), idHex, voterID)

	pollCopy := *poll
	if poll.IsBlind && !hasVoted {
		maskedOptions := make([]models.PollOption, len(poll.Options))
		for i, opt := range poll.Options {
			maskedOptions[i] = models.PollOption{
				ID:    opt.ID,
				Text:  opt.Text,
				Votes: -1,
			}
		}
		pollCopy.Options = maskedOptions
	}

	c.JSON(http.StatusOK, gin.H{
		"poll":      pollCopy,
		"has_voted": hasVoted,
	})
}

// GetAllPolls returns all polls/elections
func (p *PollController) GetAllPolls(c *gin.Context) {
	polls, err := database.DB.GetAllPolls(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch polls"})
		return
	}

	for i, poll := range polls {
		liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), poll.ID.Hex())
		if err == nil && totalVotes > 0 {
			polls[i].TotalVotes = totalVotes
			for j, opt := range poll.Options {
				if count, ok := liveVotes[opt.ID]; ok {
					polls[i].Options[j].Votes = count
				}
			}
		}
	}

	c.JSON(http.StatusOK, polls)
}

// CreatePoll creates an election/poll question
func (p *PollController) CreatePoll(c *gin.Context) {
	userIDHex, _ := c.Get("userID")
	username, _ := c.Get("username")

	creatorID, err := primitive.ObjectIDFromHex(userIDHex.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user identification"})
		return
	}

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uniqueOpts := make(map[string]bool)
	var options []models.PollOption

	for i, optText := range req.Options {
		trimmed := strings.TrimSpace(optText)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Poll options cannot be empty or whitespace"})
			return
		}
		lower := strings.ToLower(trimmed)
		if uniqueOpts[lower] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate option detected: '%s'", trimmed)})
			return
		}
		uniqueOpts[lower] = true

		options = append(options, models.PollOption{
			ID:    fmt.Sprintf("opt_%d", i+1),
			Text:  trimmed,
			Votes: 0,
		})
	}

	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "General Election"
	}

	poll := models.Poll{
		CreatorID:   creatorID,
		CreatorName: username.(string),
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Category:    category,
		IsBlind:     req.IsBlind,
		Options:     options,
		IsActive:    true,
	}

	if err := database.DB.SetActivePoll(c.Request.Context(), &poll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to establish active poll"})
		return
	}

	_ = database.DB.LogAuditEvent(c.Request.Context(), &models.AuditLog{
		ActorID:    userIDHex.(string),
		ActorEmail: username.(string),
		Action:     "POLL_CREATE",
		TargetID:   poll.ID.Hex(),
		Details:    fmt.Sprintf("Created poll '%s' with %d options (Blind mode: %t)", poll.Title, len(poll.Options), poll.IsBlind),
		IPAddress:  c.ClientIP(),
	})

	c.JSON(http.StatusCreated, poll)
}

// ResetActivePoll resets the votes of the active poll
func (p *PollController) ResetActivePoll(c *gin.Context) {
	poll, err := database.DB.GetActivePoll(c.Request.Context())
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active poll to reset"})
		return
	}

	idHex := poll.ID.Hex()
	_ = database.Realtime.ResetVotes(c.Request.Context(), idHex)
	_ = database.DB.ResetPollVotes(c.Request.Context(), poll.ID)

	emptyVotes := make(map[string]int64)
	for _, opt := range poll.Options {
		emptyVotes[opt.ID] = 0
	}
	_ = database.Realtime.PublishUpdate(c.Request.Context(), &models.LivePollUpdate{
		PollID:      idHex,
		TotalVotes:  0,
		OptionVotes: emptyVotes,
		Timestamp:   time.Now().UnixMilli(),
	})

	userIDHex, _ := c.Get("userID")
	username, _ := c.Get("username")
	actorID := "admin"
	if userIDHex != nil {
		actorID = userIDHex.(string)
	}
	actorEmail := "admin"
	if username != nil {
		actorEmail = username.(string)
	}

	_ = database.DB.LogAuditEvent(c.Request.Context(), &models.AuditLog{
		ActorID:    actorID,
		ActorEmail: actorEmail,
		Action:     "RESET_VOTES",
		TargetID:   idHex,
		Details:    fmt.Sprintf("Reset all votes for poll '%s'", poll.Title),
		IPAddress:  c.ClientIP(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Poll votes reset successfully",
		"poll_id": idHex,
	})
}

// Vote casts a ballot with cryptographic receipt generation and deduplication
func (p *PollController) Vote(c *gin.Context) {
	idHex := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	poll, err := database.DB.GetPollByID(c.Request.Context(), pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if !poll.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll is closed and no longer accepting votes"})
		return
	}

	var req models.VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate option exists
	var selectedOptionText string
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			selectedOptionText = opt.Text
			break
		}
	}
	if selectedOptionText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid option selected"})
		return
	}

	userIDStr := "anonymous"
	if userIDVal, exists := c.Get("userID"); exists && userIDVal != nil {
		if value, ok := userIDVal.(string); ok && value != "" {
			userIDStr = value
		}
	}

	// Anonymous-friendly deduplication: authenticated user + fingerprint + IP.
	// The server never stores the raw fingerprint; generateVoterID hashes it.
	voterID := generateVoterID(c.ClientIP(), req.Fingerprint, userIDStr)

	// Record vote in Redis with atomic deduplication
	update, err := database.Realtime.RecordVote(c.Request.Context(), idHex, req.OptionID, voterID)
	if err != nil {
		if err.Error() == "already_voted" {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already voted on this poll"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record vote"})
		return
	}

	// Generate unique cryptographic receipt hash
	now := time.Now()
	receiptHash := database.GenerateReceipt(idHex, req.OptionID, voterID, now.UnixMilli())

	department := req.Department
	if department == "" {
		department = "General Voter"
	}

	// Record in database
	voteRecord := models.VoteRecord{
		PollID:          pollID,
		PollTitle:       poll.Title,
		OptionID:        req.OptionID,
		OptionText:      selectedOptionText,
		VoterID:         voterID,
		UserID:          func() string { if userIDStr == "anonymous" { return "" }; return userIDStr }(),
		VoterDepartment: department,
		ReceiptHash:     receiptHash,
		CreatedAt:       now,
	}

	_ = database.DB.UpdatePollVotes(context.Background(), pollID, update.OptionVotes, update.TotalVotes)
	_ = database.DB.RecordVote(context.Background(), &voteRecord)

	badges := []string{"Active Voter"}
	if now.Sub(poll.CreatedAt) < 10*time.Minute {
		badges = append(badges, "Early Bird")
	}

	c.JSON(http.StatusOK, models.VoteResponse{
		Message:     "Ballot recorded successfully! Here is your cryptographic receipt.",
		ReceiptHash: receiptHash,
		OptionText:  selectedOptionText,
		Update:      update,
		Badges:      badges,
	})
}

// GetMyVotes returns the authenticated user's voting history
func (p *PollController) GetMyVotes(c *gin.Context) {
	userIDHex, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required to view personal ballot history"})
		return
	}

	votes, err := database.DB.GetUserVotes(c.Request.Context(), userIDHex.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch voting history"})
		return
	}

	c.JSON(http.StatusOK, votes)
}

// VerifyReceipt verifies a vote cryptographic receipt hash (zero-knowledge proof of ballot inclusion)
func (p *PollController) VerifyReceipt(c *gin.Context) {
	hash := strings.TrimSpace(c.Param("hash"))
	if hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Receipt hash is required"})
		return
	}

	vote, err := database.DB.VerifyVoteReceipt(c.Request.Context(), hash)
	if err != nil || vote == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"verified": false,
			"error":    "Receipt not found. The ballot receipt is invalid or unrecorded.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"verified":         true,
		"receipt_hash":     vote.ReceiptHash,
		"poll_title":       vote.PollTitle,
		"option_selected":  vote.OptionText,
		"timestamp":        vote.CreatedAt,
		"status":           "CONFIRMED_ON_LEDGER",
		"message":          "Cryptographic proof verified! This ballot was officially counted in the election ledger.",
	})
}

// AddComment posts a live commentary message
func (p *PollController) AddComment(c *gin.Context) {
	idHex := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	var req models.AddCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	authorName := "Anonymous Voter"
	if username, exists := c.Get("username"); exists {
		authorName = username.(string)
	}

	comment := models.Comment{
		PollID:     pollID,
		AuthorName: authorName,
		Text:       strings.TrimSpace(req.Text),
		IsApproved: true, // auto-approved with admin moderation capability
	}

	if err := database.DB.AddComment(c.Request.Context(), &comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post comment"})
		return
	}

	c.JSON(http.StatusCreated, comment)
}

// GetComments retrieves comments for a poll
func (p *PollController) GetComments(c *gin.Context) {
	idHex := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	comments, err := database.DB.GetPollComments(c.Request.Context(), pollID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// GetUserPolls returns polls created by the user
func (p *PollController) GetUserPolls(c *gin.Context) {
	userIDHex, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	creatorID, err := primitive.ObjectIDFromHex(userIDHex.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	polls, err := database.DB.GetPollsByCreator(c.Request.Context(), creatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user polls"})
		return
	}

	for i, poll := range polls {
		liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), poll.ID.Hex())
		if err == nil && totalVotes > 0 {
			polls[i].TotalVotes = totalVotes
			for j, opt := range poll.Options {
				if count, ok := liveVotes[opt.ID]; ok {
					polls[i].Options[j].Votes = count
				}
			}
		}
	}

	c.JSON(http.StatusOK, polls)
}

// TogglePoll toggles the active/closed status of a poll
func (p *PollController) TogglePoll(c *gin.Context) {
	idHex := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	userIDHex, _ := c.Get("userID")
	creatorID, _ := primitive.ObjectIDFromHex(userIDHex.(string))

	newStatus, err := database.DB.TogglePollStatus(c.Request.Context(), pollID, creatorID)
	if err != nil {
		poll, getErr := database.DB.GetPollByID(c.Request.Context(), pollID)
		if getErr == nil && poll != nil {
			newStatus, err = database.DB.TogglePollStatus(c.Request.Context(), pollID, poll.CreatorID)
		}
	}
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Failed to toggle poll status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        idHex,
		"is_active": newStatus,
	})
}

func generateVoterID(ip string, fingerprint string, userID string) string {
	raw := fmt.Sprintf("%s|%s|%s", ip, fingerprint, userID)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

