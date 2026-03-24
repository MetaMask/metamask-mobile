package main

import (
	"encoding/json"
	"testing"
)

func TestMatchURL_ExactMatch(t *testing.T) {
	rule := &MockRule{URLEndpoint: "https://api.example.com/v1", IsRegex: false}
	if !matchURL(rule, "https://api.example.com/v1") {
		t.Error("exact match failed")
	}
}

func TestMatchURL_PrefixMatch(t *testing.T) {
	rule := &MockRule{URLEndpoint: "https://api.example.com", IsRegex: false}
	if !matchURL(rule, "https://api.example.com/v1/resource") {
		t.Error("prefix match failed")
	}
}

func TestMatchURL_RegexMatch(t *testing.T) {
	rule := &MockRule{URLEndpoint: `^https://infura\.io/v3/[a-z0-9]+$`, IsRegex: true}
	if !matchURL(rule, "https://infura.io/v3/abc123") {
		t.Error("regex match failed")
	}
	if matchURL(rule, "https://infura.io/v3/") {
		t.Error("regex should not match empty key")
	}
}

func TestMatchBody_ExactMatch(t *testing.T) {
	actual := json.RawMessage(`{"method":"eth_blockNumber","id":1}`)
	expected := json.RawMessage(`{"method":"eth_blockNumber","id":1}`)
	if !matchBody(actual, expected, nil) {
		t.Error("exact body match failed")
	}
}

func TestMatchBody_IgnoreFields(t *testing.T) {
	actual := json.RawMessage(`{"method":"eth_blockNumber","id":42}`)
	expected := json.RawMessage(`{"method":"eth_blockNumber","id":1}`)
	if !matchBody(actual, expected, []string{"id"}) {
		t.Error("body match with ignoreFields failed")
	}
}

func TestMatchBody_NestedIgnoreFields(t *testing.T) {
	actual := json.RawMessage(`{"params":[{"nonce":99,"value":"0x1"}]}`)
	expected := json.RawMessage(`{"params":[{"nonce":1,"value":"0x1"}]}`)
	if !matchBody(actual, expected, []string{"nonce"}) {
		t.Error("nested array field ignore failed")
	}
}

func TestMatchRule_MethodMismatch(t *testing.T) {
	rule := &MockRule{Method: "GET", URLEndpoint: "https://api.example.com", ResponseCode: 200, Response: json.RawMessage(`{}`)}
	if matchRule(rule, "POST", "https://api.example.com", nil) {
		t.Error("method mismatch should not match")
	}
}
