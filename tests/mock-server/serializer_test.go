package main

import (
	"testing"
)

func TestParseDefaultMocks_BasicGetRule(t *testing.T) {
	input := `{"GET":[{"urlEndpoint":"https://api.example.com","isRegex":false,"responseCode":200,"response":"\"ok\""}]}`
	rules, err := ParseDefaultMocks(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(rules))
	}
	if rules[0].Method != "GET" {
		t.Errorf("expected GET, got %s", rules[0].Method)
	}
	if rules[0].URLEndpoint != "https://api.example.com" {
		t.Errorf("unexpected URL: %s", rules[0].URLEndpoint)
	}
	if rules[0].ResponseCode != 200 {
		t.Errorf("expected 200, got %d", rules[0].ResponseCode)
	}
}

func TestParseDefaultMocks_RegexRule(t *testing.T) {
	input := `{"GET":[{"urlEndpoint":"^https://infura\\.io/v3/","isRegex":true,"responseCode":200,"response":"{}"}]}`
	rules, err := ParseDefaultMocks(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !rules[0].IsRegex {
		t.Error("expected isRegex=true")
	}
}

func TestParseDefaultMocks_MultipleMethodsFlattened(t *testing.T) {
	input := `{
		"GET":[{"urlEndpoint":"https://get.example.com","isRegex":false,"responseCode":200,"response":"{}"}],
		"POST":[{"urlEndpoint":"https://post.example.com","isRegex":false,"responseCode":201,"response":"{}"}]
	}`
	rules, err := ParseDefaultMocks(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rules) != 2 {
		t.Fatalf("expected 2 rules, got %d", len(rules))
	}
	methods := map[string]bool{}
	for _, r := range rules {
		methods[r.Method] = true
	}
	if !methods["GET"] || !methods["POST"] {
		t.Error("expected both GET and POST rules")
	}
}

func TestParseDefaultMocks_InvalidJSON(t *testing.T) {
	_, err := ParseDefaultMocks("not json")
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}
