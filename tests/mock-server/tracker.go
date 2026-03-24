package main

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

type LiveRequest struct {
	URL       string    `json:"url"`
	Method    string    `json:"method"`
	Timestamp time.Time `json:"timestamp"`
}

type Tracker struct {
	mu       sync.Mutex
	requests []LiveRequest
}

func (t *Tracker) Record(method, url string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.requests = append(t.requests, LiveRequest{
		URL: url, Method: method, Timestamp: time.Now(),
	})
}

func (t *Tracker) Reset() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.requests = t.requests[:0]
}

func (t *Tracker) All() []LiveRequest {
	t.mu.Lock()
	defer t.mu.Unlock()
	result := make([]LiveRequest, len(t.requests))
	copy(result, t.requests)
	return result
}

func (t *Tracker) Validate() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.requests) == 0 {
		return nil
	}
	lines := make([]string, len(t.requests))
	for i, req := range t.requests {
		lines[i] = fmt.Sprintf("%d. [%s] %s (%s)", i+1, req.Method, req.URL, req.Timestamp.Format(time.RFC3339))
	}
	return fmt.Errorf("test made %d unmocked request(s):\n%s\n\nCheck your test-specific mocks or add them to the default mocks.",
		len(t.requests), strings.Join(lines, "\n"))
}
