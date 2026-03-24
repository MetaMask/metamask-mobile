package main

import (
	"encoding/json"
	"net/http"
)

type ControlServer struct {
	rules   *RuleStore
	tracker *Tracker
}

func (s *ControlServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/health":
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))

	case r.Method == http.MethodPost && r.URL.Path == "/mocks":
		var rule MockRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			http.Error(w, `{"error":"invalid rule"}`, http.StatusBadRequest)
			return
		}
		s.rules.Add(rule)
		w.WriteHeader(http.StatusCreated)

	case r.Method == http.MethodDelete && r.URL.Path == "/mocks":
		s.rules.Reset()
		s.tracker.Reset()
		w.WriteHeader(http.StatusNoContent)

	case r.Method == http.MethodGet && r.URL.Path == "/mocks/live":
		reqs := s.tracker.All()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(reqs)

	case r.Method == http.MethodPost && r.URL.Path == "/mocks/validate":
		if err := s.tracker.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		w.WriteHeader(http.StatusOK)

	default:
		http.NotFound(w, r)
	}
}
