package main

import (
	"encoding/json"
	"testing"
)

func TestRuleStore_AddAndMatch(t *testing.T) {
	store := &RuleStore{}
	rule := MockRule{
		Method:       "GET",
		URLEndpoint:  "https://api.example.com/v1/data",
		ResponseCode: 200,
		Response:     json.RawMessage(`"ok"`),
	}
	store.Add(rule)

	matched, ok := store.Match("GET", "https://api.example.com/v1/data", nil)
	if !ok {
		t.Fatal("expected match, got none")
	}
	if matched.ResponseCode != 200 {
		t.Errorf("expected 200, got %d", matched.ResponseCode)
	}
}

func TestRuleStore_TestRulesTakePrecedence(t *testing.T) {
	store := &RuleStore{}
	store.defaultRules = []MockRule{
		{Method: "GET", URLEndpoint: "https://api.example.com/", ResponseCode: 200, Response: json.RawMessage(`"default"`)},
	}
	store.Add(MockRule{
		Method: "GET", URLEndpoint: "https://api.example.com/", ResponseCode: 201, Response: json.RawMessage(`"test"`),
	})

	matched, ok := store.Match("GET", "https://api.example.com/", nil)
	if !ok {
		t.Fatal("expected match")
	}
	if matched.ResponseCode != 201 {
		t.Errorf("test rule should take precedence: got %d", matched.ResponseCode)
	}
}

func TestRuleStore_Reset(t *testing.T) {
	store := &RuleStore{}
	store.Add(MockRule{Method: "GET", URLEndpoint: "https://example.com", ResponseCode: 200, Response: json.RawMessage(`{}`)})
	store.Reset()

	_, ok := store.Match("GET", "https://example.com", nil)
	if ok {
		t.Fatal("expected no match after Reset()")
	}
}

func TestRuleStore_ResetKeepsDefaults(t *testing.T) {
	store := &RuleStore{}
	store.defaultRules = []MockRule{
		{Method: "GET", URLEndpoint: "https://default.com", ResponseCode: 200, Response: json.RawMessage(`{}`)},
	}
	store.Add(MockRule{Method: "GET", URLEndpoint: "https://test.com", ResponseCode: 200, Response: json.RawMessage(`{}`)})
	store.Reset()

	_, ok := store.Match("GET", "https://default.com", nil)
	if !ok {
		t.Fatal("default rules should survive Reset()")
	}
}
