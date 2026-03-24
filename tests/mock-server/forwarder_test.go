package main

import "testing"

func TestTranslatePort(t *testing.T) {
	f := NewForwarder(map[int]int{8545: 9001, 8085: 9002})

	cases := []struct{ in, want string }{
		{"https://localhost:8545/rpc", "https://localhost:9001/rpc"},
		{"http://127.0.0.1:8085/dapp", "http://127.0.0.1:9002/dapp"},
		{"https://api.example.com/v1", "https://api.example.com/v1"}, // no translation
	}
	for _, c := range cases {
		got := f.translatePort(c.in)
		if got != c.want {
			t.Errorf("translatePort(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
