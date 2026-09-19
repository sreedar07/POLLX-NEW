package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type JWTClaims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID primitive.ObjectID, username string, role string, secret string) (string, error) {
	if role == "" {
		role = "user"
	}
	claims := JWTClaims{
		UserID:   userID.Hex(),
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func validateToken(c *gin.Context, secret string) (*JWTClaims, bool) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
		c.Abort()
		return nil, false
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format. Expected 'Bearer <token>'"})
		c.Abort()
		return nil, false
	}

	tokenString := parts[1]
	claims := &JWTClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		c.Abort()
		return nil, false
	}

	c.Set("userID", claims.UserID)
	c.Set("username", claims.Username)
	c.Set("role", claims.Role)
	return claims, true
}

func AuthRequired(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := validateToken(c, secret); !ok {
			return
		}
		c.Next()
	}
}

func OptionalAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString := parts[1]
			claims := &JWTClaims{}

			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return []byte(secret), nil
			})

			if err == nil && token.Valid {
				c.Set("userID", claims.UserID)
				c.Set("username", claims.Username)
				c.Set("role", claims.Role)
			}
		}

		c.Next()
	}
}

func AdminRequired(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := validateToken(c, secret)
		if !ok {
			return
		}

		if claims.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required. Only administrator can perform this action."})
			c.Abort()
			return
		}

		c.Next()
	}
}
