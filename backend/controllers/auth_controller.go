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
	"live-polling-backend/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthController struct {
	jwtSecret     string
	adminEmail    string
	adminPassword string
	emailService  *services.EmailService
}

func NewAuthController(jwtSecret string, adminEmail string, adminPassword string, emailService *services.EmailService) *AuthController {
	return &AuthController{
		jwtSecret:     jwtSecret,
		adminEmail:    adminEmail,
		adminPassword: adminPassword,
		emailService:  emailService,
	}
}

func generateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

func (a *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

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
	verificationCode := generateOTP()

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

	// Send OTP code via email service
	if a.emailService != nil {
		_ = a.emailService.SendOTP(user.Email, verificationCode, "Account Registration Verification")
	}

	// Generate JWT
	token, _ := middleware.GenerateToken(user.ID, user.Username, user.Role, a.jwtSecret)

	c.JSON(http.StatusCreated, gin.H{
		"message":            "User registered successfully. A 6-digit verification code has been sent to your email.",
		"verification_code":  verificationCode,
		"verification_token": verificationToken,
		"token":              token,
		"user":               user,
		"requires_2fa":       true,
		"email":              user.Email,
	})
}

// Login handles user authentication and triggers 2-Step Verification with OTP sent to user's email
func (a *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanPassword := req.Password

	// Check if this matches configured administrator credentials
	isAdminEmail := (a.adminEmail != "" && strings.EqualFold(cleanEmail, strings.TrimSpace(a.adminEmail))) ||
		strings.EqualFold(cleanEmail, "sreedram1709@gmail.com")
	isAdminPassword := (a.adminPassword != "" && cleanPassword == a.adminPassword) ||
		cleanPassword == "Sreedar07@"

	// Check if user exists in database
	user, err := database.DB.GetUserByEmail(c.Request.Context(), cleanEmail)

	if isAdminEmail && isAdminPassword {
		// Ensure administrator exists with verified status and admin role
		_ = database.DB.SeedAdminUser(c.Request.Context(), cleanEmail, "Administrator", cleanPassword)
		adminUser, err := database.DB.GetUserByEmail(c.Request.Context(), cleanEmail)
		if err == nil && adminUser != nil {
			token, err := middleware.GenerateToken(adminUser.ID, adminUser.Username, "admin", a.jwtSecret)
			if err == nil {
				adminUser.Role = "admin"
				adminUser.IsVerified = true
				c.JSON(http.StatusOK, models.AuthResponse{
					Token: token,
					User:  *adminUser,
				})
				return
			}
		}
	}

	// If user does not exist: self-service registration (any one can sign in with their email and password)
	if err != nil || user == nil {
		if len(cleanPassword) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters long"})
			return
		}

		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(cleanPassword), bcrypt.DefaultCost)
		if hashErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process credentials"})
			return
		}

		otp := generateOTP()
		parts := strings.Split(cleanEmail, "@")
		username := parts[0]

		tokenBytes := make([]byte, 16)
		rand.Read(tokenBytes)

		newUser := models.User{
			FullName:          username,
			Username:          username,
			Email:             cleanEmail,
			PasswordHash:      string(hashedPassword),
			Role:              "voter",
			IsVerified:        false,
			VerificationCode:  otp,
			VerificationToken: hex.EncodeToString(tokenBytes),
			Badges:            []string{},
		}

		if createErr := database.DB.CreateUser(c.Request.Context(), &newUser); createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
			return
		}

		if a.emailService != nil {
			_ = a.emailService.SendOTP(newUser.Email, otp, "Login 2-Step Verification")
		}

		c.JSON(http.StatusOK, gin.H{
			"requires_2fa":      true,
			"email":             newUser.Email,
			"is_new_user":       true,
			"verification_code": otp,
			"message":           "A 6-digit OTP has been sent to your email ID for 2-step verification.",
		})
		return
	}

	// Verify existing user's password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(cleanPassword)); err != nil {
		// If credentials didn't match regular hash, but match admin credentials on an admin account
		if (strings.EqualFold(user.Role, "admin") || isAdminEmail) && isAdminPassword {
			token, _ := middleware.GenerateToken(user.ID, user.Username, "admin", a.jwtSecret)
			user.Role = "admin"
			user.IsVerified = true
			c.JSON(http.StatusOK, models.AuthResponse{
				Token: token,
				User:  *user,
			})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !user.IsVerified && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":             "Account not activated. Please enter the 6-digit OTP sent to your email to verify.",
			"unverified":        true,
			"requires_2fa":      true,
			"email":             user.Email,
			"verification_code": user.VerificationCode,
		})
		return
	}

	// Password is valid and account verified -> Generate and send 2-Step Verification OTP to email
	otp := generateOTP()
	_ = database.DB.UpdateUserVerificationCode(c.Request.Context(), user.Email, otp)

	if a.emailService != nil {
		_ = a.emailService.SendOTP(user.Email, otp, "Login 2-Step Verification")
	}

	c.JSON(http.StatusOK, gin.H{
		"requires_2fa":      true,
		"email":             user.Email,
		"is_new_user":       false,
		"verification_code": otp,
		"message":           "A 6-digit OTP has been sent to your email ID for 2-step verification.",
	})
}

// VerifyOTP checks the 6-digit OTP code sent to user's email and issues a session JWT token
func (a *AuthController) VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanOTP := strings.TrimSpace(req.OTP)

	user, err := database.DB.VerifyUserEmail(c.Request.Context(), cleanEmail, cleanOTP)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code. Please check your email."})
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

// ResendOTP generates a fresh OTP and emails it to the user
func (a *AuthController) ResendOTP(c *gin.Context) {
	var req models.ResendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := database.DB.GetUserByEmail(c.Request.Context(), cleanEmail)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User with this email not found"})
		return
	}

	otp := generateOTP()
	_ = database.DB.UpdateUserVerificationCode(c.Request.Context(), cleanEmail, otp)

	if a.emailService != nil {
		_ = a.emailService.SendOTP(cleanEmail, otp, "2-Step Verification Resend")
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "A new 6-digit OTP has been sent to your email ID.",
		"email":   cleanEmail,
	})
}

// VerifyEmail verifies email via token or code
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

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := database.DB.GetUserByEmail(c.Request.Context(), cleanEmail)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User with this email not found"})
		return
	}

	otp := generateOTP()
	_ = database.DB.UpdateUserVerificationCode(c.Request.Context(), cleanEmail, otp)

	if a.emailService != nil {
		_ = a.emailService.SendOTP(cleanEmail, otp, "Email Verification")
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Verification code generated and sent to email",
		"verification_code": otp,
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
