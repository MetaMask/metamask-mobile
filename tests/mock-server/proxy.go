package main

import (
	"io"
	"net/http"
)

type ProxyServer struct {
	rules     *RuleStore
	tracker   *Tracker
	forwarder *Forwarder
}

func (s *ProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	urlEndpoint := r.URL.Query().Get("url")
	if urlEndpoint == "" {
		http.Error(w, `{"error":"missing url parameter"}`, http.StatusBadRequest)
		return
	}

	var body []byte
	if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch {
		var err error
		body, err = io.ReadAll(r.Body)
		if err != nil {
			// Client dropped connection — return cleanly. No unhandled rejection.
			return
		}
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
