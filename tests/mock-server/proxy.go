package main

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

type ProxyServer struct {
	rules     *RuleStore
	tracker   *Tracker
	forwarder *Forwarder

	bridgeMu          sync.RWMutex
	callbackBridgeURL string
}

func (s *ProxyServer) SetCallbackBridgeURL(url string) {
	s.bridgeMu.Lock()
	defer s.bridgeMu.Unlock()
	s.callbackBridgeURL = url
}

func (s *ProxyServer) getCallbackBridgeURL() string {
	s.bridgeMu.RLock()
	defer s.bridgeMu.RUnlock()
	return s.callbackBridgeURL
}

func (s *ProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	urlEndpoint := r.URL.Query().Get("url")
	if urlEndpoint == "" {
		http.Error(w, `{"error":"missing url parameter"}`, http.StatusBadRequest)
		return
	}
	log.Printf("[Proxy] %s %s", r.Method, urlEndpoint)

	var body []byte
	if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch {
		var err error
		body, err = io.ReadAll(r.Body)
		if err != nil {
			// Client dropped connection — return cleanly. No unhandled rejection.
			return
		}
	}

	// Try callback bridge first so testSpecificMock handlers take priority over
	// DEFAULT_MOCKS static rules. The bridge returns X-No-Match: true when no
	// handler matches, so we fall through to static rules for default mocks.
	if bridgeURL := s.getCallbackBridgeURL(); bridgeURL != "" {
		if s.tryBridge(w, r.Method, urlEndpoint, body, bridgeURL, r.Header) {
			log.Printf("[Proxy] bridge handled: %s %s", r.Method, urlEndpoint)
			return
		}
		log.Printf("[Proxy] bridge no-match: %s %s", r.Method, urlEndpoint)
	}

	if rule, ok := s.rules.Match(r.Method, urlEndpoint, body); ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(rule.ResponseCode)
		w.Write(rule.Response)
		return
	}

	s.tracker.Record(r.Method, urlEndpoint)
	s.forwarder.Forward(w, r.Method, urlEndpoint, body, r.Header)
}

var bridgeHTTPClient = &http.Client{Timeout: 10 * time.Second}

// tryBridge forwards the request to the JavaScript callback bridge.
// Returns true if the bridge handled the request, false if no handler matched.
func (s *ProxyServer) tryBridge(w http.ResponseWriter, method, urlEndpoint string, body []byte, bridgeURL string, origHeaders http.Header) bool {
	req, err := http.NewRequest(method, bridgeURL, bytes.NewReader(body))
	if err != nil {
		return false
	}
	// Forward original request headers so JS handlers (e.g. getSrpIdentifierFromHeaders)
	// can access Authorization and other app-sent headers.
	for key, vals := range origHeaders {
		for _, v := range vals {
			req.Header.Add(key, v)
		}
	}
	// Pass the decoded target URL so the JS bridge can run URL-matching predicates.
	req.Header.Set("X-Proxy-URL", urlEndpoint)

	resp, err := bridgeHTTPClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// Bridge signals "no handler matched" with this header — fall through to forwarder.
	if resp.Header.Get("X-No-Match") == "true" {
		return false
	}

	respBody, _ := io.ReadAll(resp.Body)
	for k, vals := range resp.Header {
		for _, v := range vals {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
	return true
}
