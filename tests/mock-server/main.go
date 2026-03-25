package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	proxyPort := flag.Int("proxy-port", 8888, "Port for the proxy server (app-facing)")
	controlPort := flag.Int("control-port", 8889, "Port for the control API (test-runner-facing)")
	defaultsJSON := flag.String("defaults", "{}", "Default mock rules as MockEventsObject JSON")

	// --port-map can be specified multiple times: --port-map 8545:9001
	var portMapArgs []string
	flag.Func("port-map", "Fallback:actual port mapping (repeatable)", func(s string) error {
		portMapArgs = append(portMapArgs, s)
		return nil
	})

	flag.Parse()

	defaultRules, err := ParseDefaultMocks(*defaultsJSON)
	if err != nil {
		log.Fatalf("failed to parse --defaults: %v", err)
	}

	portMap := parsePortMap(portMapArgs)

	rules := &RuleStore{}
	rules.SetDefaults(defaultRules)
	tracker := &Tracker{}
	forwarder := NewForwarder(portMap)

	proxy := &ProxyServer{rules: rules, tracker: tracker, forwarder: forwarder}
	control := &ControlServer{rules: rules, tracker: tracker, proxy: proxy}

	proxyMux := http.NewServeMux()
	proxyMux.Handle("/proxy", proxy)
	proxyMux.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Mock server is running"))
	})

	controlMux := http.NewServeMux()
	controlMux.Handle("/", control)

	proxyAddr := fmt.Sprintf(":%d", *proxyPort)
	controlAddr := fmt.Sprintf(":%d", *controlPort)

	log.Printf("Proxy server starting on %s", proxyAddr)
	log.Printf("Control server starting on %s", controlAddr)

	go func() {
		if err := http.ListenAndServe(proxyAddr, proxyMux); err != nil {
			log.Fatalf("proxy server error: %v", err)
		}
	}()

	go func() {
		if err := http.ListenAndServe(controlAddr, controlMux); err != nil {
			log.Fatalf("control server error: %v", err)
		}
	}()

	// Wait for SIGTERM or SIGINT
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
	received := <-sig
	log.Printf("Received %s, shutting down", received)
}
