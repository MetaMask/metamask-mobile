package main

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

type Forwarder struct {
	portMap map[int]int // fallback port → actual port
	client  *http.Client
}

func NewForwarder(portMap map[int]int) *Forwarder {
	return &Forwarder{
		portMap: portMap,
		client:  &http.Client{},
	}
}

func (f *Forwarder) translatePort(rawURL string) string {
	for fallback, actual := range f.portMap {
		old := fmt.Sprintf(":%d", fallback)
		new := fmt.Sprintf(":%d", actual)
		if strings.Contains(rawURL, old) {
			return strings.Replace(rawURL, old, new, 1)
		}
	}
	return rawURL
}

func (f *Forwarder) Forward(w http.ResponseWriter, method, targetURL string, body []byte, headers http.Header) {
	translatedURL := f.translatePort(targetURL)

	var bodyReader io.Reader
	if body != nil {
		bodyReader = strings.NewReader(string(body))
	}

	req, err := http.NewRequest(method, translatedURL, bodyReader)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to create request: %s"}`, err), http.StatusInternalServerError)
		return
	}

	// Forward relevant headers
	for key, vals := range headers {
		lk := strings.ToLower(key)
		if lk == "host" || lk == "content-length" || lk == "transfer-encoding" {
			continue
		}
		for _, v := range vals {
			req.Header.Add(key, v)
		}
	}

	resp, err := f.client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"forward failed: %s"}`, err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	for key, vals := range resp.Header {
		for _, v := range vals {
			w.Header().Add(key, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

func parsePortMap(args []string) map[int]int {
	result := map[int]int{}
	for _, arg := range args {
		parts := strings.SplitN(arg, ":", 2)
		if len(parts) != 2 {
			continue
		}
		from, err1 := strconv.Atoi(parts[0])
		to, err2 := strconv.Atoi(parts[1])
		if err1 == nil && err2 == nil {
			result[from] = to
		}
	}
	return result
}
