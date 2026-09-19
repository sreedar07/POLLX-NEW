package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FullName          string             `bson:"full_name" json:"full_name"`
	Username          string             `bson:"username" json:"username"`
	Email             string             `bson:"email" json:"email"`
	PasswordHash      string             `bson:"password_hash" json:"-"`
	Role              string             `bson:"role" json:"role"` // "admin" or "voter"
	IsVerified        bool               `bson:"is_verified" json:"is_verified"`
	VerificationToken string             `bson:"verification_token,omitempty" json:"verification_token,omitempty"`
	VerificationCode  string             `bson:"verification_code,omitempty" json:"verification_code,omitempty"`
	Department        string             `bson:"department,omitempty" json:"department,omitempty"`
	Bio               string             `bson:"bio,omitempty" json:"bio,omitempty"`
	Badges            []string           `bson:"badges,omitempty" json:"badges,omitempty"`
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
}

type PollOption struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Votes int64  `bson:"votes" json:"votes"`
}

type Poll struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID   primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	CreatorName string             `bson:"creator_name" json:"creator_name"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Category    string             `bson:"category,omitempty" json:"category,omitempty"`
	Options     []PollOption       `bson:"options" json:"options"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
	IsBlind     bool               `bson:"is_blind" json:"is_blind"` // Hide tallies until vote is cast
	TotalVotes  int64              `bson:"total_votes" json:"total_votes"`
	StartTime   *time.Time         `bson:"start_time,omitempty" json:"start_time,omitempty"`
	EndTime     *time.Time         `bson:"end_time,omitempty" json:"end_time,omitempty"`
	DurationMin int                `bson:"duration_min,omitempty" json:"duration_min,omitempty"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

type VoteRecord struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID          primitive.ObjectID `bson:"poll_id" json:"poll_id"`
	PollTitle       string             `bson:"poll_title" json:"poll_title"`
	OptionID        string             `bson:"option_id" json:"option_id"`
	OptionText      string             `bson:"option_text" json:"option_text"`
	VoterID         string             `bson:"voter_id" json:"voter_id"`
	UserID          string             `bson:"user_id,omitempty" json:"user_id,omitempty"`
	VoterDepartment string             `bson:"voter_department,omitempty" json:"voter_department,omitempty"`
	ReceiptHash     string             `bson:"receipt_hash" json:"receipt_hash"` // Cryptographic SHA-256 receipt
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
}

type AuditLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ActorID    string             `bson:"actor_id" json:"actor_id"`
	ActorEmail string             `bson:"actor_email" json:"actor_email"`
	Action     string             `bson:"action" json:"action"` // LOGIN, POLL_CREATE, STATUS_TOGGLE, RESET_VOTES, EXPORT_CSV, EXPORT_PDF, COMMENT_MODERATE
	TargetID   string             `bson:"target_id,omitempty" json:"target_id,omitempty"`
	Details    string             `bson:"details" json:"details"`
	IPAddress  string             `bson:"ip_address" json:"ip_address"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

type Comment struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID     primitive.ObjectID `bson:"poll_id" json:"poll_id"`
	AuthorName string             `bson:"author_name" json:"author_name"`
	Text       string             `bson:"text" json:"text"`
	IsApproved bool               `bson:"is_approved" json:"is_approved"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

// DTOs & Request Payloads
type RegisterRequest struct {
	FullName   string `json:"full_name"`
	Username   string `json:"username"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	Department string `json:"department"`
	Bio        string `json:"bio"`
}


type VerifyEmailRequest struct {
	Token string `json:"token"`
	Code  string `json:"code"`
	Email string `json:"email"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreatePollRequest struct {
	Title           string   `json:"title" binding:"required,min=3,max=200"`
	Description     string   `json:"description" binding:"max=500"`
	Category        string   `json:"category"`
	IsBlind         bool     `json:"is_blind"`
	Options         []string `json:"options" binding:"required,min=2,max=10,dive,min=1,max=100"`
	DurationMinutes int      `json:"duration_minutes"`
	StartTime       string   `json:"start_time,omitempty"`
	EndTime         string   `json:"end_time,omitempty"`
}

type VoteRequest struct {
	OptionID    string `json:"option_id" binding:"required"`
	Fingerprint string `json:"fingerprint"`
	Department  string `json:"department"`
}

type VoteResponse struct {
	Message     string          `json:"message"`
	ReceiptHash string          `json:"receipt_hash"`
	Update      *LivePollUpdate `json:"update"`
	OptionText  string          `json:"option_text"`
	Badges      []string        `json:"badges,omitempty"`
}

type LivePollUpdate struct {
	PollID          string           `json:"poll_id"`
	TotalVotes      int64            `json:"total_votes"`
	OptionVotes     map[string]int64 `json:"option_votes"`
	LastVotedOption string           `json:"last_voted_option,omitempty"`
	ActiveViewers   int              `json:"active_viewers,omitempty"`
	RecentVote      *VoteRecord      `json:"recent_vote,omitempty"`
	Timestamp       int64            `json:"timestamp"`
}

type AddCommentRequest struct {
	Text string `json:"text" binding:"required,min=1,max=280"`
}

type DemographicStat struct {
	Department string `json:"department"`
	Votes      int64  `json:"votes"`
}

type AdminAnalyticsResponse struct {
	PollID       string                     `json:"poll_id"`
	PollTitle    string                     `json:"poll_title"`
	TotalVotes   int64                      `json:"total_votes"`
	OptionVotes  map[string]int64           `json:"option_votes"`
	Demographics []DemographicStat          `json:"demographics"`
	RecentVotes  []VoteRecord               `json:"recent_votes"`
	TimeVelocity []map[string]interface{}   `json:"time_velocity"`
}

