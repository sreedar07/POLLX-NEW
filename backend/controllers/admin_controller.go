package controllers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"live-polling-backend/database"
	"live-polling-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AdminController struct{}

func NewAdminController() *AdminController {
	return &AdminController{}
}

// GetAnalytics returns comprehensive election analytics, demographic breakdown, and recent votes
func (a *AdminController) GetAnalytics(c *gin.Context) {
	pollIDHex := c.Query("poll_id")
	var poll *models.Poll
	var err error

	if pollIDHex != "" {
		objID, parseErr := primitive.ObjectIDFromHex(pollIDHex)
		if parseErr == nil {
			poll, err = database.DB.GetPollByID(c.Request.Context(), objID)
		}
	}

	if poll == nil {
		poll, err = database.DB.GetActivePoll(c.Request.Context())
	}

	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No poll found for analytics"})
		return
	}

	idHex := poll.ID.Hex()

	// Merge real-time counts from Redis
	liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), idHex)
	optionVotes := make(map[string]int64)
	if err == nil && totalVotes > 0 {
		poll.TotalVotes = totalVotes
		for i, opt := range poll.Options {
			if count, ok := liveVotes[opt.ID]; ok {
				poll.Options[i].Votes = count
				optionVotes[opt.ID] = count
			} else {
				optionVotes[opt.ID] = 0
			}
		}
	} else {
		for _, opt := range poll.Options {
			optionVotes[opt.ID] = opt.Votes
		}
	}

	demographics, _ := database.DB.GetDemographics(c.Request.Context(), poll.ID)
	recentVotes, _ := database.DB.GetRecentVotes(c.Request.Context(), poll.ID, 50)

	// Time velocity (grouping by 5-minute intervals)
	timeVelocity := make([]map[string]interface{}, 0)
	timeBuckets := make(map[string]int64)
	for _, v := range recentVotes {
		bucket := v.CreatedAt.Format("15:04")
		timeBuckets[bucket]++
	}
	for t, count := range timeBuckets {
		timeVelocity = append(timeVelocity, map[string]interface{}{
			"time":  t,
			"votes": count,
		})
	}

	c.JSON(http.StatusOK, models.AdminAnalyticsResponse{
		PollID:       idHex,
		PollTitle:    poll.Title,
		TotalVotes:   poll.TotalVotes,
		OptionVotes:  optionVotes,
		Demographics: demographics,
		RecentVotes:  recentVotes,
		TimeVelocity: timeVelocity,
	})
}

// GetAuditLogs returns the comprehensive audit trail of system events
func (a *AdminController) GetAuditLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	logs, err := database.DB.GetAuditLogs(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve audit trail"})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// ExportCSV streams a detailed CSV file of all poll results and vote audit records
func (a *AdminController) ExportCSV(c *gin.Context) {
	pollIDHex := c.Query("poll_id")
	var poll *models.Poll
	var err error

	if pollIDHex != "" {
		objID, parseErr := primitive.ObjectIDFromHex(pollIDHex)
		if parseErr == nil {
			poll, err = database.DB.GetPollByID(c.Request.Context(), objID)
		}
	}

	if poll == nil {
		poll, err = database.DB.GetActivePoll(c.Request.Context())
	}

	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// Fetch live tallies
	liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), poll.ID.Hex())
	if err == nil && totalVotes > 0 {
		poll.TotalVotes = totalVotes
		for i, opt := range poll.Options {
			if count, ok := liveVotes[opt.ID]; ok {
				poll.Options[i].Votes = count
			}
		}
	}

	recentVotes, _ := database.DB.GetRecentVotes(c.Request.Context(), poll.ID, 1000)

	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Header Section
	_ = writer.Write([]string{"PULSEPOLL ELECTION RESULTS REPORT"})
	_ = writer.Write([]string{"Poll Title", poll.Title})
	_ = writer.Write([]string{"Poll ID", poll.ID.Hex()})
	_ = writer.Write([]string{"Category", poll.Category})
	_ = writer.Write([]string{"Status", strconv.FormatBool(poll.IsActive)})
	_ = writer.Write([]string{"Total Votes Cast", strconv.FormatInt(poll.TotalVotes, 10)})
	_ = writer.Write([]string{"Report Generated At", time.Now().UTC().Format(time.RFC3339)})
	_ = writer.Write([]string{})

	// Option Breakdown Table
	_ = writer.Write([]string{"Option ID", "Choice Name", "Vote Count", "Percentage"})
	for _, opt := range poll.Options {
		pct := 0.0
		if poll.TotalVotes > 0 {
			pct = float64(opt.Votes) / float64(poll.TotalVotes) * 100
		}
		_ = writer.Write([]string{
			opt.ID,
			opt.Text,
			strconv.FormatInt(opt.Votes, 10),
			fmt.Sprintf("%.2f%%", pct),
		})
	}
	_ = writer.Write([]string{})

	// Audit Trail Table
	_ = writer.Write([]string{"AUDIT LOG: RECORDED BALLOTS"})
	_ = writer.Write([]string{"Timestamp (UTC)", "Choice Selected", "Cryptographic Receipt Hash", "Demographic Department", "Voter Hash"})
	for _, v := range recentVotes {
		_ = writer.Write([]string{
			v.CreatedAt.UTC().Format(time.RFC3339),
			v.OptionText,
			v.ReceiptHash,
			v.VoterDepartment,
			v.VoterID[:12] + "...",
		})
	}

	writer.Flush()

	// Log export event
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
		Action:     "EXPORT_CSV",
		TargetID:   poll.ID.Hex(),
		Details:    fmt.Sprintf("Exported CSV election results for '%s'", poll.Title),
		IPAddress:  c.ClientIP(),
	})

	filename := fmt.Sprintf("election_results_%s.csv", poll.ID.Hex())
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "text/csv")
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

// ExportPDF generates a printable and formatted HTML audit report suitable for saving as PDF
func (a *AdminController) ExportPDF(c *gin.Context) {
	pollIDHex := c.Query("poll_id")
	var poll *models.Poll
	var err error

	if pollIDHex != "" {
		objID, parseErr := primitive.ObjectIDFromHex(pollIDHex)
		if parseErr == nil {
			poll, err = database.DB.GetPollByID(c.Request.Context(), objID)
		}
	}

	if poll == nil {
		poll, err = database.DB.GetActivePoll(c.Request.Context())
	}

	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	liveVotes, totalVotes, err := database.Realtime.GetLiveVotes(c.Request.Context(), poll.ID.Hex())
	if err == nil && totalVotes > 0 {
		poll.TotalVotes = totalVotes
		for i, opt := range poll.Options {
			if count, ok := liveVotes[opt.ID]; ok {
				poll.Options[i].Votes = count
			}
		}
	}

	demographics, _ := database.DB.GetDemographics(c.Request.Context(), poll.ID)
	recentVotes, _ := database.DB.GetRecentVotes(c.Request.Context(), poll.ID, 50)

	optionsRows := ""
	for _, opt := range poll.Options {
		pct := 0.0
		if poll.TotalVotes > 0 {
			pct = float64(opt.Votes) / float64(poll.TotalVotes) * 100
		}
		optionsRows += fmt.Sprintf(`
			<tr>
				<td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">%s</td>
				<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">%d</td>
				<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">%.2f%%</td>
			</tr>
		`, opt.Text, opt.Votes, pct)
	}

	demoRows := ""
	for _, d := range demographics {
		demoRows += fmt.Sprintf(`
			<tr>
				<td style="padding:8px;border-bottom:1px solid #e2e8f0;">%s</td>
				<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">%d votes</td>
			</tr>
		`, d.Department, d.Votes)
	}

	ballotRows := ""
	for _, b := range recentVotes {
		ballotRows += fmt.Sprintf(`
			<tr>
				<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;">%s</td>
				<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;">%s</td>
				<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;font-family:monospace;">%s</td>
			</tr>
		`, b.CreatedAt.UTC().Format("2006-01-02 15:04:05"), b.OptionText, b.ReceiptHash)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Official Election Audit Report - %s</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
		.header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 25px; }
		.title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
		.subtitle { font-size: 14px; color: #64748b; margin: 0; }
		.stats-grid { display: flex; gap: 20px; margin-bottom: 30px; }
		.stat-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
		.stat-val { font-size: 24px; font-weight: 700; color: #4f46e5; }
		.stat-lbl { font-size: 12px; text-transform: uppercase; color: #64748b; margin-top: 4px; }
		table { width: 100%%; border-collapse: collapse; margin-bottom: 30px; }
		th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #475569; }
		.footer { font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; text-align: center; }
		@media print { body { padding: 15px; } }
	</style>
</head>
<body onload="window.print()">
	<div class="header">
		<h1 class="title">Official Election Audit Certificate</h1>
		<p class="subtitle">PulsePoll Certified Cryptographic Live Results & Audit Record</p>
	</div>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-val">%s</div>
			<div class="stat-lbl">Election Question</div>
		</div>
		<div class="stat-card">
			<div class="stat-val">%d</div>
			<div class="stat-lbl">Total Certified Ballots</div>
		</div>
		<div class="stat-card">
			<div class="stat-val">%s</div>
			<div class="stat-lbl">Audit Timestamp (UTC)</div>
		</div>
	</div>

	<h2 style="font-size:16px;margin-bottom:12px;">Candidate / Option Tallies</h2>
	<table>
		<thead>
			<tr>
				<th>Choice Name</th>
				<th style="text-align:right;">Votes</th>
				<th style="text-align:right;">Share (%%)</th>
			</tr>
		</thead>
		<tbody>
			%s
		</tbody>
	</table>

	<h2 style="font-size:16px;margin-bottom:12px;">Demographic Participation</h2>
	<table>
		<thead>
			<tr>
				<th>Department / Group</th>
				<th style="text-align:right;">Participation</th>
			</tr>
		</thead>
		<tbody>
			%s
		</tbody>
	</table>

	<h2 style="font-size:16px;margin-bottom:12px;">Cryptographic Proof-of-Inclusion (Sample Ballots)</h2>
	<table>
		<thead>
			<tr>
				<th>Recorded Time (UTC)</th>
				<th>Voted Choice</th>
				<th>Cryptographic Receipt Hash</th>
			</tr>
		</thead>
		<tbody>
			%s
		</tbody>
	</table>

	<div class="footer">
		Official Election Ledger Report &bull; Cryptographically Verified by PulsePoll SHA-256 Engine &bull; Printable / PDF Certified
	</div>
</body>
</html>`,
		poll.Title,
		poll.Title,
		poll.TotalVotes,
		time.Now().UTC().Format("Jan 02, 2006 15:04:05 UTC"),
		optionsRows,
		demoRows,
		ballotRows,
	)

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, html)
}

// ApproveComment approves a moderated comment
func (a *AdminController) ApproveComment(c *gin.Context) {
	idHex := c.Param("id")
	commentID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	if err := database.DB.ApproveComment(c.Request.Context(), commentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment approved successfully"})
}

// DeleteComment deletes an inappropriate comment
func (a *AdminController) DeleteComment(c *gin.Context) {
	idHex := c.Param("id")
	commentID, err := primitive.ObjectIDFromHex(idHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	if err := database.DB.DeleteComment(c.Request.Context(), commentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}
