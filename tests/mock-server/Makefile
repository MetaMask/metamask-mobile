.PHONY: build-all build-darwin-arm64 build-darwin-amd64 build-linux-amd64 build-linux-arm64 test

build-all: build-darwin-arm64 build-darwin-amd64 build-linux-amd64 build-linux-arm64

build-darwin-arm64:
	GOOS=darwin GOARCH=arm64 go build -o ../bin/mock-server-darwin-arm64 .

build-darwin-amd64:
	GOOS=darwin GOARCH=amd64 go build -o ../bin/mock-server-darwin-amd64 .

build-linux-amd64:
	GOOS=linux GOARCH=amd64 go build -o ../bin/mock-server-linux-amd64 .

build-linux-arm64:
	GOOS=linux GOARCH=arm64 go build -o ../bin/mock-server-linux-arm64 .

test:
	go test ./... -v
