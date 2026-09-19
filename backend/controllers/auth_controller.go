package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"strings"

	"live-polling-backend/database"
	"live-polling-backend/middleware"
	"live-polling-backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthController struct {
	jwtSecret  string
	adminEmail string
}

func NewAuthController(jwtSecret string, adminEmail string) *AuthController {
	return &AuthController{
		jwtSecret:  jwtSecret,
		adminEmail: adminEmail,
	}
}

func (a *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Email duplicate check
	existingUser, _ := database.DB.GetUserByEmail(c.Request.Context(), req.Email)
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A user with this email already exists"})
		return
	}

	// Basic password length validation
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters long"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
		return
	}

	// Generate 6-digit verification code
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	verificationCode := fmt.Sprintf("%06d", n.Int64()+100000)

	// Generate verification token
	tokenBytes := make([]byte, 16)
	rand.Read(tokenBytes)
	verificationToken := hex.EncodeToString(tokenBytes)

	username := req.Username
	if username == "" {
		username = req.FullName
	}
	if username == "" {
		parts := strings.Split(req.Email, "@")
		username = parts[0]
	}

	role := "voter"
	isVerified := false
	if a.adminEmail != "" && strings.EqualFold(req.Email, a.adminEmail) {
		role = "admin"
		isVerified = true
	}

	user := models.User{
		FullName:          req.FullName,
		Username:          username,
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		Role:              role,
		IsVerified:        isVerified,
		VerificationCode:  verificationCode,
		VerificationToken: verificationToken,
		Department:        req.Department,
		Bio:               req.Bio,
		Badges:            []string{},
	}

	if err := database.DB.CreateUser(c.Request.Context(), &user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
		return
	}

	// Generate JWT
	token, _ := middleware.GenerateToken(user.ID, user.Username, user.Role, a.jwtSecret)

	c.JSON(http.StatusCreated, gin.H{
		"message":            "User registered successfully. Please verify your email with the 6-digit code.",
		"verification_code":  verificationCode,
		"verification_token": verificationToken,
		"token":              token,
		"user":               user,
	})
}

func (a *AuthController) VerifyEmail(c *gin.Context) {
	var req models.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokenOrCode := req.Code
	if tokenOrCode == "" {
		tokenOrCode = req.Token
	}

	user, err := database.DB.VerifyUserEmail(c.Request.Context(), req.Email, tokenOrCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role, a.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func (a *AuthController) ResendCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := database.DB.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User with this email not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Verification code generated",
		"verification_code": user.VerificationCode,
	})
}

func (a *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := database.DB.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !user.IsVerified && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":      "Account not activated. Please verify your email address before logging in.",
			"unverified": true,
			"email":      user.Email,
		})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role, a.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func (a *AuthController) GetMe(c *gin.Context) {
	userIDHex, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(userIDHex.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := database.DB.GetUserByID(c.Request.Context(), objID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
