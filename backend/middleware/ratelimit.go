package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type clientRecord struct {
	attempts  int
	firstSeen time.Time
}

type LoginRateLimiter struct {
	mu      sync.Mutex
	records map[string]*clientRecord
	limit   int
	window  time.Duration
}

var defaultLimiter = &LoginRateLimiter{
	records: make(map[string]*clientRecord),
	limit:   5, // Max 5 login attempts
	window:  1 * time.Minute, // per 1 minute window
}

// RateLimitLogin enforces rate limiting on login attempts to prevent brute force attacks
func RateLimitLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown_client"
		}

		defaultLimiter.mu.Lock()
		now := time.Now()

		record, exists := defaultLimiter.records[ip]
		if !exists || now.Sub(record.firstSeen) > defaultLimiter.window {
			// Start new window
			defaultLimiter.records[ip] = &clientRecord{
				attempts:  1,
				firstSeen: now,
			}
			defaultLimiter.mu.Unlock()
			c.Next()
			return
		}

		if record.attempts >= defaultLimiter.limit {
			remainingSeconds := int(defaultLimiter.window.Seconds() - now.Sub(record.firstSeen).Seconds())
			if remainingSeconds <= 0 {
				remainingSeconds = 1
			}
			defaultLimiter.mu.Unlock()

			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many login attempts. Please wait 1 minute before trying again.",
				"retry_after_seconds": remainingSeconds,
			})
			return
		}

		record.attempts++
		defaultLimiter.mu.Unlock()
		c.Next()
	}
}

// ResetLoginRateLimits resets all rate limiting state (useful for automated testing)
func ResetLoginRateLimits() {
	defaultLimiter.mu.Lock()
	defaultLimiter.records = make(map[string]*clientRecord)
	defaultLimiter.mu.Unlock()
}
