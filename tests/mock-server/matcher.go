package main

import (
	"encoding/json"
	"reflect"
	"regexp"
	"strings"
)

func matchRule(rule *MockRule, method, url string, body []byte) bool {
	if rule.Method != method {
		return false
	}
	if !matchURL(rule, url) {
		return false
	}
	if method == "POST" && rule.RequestBody != nil {
		return matchBody(body, rule.RequestBody, rule.IgnoreFields)
	}
	return true
}

func matchURL(rule *MockRule, url string) bool {
	if rule.IsRegex {
		matched, _ := regexp.MatchString(rule.URLEndpoint, url)
		return matched
	}
	return url == rule.URLEndpoint || strings.HasPrefix(url, rule.URLEndpoint)
}

func matchBody(actual, expected json.RawMessage, ignoreFields []string) bool {
	var actualMap, expectedMap map[string]interface{}
	if err := json.Unmarshal(actual, &actualMap); err != nil {
		return false
	}
	if err := json.Unmarshal(expected, &expectedMap); err != nil {
		return false
	}
	sanitize(actualMap, ignoreFields)
	sanitize(expectedMap, ignoreFields)
	return reflect.DeepEqual(actualMap, expectedMap)
}

func sanitize(m map[string]interface{}, ignoreFields []string) {
	for _, field := range ignoreFields {
		delete(m, field)
	}
	for _, v := range m {
		switch val := v.(type) {
		case map[string]interface{}:
			sanitize(val, ignoreFields)
		case []interface{}:
			for _, elem := range val {
				if nested, ok := elem.(map[string]interface{}); ok {
					sanitize(nested, ignoreFields)
				}
			}
		}
	}
}
