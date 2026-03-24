package main

import (
	"testing"
)

func TestTracker_RecordAndValidate(t *testing.T) {
	tracker := &Tracker{}
	err := tracker.Validate()
	if err != nil {
		t.Errorf("empty tracker should not fail: %v", err)
	}

	tracker.Record("GET", "https://live.example.com")
	err = tracker.Validate()
	if err == nil {
		t.Error("expected error after recording live request")
	}
}

func TestTracker_Reset(t *testing.T) {
	tracker := &Tracker{}
	tracker.Record("POST", "https://live.example.com")
	tracker.Reset()
	err := tracker.Validate()
	if err != nil {
		t.Errorf("tracker should be clear after Reset(): %v", err)
	}
}

func TestTracker_ValidateErrorMessage(t *testing.T) {
	tracker := &Tracker{}
	tracker.Record("GET", "https://live.example.com/api")
	err := tracker.Validate()
	if err == nil {
		t.Fatal("expected error")
	}
	if !containsString(err.Error(), "GET") || !containsString(err.Error(), "live.example.com") {
		t.Errorf("error message missing expected content: %s", err.Error())
	}
}

func containsString(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && stringContains(s, sub))
}

func stringContains(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
