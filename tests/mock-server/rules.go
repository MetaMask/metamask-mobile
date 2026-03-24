package main

import (
	"encoding/json"
	"sync"
)

type MockRule struct {
	Method       string          `json:"method"`
	URLEndpoint  string          `json:"urlEndpoint"`
	IsRegex      bool            `json:"isRegex"`
	ResponseCode int             `json:"responseCode"`
	Response     json.RawMessage `json:"response"`
	RequestBody  json.RawMessage `json:"requestBody,omitempty"`
	IgnoreFields []string        `json:"ignoreFields,omitempty"`
}

type RuleStore struct {
	mu           sync.RWMutex
	defaultRules []MockRule
	testRules    []MockRule
}

func (s *RuleStore) SetDefaults(rules []MockRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.defaultRules = rules
}

func (s *RuleStore) Add(rule MockRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.testRules = append(s.testRules, rule)
}

func (s *RuleStore) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.testRules = s.testRules[:0]
}

func (s *RuleStore) Match(method, url string, body []byte) (*MockRule, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, rules := range [][]MockRule{s.testRules, s.defaultRules} {
		for i := range rules {
			if matchRule(&rules[i], method, url, body) {
				return &rules[i], true
			}
		}
	}
	return nil, false
}

// stub — replaced by matcher.go
func matchRule(rule *MockRule, method, url string, body []byte) bool {
	return rule.Method == method && rule.URLEndpoint == url
}
