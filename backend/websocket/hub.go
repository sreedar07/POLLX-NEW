package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"live-polling-backend/database"
	"live-polling-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for WebSocket connections
	},
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	pollID string
}

type Hub struct {
	mu           sync.RWMutex
	polls        map[string]map[*Client]bool
	cancelSubs   map[string]func()
	register     chan *Client
	unregister   chan *Client
	broadcast    chan *models.LivePollUpdate
}

var GlobalHub *Hub

func InitHub() {
	GlobalHub = &Hub{
		polls:      make(map[string]map[*Client]bool),
		cancelSubs: make(map[string]func()),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *models.LivePollUpdate, 256),
	}
	go GlobalHub.run()
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, exists := h.polls[client.pollID]; !exists {
				h.polls[client.pollID] = make(map[*Client]bool)

				// Subscribe this poll to Redis Pub/Sub updates
				pollID := client.pollID
				cancelFn, err := database.Realtime.SubscribeToPoll(context.Background(), pollID, func(update *models.LivePollUpdate) {
					h.broadcast <- update
				})
				if err == nil && cancelFn != nil {
					h.cancelSubs[pollID] = cancelFn
				}
			}
			h.polls[client.pollID][client] = true
			h.mu.Unlock()

			// Send immediate current state to newly joined client
			votes, total, _ := database.Realtime.GetLiveVotes(context.Background(), client.pollID)
			initialPayload, _ := json.Marshal(models.LivePollUpdate{
				PollID:      client.pollID,
				TotalVotes:  total,
				OptionVotes: votes,
				Timestamp:   time.Now().UnixMilli(),
			})
			select {
			case client.send <- initialPayload:
			default:
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, exists := h.polls[client.pollID]; exists {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
				}
				if len(clients) == 0 {
					delete(h.polls, client.pollID)
					if cancelFn, hasCancel := h.cancelSubs[client.pollID]; hasCancel {
						cancelFn()
						delete(h.cancelSubs, client.pollID)
					}
				}
			}
			h.mu.Unlock()

		case update := <-h.broadcast:
			payload, err := json.Marshal(update)
			if err != nil {
				continue
			}

			h.mu.RLock()
			clients := h.polls[update.PollID]
			for client := range clients {
				select {
				case client.send <- payload:
				default:
					close(client.send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func HandleWebSocket(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll ID required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("[WebSocket] Upgrade error:", err)
		return
	}

	client := &Client{
		hub:    GlobalHub,
		conn:   conn,
		send:   make(chan []byte, 256),
		pollID: pollID,
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}
