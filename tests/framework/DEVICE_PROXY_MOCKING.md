# E2E Device Proxy Mocking

This document describes the current E2E device-proxy POC.

The goal is to keep existing `/proxy` mocks working while making native app traffic visible to `MockServerE2E`. This covers requests that do not reliably go through `shim.js`, such as native networking, WebViews, Snaps, and WebSocket traffic.

## High-Level Model

`MockServerE2E` now has two HTTP ingress paths:

| Ingress              | Source                                          | Enforcement today                                                                 |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `/proxy?url=...`     | Existing `shim.js` app-runtime fetch/XHR path   | Strict. Unmocked live calls are tracked through the existing live-call mechanism. |
| Direct proxy request | Native/device proxy traffic from iOS or Android | Log-only for unmatched calls. Existing mocks can still match.                     |

Both paths normalize into the same internal request model before mock lookup:

```ts
type ProxyIngress = 'shim-proxy' | 'device-proxy';

type NormalizedProxyRequest = {
  source: ProxyIngress;
  targetUrl: string;
  method: string;
  headers: Headers;
  bodyText?: string;
};
```

The source should not affect mock matching. It only controls the temporary enforcement policy:

```text
shim-proxy   -> strict
device-proxy -> log-only
```

The intended later state is:

```text
shim-proxy   -> strict
device-proxy -> strict
```

## Lifecycle

`FixtureHelper` owns the proxy lifecycle:

1. Generate the local E2E proxy CA with `ensureE2EProxyCa`.
2. Start `MockServerE2E`.
3. Configure the current platform proxy after the MockServer port is known.
4. Start local WebSocket services.
5. Start the fixture server and load fixture state.
6. Launch or relaunch the app with the existing E2E launch args.
7. On teardown, restore any platform proxy state that was changed.

The generated CA files live under `.e2e-proxy-ca/` and are ignored by git:

```text
.e2e-proxy-ca/proxy-ca.key
.e2e-proxy-ca/proxy-ca.pem
.e2e-proxy-ca/proxy-ca.cer
```

`MockServerE2E` uses `proxy-ca.pem` and `proxy-ca.key` for HTTPS interception. iOS trusts `proxy-ca.cer`; Android trusts `proxy-ca.pem`.

## iOS Implementation

iOS does not use a simulator-wide HTTP proxy setting.

Instead, the app is configured at launch time:

- `FixtureHelper` installs the generated DER certificate into the simulator keychain:

```bash
xcrun simctl keychain "$DEVICE_UDID" add-root-cert .e2e-proxy-ca/proxy-ca.cer
```

- `FixtureHelper` passes the MockServer port through the `e2eIosProxyPort` launch arg.
- `ios/MetaMask/AppDelegate.swift` reads `e2eIosProxyPort`.
- When the arg is present, `E2ENativeAppProxy` configures React Native `NSURLSession` traffic through `127.0.0.1:<mockServerPort>`.
- `ios/Podfile` applies a SocketRocket patch only when `METAMASK_ENVIRONMENT=e2e`.
- The SocketRocket patch makes iOS WebSocket traffic honor `e2eIosProxyPort`.

The important guardrails:

- No iOS proxy behavior is enabled unless the launch arg is present.
- The SocketRocket patch is E2E-build gated by `METAMASK_ENVIRONMENT=e2e`.
- Production builds do not receive the launch arg and should not use this proxy path.

Useful iOS log markers:

```text
E2E_NATIVE_PROXY_CA_READY
E2E_IOS_NATIVE_APP_PROXY_CONFIGURED
E2E_IOS_NATIVE_APP_PROXY_ENABLED
E2E_IOS_NATIVE_APP_PROXY_WEBSOCKET_ENABLED
E2E_NATIVE_PROXY_REQUEST_INITIATED
E2E_NATIVE_PROXY_WS_REQUEST
```

## Android Implementation

Android uses the emulator global HTTP proxy through adb.

`FixtureHelper` calls the Android device command handler after MockServer has started:

1. Install the generated PEM certificate into the Android user CA store.
2. Set Android global proxy settings to route outbound traffic to MockServer.
3. Set a local harness exclusion list so framework-local traffic does not go through MockServer.
4. Clear the proxy settings during fixture teardown.

The proxy host is `10.0.2.2` because Android emulators reach the host machine through that address.

The command handler writes both the explicit global proxy fields and the legacy `http_proxy` setting:

```bash
adb -s "$DEVICE_UDID" shell settings put global global_http_proxy_host "10.0.2.2"
adb -s "$DEVICE_UDID" shell settings put global global_http_proxy_port "$MOCK_SERVER_PORT"
adb -s "$DEVICE_UDID" shell settings put global global_http_proxy_exclusion_list "localhost,127.0.0.1,10.0.2.2,10.0.3.2,bs-local.com,*.local"
adb -s "$DEVICE_UDID" shell settings delete global global_proxy_pac_url
adb -s "$DEVICE_UDID" shell settings put global http_proxy "10.0.2.2:$MOCK_SERVER_PORT"
```

Cleanup clears both forms:

```bash
adb -s "$DEVICE_UDID" shell settings put global http_proxy :0
adb -s "$DEVICE_UDID" shell settings delete global global_http_proxy_host
adb -s "$DEVICE_UDID" shell settings put global global_http_proxy_port 0
adb -s "$DEVICE_UDID" shell settings delete global global_http_proxy_exclusion_list
adb -s "$DEVICE_UDID" shell settings delete global global_proxy_pac_url
```

String settings are cleared with `settings delete` instead of `settings put ... ""` because `adb shell settings put` treats an empty value as a missing argument on some emulator images.

The exclusion list is important. Local framework traffic such as fixture state, command queue, adb reverse ports, dapps, and local nodes uses device-relative hosts like `localhost`, `127.0.0.1`, and `10.0.2.2`. If those requests are proxied, MockServer receives URLs whose hostnames no longer have the same meaning from the Node process and can fail with `ECONNREFUSED`.

Android E2E builds also use `android/app/src/main/res/xml/react_native_config_e2e.xml` through a manifest placeholder when `METAMASK_ENVIRONMENT=e2e`. This E2E network security config trusts user CAs so the generated proxy CA can decrypt HTTPS traffic.

The current Android CA installation writes to the emulator user CA store and requires an emulator image that supports `adb root`.

Useful Android log markers:

```text
E2E_NATIVE_PROXY_CA_READY
E2E_ANDROID_DEVICE_PROXY_CONFIGURED
E2E_NATIVE_PROXY_HTTPS_ENABLED
E2E_NATIVE_PROXY_REQUEST_INITIATED
E2E_DEVICE_PROXY_UNMOCKED_REQUEST
E2E_NATIVE_PROXY_WS_REQUEST
```

## MockServer Handling

Existing mocked endpoints still use the same default and test-specific mock definitions.

For HTTP:

- `/proxy?url=...` continues to be the legacy shim path.
- Direct device-proxy requests go through the same normalized request handler.
- Mock matches return mocked responses.
- Unmatched direct device-proxy requests log and pass through for now.
- Unmatched shim-proxy requests keep the existing live-call behavior.

For WebSockets:

- Mockttp logs direct native WebSocket requests and messages.
- Current WebSocket handling is diagnostic/pass-through for device-proxy traffic.
- Some WebSocket services can still be routed to local `ws://localhost:<port>` servers through the existing launch-arg and shim infrastructure.

Useful MockServer log markers:

```text
E2E_NATIVE_PROXY_HTTPS_ENABLED
E2E_NATIVE_PROXY_HTTPS_DISABLED
E2E_NATIVE_PROXY_REQUEST_INITIATED
E2E_DEVICE_PROXY_UNMOCKED_REQUEST
E2E_DEVICE_PROXY_UNMOCKED_REQUEST_BODY
E2E_NATIVE_PROXY_TLS_CLIENT_ERROR
E2E_NATIVE_PROXY_CLIENT_ERROR
E2E_NATIVE_PROXY_WS_REQUEST
E2E_NATIVE_PROXY_WS_ACCEPTED
E2E_NATIVE_PROXY_WS_MESSAGE_RECEIVED
E2E_NATIVE_PROXY_WS_MESSAGE_SENT
E2E_NATIVE_PROXY_WS_BALANCE_CANDIDATE
E2E_NATIVE_PROXY_WS_CLOSE
```

## Platform Differences

| Area                       | iOS                                              | Android                                                            |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Proxy mechanism            | App-level launch arg                             | Emulator global HTTP proxy through adb                             |
| Proxy host from app/device | `127.0.0.1`                                      | `10.0.2.2`                                                         |
| Proxy port source          | `e2eIosProxyPort` launch arg                     | MockServer port written to Android global settings                 |
| CA trust                   | `simctl keychain add-root-cert` with DER cert    | User CA store install with PEM cert                                |
| HTTPS trust gate           | Simulator keychain trust plus Mockttp CA         | `METAMASK_ENVIRONMENT=e2e` network security config trusts user CAs |
| WebSocket support          | SocketRocket E2E patch uses launch arg           | Depends on Android/network stack honoring global proxy             |
| Local framework traffic    | App proxy exceptions avoid localhost-style hosts | Android global proxy exclusion list avoids localhost-style hosts   |
| Cleanup                    | No device-wide proxy state to clear              | Clear Android global proxy settings on teardown                    |

## Troubleshooting

If Android fails while fetching fixture state with an error like:

```text
Error forwarding request: http://localhost:12345/state.json
ECONNREFUSED
```

that means local harness traffic reached MockServer instead of bypassing the proxy. Check that Android has the local exclusion list:

```bash
adb -s "$DEVICE_UDID" shell settings get global global_http_proxy_exclusion_list
```

Expected value:

```text
localhost,127.0.0.1,10.0.2.2,10.0.3.2,bs-local.com,*.local
```

Also check that proxy cleanup ran after the previous test:

```bash
adb -s "$DEVICE_UDID" shell settings get global http_proxy
adb -s "$DEVICE_UDID" shell settings get global global_http_proxy_host
adb -s "$DEVICE_UDID" shell settings get global global_http_proxy_port
```

If stale values remain, clear them manually with:

```bash
adb -s "$DEVICE_UDID" shell settings put global http_proxy :0
adb -s "$DEVICE_UDID" shell settings delete global global_http_proxy_host
adb -s "$DEVICE_UDID" shell settings put global global_http_proxy_port 0
adb -s "$DEVICE_UDID" shell settings delete global global_http_proxy_exclusion_list
adb -s "$DEVICE_UDID" shell settings delete global global_proxy_pac_url
```

## Related Next Steps

Future work is tracked in [`../docs/DEVICE_PROXY_NEXT_STEPS.md`](../docs/DEVICE_PROXY_NEXT_STEPS.md).
