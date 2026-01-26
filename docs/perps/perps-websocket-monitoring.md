# mitmproxy Setup for Hyperliquid Debugging

Intercept HTTP/WebSocket traffic between MetaMask Mobile and Hyperliquid endpoints.

## Prerequisites

- macOS/Linux, Android emulator, ADB

## 1. Install mitmproxy

```bash
brew install mitmproxy   # macOS
# or: pip install mitmproxy
```

## 2. Android Configuration

The PR includes these files:

**`android/app/src/debug/res/xml/network_security_config.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

**`android/app/src/debug/AndroidManifest.xml`** - adds `networkSecurityConfig` attribute.

Rebuild after changes: `cd android && ./gradlew clean && cd .. && yarn android`

## 3. Start Proxy

```bash
mitmweb
# Proxy: localhost:8080, Web UI: localhost:8081
```

## 4. Configure Emulator

```bash
adb reverse tcp:8080 tcp:8080
adb shell settings put global http_proxy 127.0.0.1:8080
```

## 5. Install Certificate

```bash
adb push ~/.mitmproxy/mitmproxy-ca-cert.pem /sdcard/Download/mitmproxy.crt
```

Then on emulator: Settings → Security → Install certificate → CA certificate → select file.

## 6. Monitor Traffic

Open `http://127.0.0.1:8081` and filter:

- `~d hyperliquid` - Hyperliquid traffic only
- `~websocket` - WebSocket connections
- `~websocket & ~d hyperliquid` - Hyperliquid WebSocket only

Click a WebSocket flow → Messages tab to inspect frames.

## 7. Cleanup

```bash
adb shell settings put global http_proxy :0
adb reverse --remove tcp:8080
```

## Physical Device (Alternative)

1. Start: `mitmweb --listen-host 0.0.0.0`
2. Find host IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. On device WiFi settings: set proxy to `<host-ip>:8080`
4. Install cert via `http://mitm.it` in device browser

## Endpoints

| Env     | REST                          | WebSocket                              |
| ------- | ----------------------------- | -------------------------------------- |
| Mainnet | `api.hyperliquid.xyz`         | `wss://api.hyperliquid.xyz/ws`         |
| Testnet | `api.hyperliquid-testnet.xyz` | `wss://api.hyperliquid-testnet.xyz/ws` |
