# Inspect HyperLiquid traffic with mitmproxy

Intercept HTTP and WebSocket traffic between MetaMask Mobile and HyperLiquid. These are external tool steps.

## Before you start

- macOS or Linux, an Android emulator, ADB.
- Use an Android debug build. Only the debug variant's network security config trusts user-installed CAs. Other variants use `react_native_config.xml`, which does not, so they reject the mitmproxy certificate.
- The app sends `wss://` traffic through the Nitro WebSocket adapter and `fetch` through nitro-fetch, both native.

Code: `android/app/src/debug/res/xml/network_security_config.xml`; `android/app/src/debug/AndroidManifest.xml`; `app/core/NitroWebSocketSetup.ts` `installDevNitroWebSocket`; `app/core/NitroFetchSetup.ts`

## 1. Install mitmproxy

```bash
brew install mitmproxy   # macOS
# or: pip install mitmproxy
```

## 2. Start the proxy

```bash
mitmweb
# Proxy: localhost:8080, Web UI: localhost:8081
```

## 3. Point the emulator at it

```bash
adb reverse tcp:8080 tcp:8080
adb shell settings put global http_proxy 127.0.0.1:8080
```

## 4. Install the certificate

```bash
adb push ~/.mitmproxy/mitmproxy-ca-cert.pem /sdcard/Download/mitmproxy.crt
```

On the emulator, open Settings, Security, Install certificate, CA certificate, and pick the file.

## 5. Watch traffic

Open `http://127.0.0.1:8081` and filter.

| Filter                        | Shows                      |
| ----------------------------- | -------------------------- |
| `~d hyperliquid`              | HyperLiquid traffic        |
| `~websocket`                  | WebSocket connections      |
| `~websocket & ~d hyperliquid` | HyperLiquid WebSocket only |

Click a WebSocket flow, then the Messages tab, to read frames.

## 6. Clean up

```bash
adb shell settings put global http_proxy :0
adb reverse --remove tcp:8080
```

## Physical device

1. Start `mitmweb --listen-host 0.0.0.0`.
2. Find the host IP with `ifconfig | grep "inet " | grep -v 127.0.0.1`.
3. In the device Wi-Fi settings, set the proxy to `<host-ip>:8080`.
4. Install the certificate from `http://mitm.it` in the device browser.

## Endpoints

| Env     | REST                          | WebSocket                              |
| ------- | ----------------------------- | -------------------------------------- |
| Mainnet | `api.hyperliquid.xyz`         | `wss://api.hyperliquid.xyz/ws`         |
| Testnet | `api.hyperliquid-testnet.xyz` | `wss://api.hyperliquid-testnet.xyz/ws` |

The Core provider owns these connections. See [HyperLiquid in Core](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/venues/hyperliquid/README.md).
