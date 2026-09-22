package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"live-polling-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type Storage interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	VerifyUserEmail(ctx context.Context, email, tokenOrCode string) (*models.User, error)
	UpdateUserVerificationCode(ctx context.Context, email, code string) error
	CreatePoll(ctx context.Context, poll *models.Poll) error
	GetPollByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error)
	GetAllPolls(ctx context.Context) ([]models.Poll, error)
	GetPollsByCreator(ctx context.Context, creatorID primitive.ObjectID) ([]models.Poll, error)
	UpdatePollVotes(ctx context.Context, pollID primitive.ObjectID, optionVotes map[string]int64, totalVotes int64) error
	TogglePollStatus(ctx context.Context, pollID primitive.ObjectID, creatorID primitive.ObjectID) (bool, error)
	GetActivePoll(ctx context.Context) (*models.Poll, error)
	SetActivePoll(ctx context.Context, poll *models.Poll) error
	ResetPollVotes(ctx context.Context, pollID primitive.ObjectID) error
	RecordVote(ctx context.Context, vote *models.VoteRecord) error
	GetUserVotes(ctx context.Context, userID string) ([]models.VoteRecord, error)
	VerifyVoteReceipt(ctx context.Context, receiptHash string) (*models.VoteRecord, error)
	GetDemographics(ctx context.Context, pollID primitive.ObjectID) ([]models.DemographicStat, error)
	GetRecentVotes(ctx context.Context, pollID primitive.ObjectID, limit int) ([]models.VoteRecord, error)
	LogAuditEvent(ctx context.Context, auditLog *models.AuditLog) error
	GetAuditLogs(ctx context.Context, limit int) ([]models.AuditLog, error)
	AddComment(ctx context.Context, comment *models.Comment) error
	GetPollComments(ctx context.Context, pollID primitive.ObjectID) ([]models.Comment, error)
	ApproveComment(ctx context.Context, commentID primitive.ObjectID) error
	DeleteComment(ctx context.Context, commentID primitive.ObjectID) error
	SeedAdminUser(ctx context.Context, email, username, password string) error
	SeedDefaultPoll(ctx context.Context) (*models.Poll, error)
	IsRealDB() bool
}

type MongoStorage struct {
	client    *mongo.Client
	database  *mongo.Database
	users     *mongo.Collection
	polls     *mongo.Collection
	votes     *mongo.Collection
	auditLogs *mongo.Collection
	comments  *mongo.Collection
}

type InMemoryStorage struct {
	mu        sync.RWMutex
	users     map[string]models.User // keyed by email
	polls     map[string]models.Poll // keyed by hex ID
	votes     []models.VoteRecord
	auditLogs []models.AuditLog
	comments  []models.Comment
}

var DB Storage

func InitMongo(uri string) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Printf("⚠️ MongoDB Atlas connect error: %v. Activating resilient in-memory storage fallback.", err)
		DB = NewInMemoryStorage()
		return
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Printf("⚠️ MongoDB Atlas ping failed (Atlas IP access restriction or network): %v. Activating in-memory storage fallback.", err)
		DB = NewInMemoryStorage()
		return
	}

	db := client.Database("live_polling")
	mongoStorage := &MongoStorage{
		client:    client,
		database:  db,
		users:     db.Collection("users"),
		polls:     db.Collection("polls"),
		votes:     db.Collection("votes"),
		auditLogs: db.Collection("audit_logs"),
		comments:  db.Collection("comments"),
	}

	// Create indexes
	_, _ = mongoStorage.users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	_, _ = mongoStorage.votes.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "receipt_hash", Value: 1}},
	})
	_, _ = mongoStorage.votes.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "user_id", Value: 1}},
	})

	DB = mongoStorage
	log.Println("✅ Successfully connected to MongoDB Atlas (live_polling DB)")
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		users:     make(map[string]models.User),
		polls:     make(map[string]models.Poll),
		votes:     make([]models.VoteRecord, 0),
		auditLogs: make([]models.AuditLog, 0),
		comments:  make([]models.Comment, 0),
	}
}

// ==================== MONGO STORAGE IMPLEMENTATION ====================

func (m *MongoStorage) IsRealDB() bool { return true }

func (m *MongoStorage) CreateUser(ctx context.Context, user *models.User) error {
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	_, err := m.users.InsertOne(ctx, user)
	return err
}

func (m *MongoStorage) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	clean := strings.ToLower(strings.TrimSpace(email))
	filter := bson.M{
		"email": primitive.Regex{Pattern: "^" + regexp.QuoteMeta(clean) + "$", Options: "i"},
	}
	err := m.users.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (m *MongoStorage) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := m.users.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (m *MongoStorage) VerifyUserEmail(ctx context.Context, email, tokenOrCode string) (*models.User, error) {
	filter := bson.M{
		"email": email,
		"$or": []bson.M{
			{"verification_token": tokenOrCode},
			{"verification_code": tokenOrCode},
		},
	}
	update := bson.M{
		"$set": bson.M{
			"is_verified": true,
			"badges":      bson.A{"Verified Citizen"},
		},
	}
	res := m.users.FindOneAndUpdate(ctx, filter, update, options.FindOneAndUpdate().SetReturnDocument(options.After))
	var user models.User
	if err := res.Decode(&user); err != nil {
		return nil, errors.New("invalid verification code or token")
	}
	return &user, nil
}

func (m *MongoStorage) UpdateUserVerificationCode(ctx context.Context, email, code string) error {
	clean := strings.ToLower(strings.TrimSpace(email))
	filter := bson.M{
		"email": primitive.Regex{Pattern: "^" + regexp.QuoteMeta(clean) + "$", Options: "i"},
	}
	update := bson.M{
		"$set": bson.M{
			"verification_code": code,
		},
	}
	_, err := m.users.UpdateOne(ctx, filter, update)
	return err
}

func (m *MongoStorage) CreatePoll(ctx context.Context, poll *models.Poll) error {
	poll.ID = primitive.NewObjectID()
	poll.CreatedAt = time.Now()
	poll.IsActive = true
	poll.TotalVotes = 0
	_, err := m.polls.InsertOne(ctx, poll)
	return err
}

func (m *MongoStorage) GetPollByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	var poll models.Poll
	err := m.polls.FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

func (m *MongoStorage) GetPollsByCreator(ctx context.Context, creatorID primitive.ObjectID) ([]models.Poll, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := m.polls.Find(ctx, bson.M{"creator_id": creatorID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	if polls == nil {
		polls = []models.Poll{}
	}
	return polls, nil
}

func (m *MongoStorage) UpdatePollVotes(ctx context.Context, pollID primitive.ObjectID, optionVotes map[string]int64, totalVotes int64) error {
	poll, err := m.GetPollByID(ctx, pollID)
	if err != nil {
		return err
	}

	for i, opt := range poll.Options {
		if count, ok := optionVotes[opt.ID]; ok {
			poll.Options[i].Votes = count
		}
	}

	update := bson.M{
		"$set": bson.M{
			"options":     poll.Options,
			"total_votes": totalVotes,
		},
	}
	_, err = m.polls.UpdateOne(ctx, bson.M{"_id": pollID}, update)
	return err
}

func (m *MongoStorage) TogglePollStatus(ctx context.Context, pollID primitive.ObjectID, creatorID primitive.ObjectID) (bool, error) {
	poll, err := m.GetPollByID(ctx, pollID)
	if err != nil {
		return false, err
	}
	newStatus := !poll.IsActive
	_, err = m.polls.UpdateOne(ctx, bson.M{"_id": pollID}, bson.M{"$set": bson.M{"is_active": newStatus}})
	return newStatus, err
}

func (m *MongoStorage) GetActivePoll(ctx context.Context) (*models.Poll, error) {
	findOpts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	var poll models.Poll
	err := m.polls.FindOne(ctx, bson.M{"is_active": true}, findOpts).Decode(&poll)
	if err == nil {
		return &poll, nil
	}
	err = m.polls.FindOne(ctx, bson.M{}, findOpts).Decode(&poll)
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

func (m *MongoStorage) SetActivePoll(ctx context.Context, poll *models.Poll) error {
	_, _ = m.polls.UpdateMany(ctx, bson.M{}, bson.M{"$set": bson.M{"is_active": false}})
	return m.CreatePoll(ctx, poll)
}

func (m *MongoStorage) ResetPollVotes(ctx context.Context, pollID primitive.ObjectID) error {
	poll, err := m.GetPollByID(ctx, pollID)
	if err != nil {
		return err
	}
	for i := range poll.Options {
		poll.Options[i].Votes = 0
	}
	update := bson.M{
		"$set": bson.M{
			"options":     poll.Options,
			"total_votes": int64(0),
		},
	}
	_, err = m.polls.UpdateOne(ctx, bson.M{"_id": pollID}, update)
	return err
}

func (m *MongoStorage) GetAllPolls(ctx context.Context) ([]models.Poll, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := m.polls.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	if polls == nil {
		polls = []models.Poll{}
	}
	return polls, nil
}

func (m *MongoStorage) RecordVote(ctx context.Context, vote *models.VoteRecord) error {
	vote.ID = primitive.NewObjectID()
	vote.CreatedAt = time.Now()
	_, err := m.votes.InsertOne(ctx, vote)
	return err
}

func (m *MongoStorage) GetUserVotes(ctx context.Context, userID string) ([]models.VoteRecord, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := m.votes.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var records []models.VoteRecord
	if err := cursor.All(ctx, &records); err != nil {
		return nil, err
	}
	if records == nil {
		records = []models.VoteRecord{}
	}
	return records, nil
}

func (m *MongoStorage) VerifyVoteReceipt(ctx context.Context, receiptHash string) (*models.VoteRecord, error) {
	var vote models.VoteRecord
	err := m.votes.FindOne(ctx, bson.M{"receipt_hash": receiptHash}).Decode(&vote)
	if err != nil {
		return nil, err
	}
	return &vote, nil
}

func (m *MongoStorage) GetDemographics(ctx context.Context, pollID primitive.ObjectID) ([]models.DemographicStat, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": pollID}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$voter_department",
			"votes": bson.M{"$sum": 1},
		}}},
	}
	cursor, err := m.votes.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []DemographicStatGroup
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	stats := make([]models.DemographicStat, 0)
	for _, r := range results {
		dept := r.ID
		if dept == "" {
			dept = "General / Unspecified"
		}
		stats = append(stats, models.DemographicStat{
			Department: dept,
			Votes:      r.Votes,
		})
	}
	return stats, nil
}

type DemographicStatGroup struct {
	ID    string `bson:"_id"`
	Votes int64  `bson:"votes"`
}

func (m *MongoStorage) GetRecentVotes(ctx context.Context, pollID primitive.ObjectID, limit int) ([]models.VoteRecord, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit))
	cursor, err := m.votes.Find(ctx, bson.M{"poll_id": pollID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var records []models.VoteRecord
	if err := cursor.All(ctx, &records); err != nil {
		return nil, err
	}
	if records == nil {
		records = []models.VoteRecord{}
	}
	return records, nil
}

func (m *MongoStorage) LogAuditEvent(ctx context.Context, auditLog *models.AuditLog) error {
	auditLog.ID = primitive.NewObjectID()
	auditLog.CreatedAt = time.Now()
	_, err := m.auditLogs.InsertOne(ctx, auditLog)
	return err
}

func (m *MongoStorage) GetAuditLogs(ctx context.Context, limit int) ([]models.AuditLog, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit))
	cursor, err := m.auditLogs.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.AuditLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	if logs == nil {
		logs = []models.AuditLog{}
	}
	return logs, nil
}

func (m *MongoStorage) AddComment(ctx context.Context, comment *models.Comment) error {
	comment.ID = primitive.NewObjectID()
	comment.CreatedAt = time.Now()
	_, err := m.comments.InsertOne(ctx, comment)
	return err
}

func (m *MongoStorage) GetPollComments(ctx context.Context, pollID primitive.ObjectID) ([]models.Comment, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := m.comments.Find(ctx, bson.M{"poll_id": pollID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, err
	}
	if comments == nil {
		comments = []models.Comment{}
	}
	return comments, nil
}

func (m *MongoStorage) ApproveComment(ctx context.Context, commentID primitive.ObjectID) error {
	_, err := m.comments.UpdateOne(ctx, bson.M{"_id": commentID}, bson.M{"$set": bson.M{"is_approved": true}})
	return err
}

func (m *MongoStorage) DeleteComment(ctx context.Context, commentID primitive.ObjectID) error {
	_, err := m.comments.DeleteOne(ctx, bson.M{"_id": commentID})
	return err
}

func (m *MongoStorage) SeedAdminUser(ctx context.Context, email, username, password string) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	if cleanEmail == "" || password == "" {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	displayName := strings.TrimSpace(username)
	if displayName == "" {
		displayName = "Administrator"
	}

	existing, _ := m.GetUserByEmail(ctx, cleanEmail)
	if existing != nil {
		update := bson.M{
			"$set": bson.M{
				"password_hash": string(hash),
				"role":          "admin",
				"is_verified":   true,
				"full_name":     displayName,
			},
		}
		_, err := m.users.UpdateOne(ctx, bson.M{"_id": existing.ID}, update)
		return err
	}

	admin := &models.User{
		FullName:     displayName,
		Username:     displayName,
		Email:        cleanEmail,
		PasswordHash: string(hash),
		Role:         "admin",
		IsVerified:   true,
		Department:   "System Oversight",
		Badges:       []string{"System Administrator", "Verified Citizen"},
		CreatedAt:    time.Now(),
	}
	return m.CreateUser(ctx, admin)
}

func (m *MongoStorage) SeedDefaultPoll(ctx context.Context) (*models.Poll, error) {
	// Check if Poll 1 already exists
	var existingPoll models.Poll
	err := m.polls.FindOne(ctx, bson.M{"title": "Which programming language do you prefer?"}).Decode(&existingPoll)
	if err == nil {
		return &existingPoll, nil
	}

	// Deactivate any previously active polls
	_, _ = m.polls.UpdateMany(ctx, bson.M{}, bson.M{"$set": bson.M{"is_active": false}})

	poll1 := &models.Poll{
		ID:          primitive.NewObjectID(),
		CreatorName: "Swetha Admin",
		Title:       "Which programming language do you prefer?",
		Description: "Poll 1: Select your preferred programming language and see live results.",
		Category:    "Programming Languages",
		IsBlind:     false,
		Options: []models.PollOption{
			{ID: "opt_1", Text: "Python", Votes: 0},
			{ID: "opt_2", Text: "Java", Votes: 0},
			{ID: "opt_3", Text: "C++", Votes: 0},
			{ID: "opt_4", Text: "JavaScript", Votes: 0},
		},
		IsActive:   true,
		TotalVotes: 0,
		CreatedAt:  time.Now(),
	}

	poll2 := &models.Poll{
		ID:          primitive.NewObjectID(),
		CreatorName: "Swetha Admin",
		Title:       "Which technology is most important for modern web development?",
		Description: "Poll 2: Select the technology you consider most essential for modern web development.",
		Category:    "Web Development",
		IsBlind:     false,
		Options: []models.PollOption{
			{ID: "opt_1", Text: "React.js", Votes: 0},
			{ID: "opt_2", Text: "Node.js", Votes: 0},
			{ID: "opt_3", Text: "MongoDB", Votes: 0},
			{ID: "opt_4", Text: "Docker", Votes: 0},
			{ID: "opt_5", Text: "Git/GitHub", Votes: 0},
		},
		IsActive:   true,
		TotalVotes: 0,
		CreatedAt:  time.Now().Add(time.Second),
	}

	_, _ = m.polls.InsertOne(ctx, poll1)
	_, _ = m.polls.InsertOne(ctx, poll2)
	return poll1, nil
}

// ==================== IN-MEMORY STORAGE IMPLEMENTATION ====================

func (s *InMemoryStorage) IsRealDB() bool { return false }

func (s *InMemoryStorage) CreateUser(ctx context.Context, user *models.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	if _, exists := s.users[user.Email]; exists {
		return errors.New("user already exists")
	}
	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	s.users[user.Email] = *user
	return nil
}

func (s *InMemoryStorage) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	clean := strings.ToLower(strings.TrimSpace(email))
	for _, u := range s.users {
		if strings.ToLower(strings.TrimSpace(u.Email)) == clean {
			copy := u
			return &copy, nil
		}
	}
	return nil, mongo.ErrNoDocuments
}

func (s *InMemoryStorage) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, u := range s.users {
		if u.ID == id {
			return &u, nil
		}
	}
	return nil, mongo.ErrNoDocuments
}

func (s *InMemoryStorage) VerifyUserEmail(ctx context.Context, email, tokenOrCode string) (*models.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[email]
	if !exists {
		return nil, errors.New("user not found")
	}
	if user.VerificationToken != tokenOrCode && user.VerificationCode != tokenOrCode {
		return nil, errors.New("invalid verification code or token")
	}
	user.IsVerified = true
	user.Badges = append(user.Badges, "Verified Citizen")
	s.users[email] = user
	return &user, nil
}

func (s *InMemoryStorage) UpdateUserVerificationCode(ctx context.Context, email, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	clean := strings.ToLower(strings.TrimSpace(email))
	user, exists := s.users[clean]
	if !exists {
		found := false
		for k, u := range s.users {
			if strings.EqualFold(k, clean) {
				user = u
				clean = k
				found = true
				break
			}
		}
		if !found {
			return errors.New("user not found")
		}
	}
	user.VerificationCode = code
	s.users[clean] = user
	return nil
}

func (s *InMemoryStorage) CreatePoll(ctx context.Context, poll *models.Poll) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	poll.ID = primitive.NewObjectID()
	poll.CreatedAt = time.Now()
	poll.IsActive = true
	poll.TotalVotes = 0
	s.polls[poll.ID.Hex()] = *poll
	return nil
}

func (s *InMemoryStorage) GetPollByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	poll, exists := s.polls[id.Hex()]
	if !exists {
		return nil, mongo.ErrNoDocuments
	}
	return &poll, nil
}

func (s *InMemoryStorage) GetPollsByCreator(ctx context.Context, creatorID primitive.ObjectID) ([]models.Poll, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []models.Poll
	for _, p := range s.polls {
		if p.CreatorID == creatorID {
			result = append(result, p)
		}
	}
	if result == nil {
		result = []models.Poll{}
	}
	return result, nil
}

func (s *InMemoryStorage) UpdatePollVotes(ctx context.Context, pollID primitive.ObjectID, optionVotes map[string]int64, totalVotes int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	poll, exists := s.polls[pollID.Hex()]
	if !exists {
		return mongo.ErrNoDocuments
	}

	for i, opt := range poll.Options {
		if count, ok := optionVotes[opt.ID]; ok {
			poll.Options[i].Votes = count
		}
	}
	poll.TotalVotes = totalVotes
	s.polls[pollID.Hex()] = poll
	return nil
}

func (s *InMemoryStorage) TogglePollStatus(ctx context.Context, pollID primitive.ObjectID, creatorID primitive.ObjectID) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	poll, exists := s.polls[pollID.Hex()]
	if !exists {
		return false, mongo.ErrNoDocuments
	}
	poll.IsActive = !poll.IsActive
	s.polls[pollID.Hex()] = poll
	return poll.IsActive, nil
}

func (s *InMemoryStorage) GetActivePoll(ctx context.Context) (*models.Poll, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var activePoll *models.Poll
	var latestPoll *models.Poll
	for _, p := range s.polls {
		pCopy := p
		if latestPoll == nil || p.CreatedAt.After(latestPoll.CreatedAt) {
			latestPoll = &pCopy
		}
		if p.IsActive {
			if activePoll == nil || p.CreatedAt.After(activePoll.CreatedAt) {
				activePoll = &pCopy
			}
		}
	}
	if activePoll != nil {
		return activePoll, nil
	}
	if latestPoll != nil {
		return latestPoll, nil
	}
	return nil, mongo.ErrNoDocuments
}

func (s *InMemoryStorage) SetActivePoll(ctx context.Context, poll *models.Poll) error {
	s.mu.Lock()
	for k, p := range s.polls {
		p.IsActive = false
		s.polls[k] = p
	}
	s.mu.Unlock()
	return s.CreatePoll(ctx, poll)
}

func (s *InMemoryStorage) ResetPollVotes(ctx context.Context, pollID primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	poll, exists := s.polls[pollID.Hex()]
	if !exists {
		return mongo.ErrNoDocuments
	}
	for i := range poll.Options {
		poll.Options[i].Votes = 0
	}
	poll.TotalVotes = 0
	s.polls[pollID.Hex()] = poll
	return nil
}

func (s *InMemoryStorage) GetAllPolls(ctx context.Context) ([]models.Poll, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []models.Poll
	for _, p := range s.polls {
		result = append(result, p)
	}
	if result == nil {
		result = []models.Poll{}
	}
	return result, nil
}

func (s *InMemoryStorage) RecordVote(ctx context.Context, vote *models.VoteRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	vote.ID = primitive.NewObjectID()
	vote.CreatedAt = time.Now()
	s.votes = append(s.votes, *vote)
	return nil
}

func (s *InMemoryStorage) GetUserVotes(ctx context.Context, userID string) ([]models.VoteRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var userVotes []models.VoteRecord
	for i := len(s.votes) - 1; i >= 0; i-- {
		if s.votes[i].UserID == userID {
			userVotes = append(userVotes, s.votes[i])
		}
	}
	if userVotes == nil {
		userVotes = []models.VoteRecord{}
	}
	return userVotes, nil
}

func (s *InMemoryStorage) VerifyVoteReceipt(ctx context.Context, receiptHash string) (*models.VoteRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, v := range s.votes {
		if v.ReceiptHash == receiptHash {
			vCopy := v
			return &vCopy, nil
		}
	}
	return nil, errors.New("receipt not found")
}

func (s *InMemoryStorage) GetDemographics(ctx context.Context, pollID primitive.ObjectID) ([]models.DemographicStat, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	counts := make(map[string]int64)
	for _, v := range s.votes {
		if v.PollID == pollID {
			dept := v.VoterDepartment
			if dept == "" {
				dept = "General / Unspecified"
			}
			counts[dept]++
		}
	}

	stats := make([]models.DemographicStat, 0)
	for dept, count := range counts {
		stats = append(stats, models.DemographicStat{
			Department: dept,
			Votes:      count,
		})
	}
	return stats, nil
}

func (s *InMemoryStorage) GetRecentVotes(ctx context.Context, pollID primitive.ObjectID, limit int) ([]models.VoteRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var recs []models.VoteRecord
	for i := len(s.votes) - 1; i >= 0; i-- {
		if s.votes[i].PollID == pollID {
			recs = append(recs, s.votes[i])
			if len(recs) >= limit {
				break
			}
		}
	}
	if recs == nil {
		recs = []models.VoteRecord{}
	}
	return recs, nil
}

func (s *InMemoryStorage) LogAuditEvent(ctx context.Context, auditLog *models.AuditLog) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	auditLog.ID = primitive.NewObjectID()
	auditLog.CreatedAt = time.Now()
	s.auditLogs = append(s.auditLogs, *auditLog)
	return nil
}

func (s *InMemoryStorage) GetAuditLogs(ctx context.Context, limit int) ([]models.AuditLog, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var logs []models.AuditLog
	for i := len(s.auditLogs) - 1; i >= 0; i-- {
		logs = append(logs, s.auditLogs[i])
		if len(logs) >= limit {
			break
		}
	}
	if logs == nil {
		logs = []models.AuditLog{}
	}
	return logs, nil
}

func (s *InMemoryStorage) AddComment(ctx context.Context, comment *models.Comment) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	comment.ID = primitive.NewObjectID()
	comment.CreatedAt = time.Now()
	s.comments = append(s.comments, *comment)
	return nil
}

func (s *InMemoryStorage) GetPollComments(ctx context.Context, pollID primitive.ObjectID) ([]models.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var comments []models.Comment
	for _, c := range s.comments {
		if c.PollID == pollID {
			comments = append(comments, c)
		}
	}
	if comments == nil {
		comments = []models.Comment{}
	}
	return comments, nil
}

func (s *InMemoryStorage) ApproveComment(ctx context.Context, commentID primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, c := range s.comments {
		if c.ID == commentID {
			s.comments[i].IsApproved = true
			return nil
		}
	}
	return errors.New("comment not found")
}

func (s *InMemoryStorage) DeleteComment(ctx context.Context, commentID primitive.ObjectID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, c := range s.comments {
		if c.ID == commentID {
			s.comments = append(s.comments[:i], s.comments[i+1:]...)
			return nil
		}
	}
	return errors.New("comment not found")
}

func (s *InMemoryStorage) SeedAdminUser(ctx context.Context, email, username, password string) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	if cleanEmail == "" || password == "" {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	displayName := strings.TrimSpace(username)
	if displayName == "" {
		displayName = "Administrator"
	}

	existing, _ := s.GetUserByEmail(ctx, cleanEmail)
	if existing != nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		existing.PasswordHash = string(hash)
		existing.Role = "admin"
		existing.IsVerified = true
		existing.FullName = displayName
		s.users[existing.Email] = *existing
		s.users[cleanEmail] = *existing
		return nil
	}

	admin := &models.User{
		FullName:     displayName,
		Username:     displayName,
		Email:        cleanEmail,
		PasswordHash: string(hash),
		Role:         "admin",
		IsVerified:   true,
		Department:   "System Oversight",
		Badges:       []string{"System Administrator", "Verified Citizen"},
		CreatedAt:    time.Now(),
	}
	return s.CreateUser(ctx, admin)
}

func (s *InMemoryStorage) SeedDefaultPoll(ctx context.Context) (*models.Poll, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, p := range s.polls {
		if p.Title == "Which programming language do you prefer?" {
			pCopy := p
			return &pCopy, nil
		}
	}

	// Deactivate any previous polls
	for id, p := range s.polls {
		p.IsActive = false
		s.polls[id] = p
	}

	poll1 := models.Poll{
		ID:          primitive.NewObjectID(),
		CreatorName: "Swetha Admin",
		Title:       "Which programming language do you prefer?",
		Description: "Poll 1: Select your preferred programming language and see live results.",
		Category:    "Programming Languages",
		IsBlind:     false,
		Options: []models.PollOption{
			{ID: "opt_1", Text: "Python", Votes: 0},
			{ID: "opt_2", Text: "Java", Votes: 0},
			{ID: "opt_3", Text: "C++", Votes: 0},
			{ID: "opt_4", Text: "JavaScript", Votes: 0},
		},
		IsActive:   true,
		TotalVotes: 0,
		CreatedAt:  time.Now(),
	}

	poll2 := models.Poll{
		ID:          primitive.NewObjectID(),
		CreatorName: "Swetha Admin",
		Title:       "Which technology is most important for modern web development?",
		Description: "Poll 2: Select the technology you consider most essential for modern web development.",
		Category:    "Web Development",
		IsBlind:     false,
		Options: []models.PollOption{
			{ID: "opt_1", Text: "React.js", Votes: 0},
			{ID: "opt_2", Text: "Node.js", Votes: 0},
			{ID: "opt_3", Text: "MongoDB", Votes: 0},
			{ID: "opt_4", Text: "Docker", Votes: 0},
			{ID: "opt_5", Text: "Git/GitHub", Votes: 0},
		},
		IsActive:   true,
		TotalVotes: 0,
		CreatedAt:  time.Now().Add(time.Second),
	}

	s.polls[poll1.ID.Hex()] = poll1
	s.polls[poll2.ID.Hex()] = poll2
	return &poll1, nil
}

// GenerateReceipt creates a verifiable SHA-256 cryptographic receipt
func GenerateReceipt(pollID, optionID, voterID string, timestamp int64) string {
	raw := fmt.Sprintf("BALLOT::%s::%s::%s::%d::SALT_99381", pollID, optionID, voterID, timestamp)
	hash := sha256.Sum256([]byte(raw))
	return "VOTE-" + hex.EncodeToString(hash[:16])
}
