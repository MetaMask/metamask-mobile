package main

import (
	"encoding/json"
	"strings"
)

type SerializedMockEventsObject map[string][]SerializedMockApiEndpoint

type SerializedMockApiEndpoint struct {
	URLEndpoint  string          `json:"urlEndpoint"`
	IsRegex      bool            `json:"isRegex"`
	ResponseCode int             `json:"responseCode"`
	Response     json.RawMessage `json:"response"`
	RequestBody  json.RawMessage `json:"requestBody,omitempty"`
	IgnoreFields []string        `json:"ignoreFields,omitempty"`
}

func ParseDefaultMocks(raw string) ([]MockRule, error) {
	var eventsObject SerializedMockEventsObject
	if err := json.Unmarshal([]byte(raw), &eventsObject); err != nil {
		return nil, err
	}
	var rules []MockRule
	for method, endpoints := range eventsObject {
		for _, ep := range endpoints {
			rules = append(rules, MockRule{
				Method:       strings.ToUpper(method),
				URLEndpoint:  ep.URLEndpoint,
				IsRegex:      ep.IsRegex,
				ResponseCode: ep.ResponseCode,
				Response:     ep.Response,
				RequestBody:  ep.RequestBody,
				IgnoreFields: ep.IgnoreFields,
			})
		}
	}
	return rules, nil
}
