# E2E Device Proxy Mocking

This document describes the E2E device-proxy infrastructure (MMQA-1775 Phase 0, lifted and restructured from POC PR #30594 under MMQA-1923).

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

The proxy + CA lifecycle lives in the framework-neutral module `tests/framework/services/proxy-setup/`. It is deliberately decoupled from any one test runner:

- **Detox**: `tests/init.detox.js` calls `warmupProxyCa()` in its `beforeAll` hook; `withFixtures` in `FixtureHelper` drives the per-test setup/cleanup.
- **Playwright/Appium**: `tests/framework/config/global.setup.ts` calls `warmupProxyCa()` once before all tests; the same `withFixtures` path drives the per-test setup/cleanup.

The CA warm-up is idempotent (concurrent and repeat callers share one in-flight generation) and best-effort at the hook level — suites that never touch the device proxy are unaffected if it fails; the per-test path fails loudly when the proxy is actually needed.

Per-test flow inside `withFixtures`:

1. Start fixture dependencies (local nodes, contracts, dapp servers).
2. Generate (or reuse) the local E2E proxy CA via `ensureNativeProxyCa`.
3. Start `MockServerE2E` (its port is now known).
4. Start local WebSocket services and register their device-proxy bridges (`bridgeLocalWebSocketPort`).
5. Start the fixture server and load fixture state.
6. Configure the current platform proxy (`setupProxy`) — after all local harness resources are listening and before the app is launched.
7. Launch or relaunch the app with the existing E2E launch args.
8. On teardown, restore any platform proxy state that was changed (`cleanupProxy`).

The CA is deterministic and checked in under `tests/framework/utils/e2e-proxy-ca/` (Decision DA/A1 — see the README there for why the private key is committed and how to rotate):

```text
tests/framework/utils/e2e-proxy-ca/proxy-ca.key
tests/framework/utils/e2e-proxy-ca/proxy-ca.pem
tests/framework/utils/e2e-proxy-ca/proxy-ca.cer
```

`MockServerE2E` uses `proxy-ca.pem` and `proxy-ca.key` for HTTPS interception. iOS trusts `proxy-ca.cer` (installed into the simulator keychain at test time); Android trusts the same certificate **baked into the E2E APK** as `android/app/src/main/res/raw/e2e_proxy_ca.pem`. `ensureE2EProxyCa` regenerates the files only if they are missing (CA rotation).

## iOS Implementation

iOS does not use a simulator-wide HTTP proxy setting.

Instead, the app is configured at launch time:

- `FixtureHelper` installs the generated DER certificate into the simulator keychain:

```bash
xcrun simctl keychain "$DEVICE_UDID" add-root-cert tests/framework/utils/e2e-proxy-ca/proxy-ca.cer
```

- The harness passes the MockServer port through the `e2eIosProxyPort` launch arg.
- `ios/MetaMask/E2E/E2ENativeAppProxy.swift` reads `e2eIosProxyPort` (called from `AppDelegate.swift` at launch).
- When the arg is present, `E2ENativeAppProxy` configures React Native `NSURLSession` traffic through `127.0.0.1:<mockServerPort>`.
- `ios/Podfile` applies a SocketRocket patch only when `METAMASK_ENVIRONMENT=e2e`. Any failure to apply the patch raises and fails `pod install`.
- The SocketRocket patch makes iOS WebSocket traffic honor `e2eIosProxyPort`.

The important guardrails:

- No iOS proxy behavior is enabled unless the launch arg is present.
- `E2ENativeAppProxy` is compiled only when the `METAMASK_E2E` Swift compilation condition is set; `scripts/build.sh` sets it for `METAMASK_ENVIRONMENT=e2e` builds. Production binaries get an empty no-op stub.
- The SocketRocket patch is E2E-build gated by `METAMASK_ENVIRONMENT=e2e`.
- Production builds do not receive the launch arg and should not use this proxy path.

**Known gap (as lifted from the POC):** only the Appium launch path in `withFixtures` passes `e2eIosProxyPort`. The Detox launch path does not, so on Detox iOS runs the CA is installed but the app never proxies — the device proxy is effectively dormant. This preserves the POC's validated 29/29 iOS baseline; activating it for Detox is a one-line addition to the Detox `launchArgs` once the dual-mode handler is hardened (binary fix N1).

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

1. Set Android global proxy settings to route outbound traffic to MockServer.
2. Set a local harness exclusion list so framework-local traffic does not go through MockServer.
3. Clear the proxy settings during fixture teardown.

There is no runtime CA install step on Android: the proxy CA is already trusted by the E2E APK (see below).

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

Android E2E builds also use `android/app/src/main/res/xml/react_native_config_e2e.xml` through a manifest placeholder when `METAMASK_ENVIRONMENT=e2e`. This E2E network security config trusts the checked-in proxy CA bundled into the APK at `res/raw/e2e_proxy_ca` (plus system and user CAs), so HTTPS interception works with **no `adb root` dependency and no runtime install**. `scripts/build.sh` passes `-PmetamaskE2E=true` for E2E builds, and `android/app/build.gradle` fails the build if that property is set while `METAMASK_ENVIRONMENT` did not reach the Gradle process — a misconfigured build cannot silently fall back to the production network config.

Decision DA on MMQA-1923 is resolved as **A1 (bundled APK asset)**: the previous runtime `adb root` push into the user CA store is removed, and `AndroidDeviceCommandHandler.installRootCertificate` now throws to catch accidental wiring. A unit test in `E2EProxyCa.test.ts` guards that the bundled cert stays byte-identical to the checked-in CA cert.

### Android native WSS coverage (N2)

Unlike iOS (which needs the SocketRocket Podfile patch), Android requires **no native code hook** for WSS interception:

- React Native's `WebSocketModule` (RN 0.81.5) builds its own `OkHttpClient`, and OkHttp's default `ProxySelector` honors the adb global proxy for `ws://`/`wss://` upgrade requests. TLS interception of `wss://` is trusted through the bundled proxy CA in the E2E network security config, same as HTTPS.
- CI evidence: `E2E_NATIVE_PROXY_WS_REQUEST` / `_WS_ACCEPTED` / `_WS_MESSAGE_*` markers for native `wss://api.hyperliquid.xyz/ws` traffic appear on Android shards with no Android-side WS code at all.
- Note for future work: `OkHttpClientProvider.setOkHttpClientFactory` does **not** cover WebSockets — `WebSocketModule` never consults the provider. If an explicit WS client override is ever needed, the hook is `com.facebook.react.modules.websocket.WebSocketModule.setCustomClientBuilder(...)` (applied to every WS client the module builds).
- WS services rerouted by `shim.js` to local mock servers (e.g. account activity at `ws://localhost:8089`) _should_ be covered by the proxy exclusion list and travel the adb-reverse path — but in practice the emulator does **not** reliably apply the exclusion list to WebSocket upgrades, and these connections arrive at mockttp targeting the device-side fallback port, where nothing listens host-side (the host server is on a dynamic port; the fallback port is only the adb-reverse alias). `MockServerE2E.bridgeLocalWebSocketPort(fallbackPort, actualPort)` fixes this: `withFixtures` registers a high-priority forward rule per local WS service after the servers start, mirroring the HTTP-side local-resource translation. Look for the `E2E_NATIVE_PROXY_WS_LOCAL_BRIDGE` marker.
- The same exclusion-list failure applies to plain HTTP: the app's legacy shim wrappers (`http://localhost:8000/proxy?url=<target>`) and fixture-state URLs that already contain a wrapper (double-wrapping: fixture-baked RPC endpoints get shim-wrapped a second time) can arrive at mockttp instead of the adb-reverse path. `handleNormalizedHttpProxyRequest` unwraps nested wrappers before mock matching (`E2E_DEVICE_PROXY_LEGACY_WRAPPER_UNWRAPPED` marker) and device-proxied `/health-check` on the legacy port is served directly. Black-holing or live-forwarding these wrappers starves the app of fixture state (chain RPC, balances) — the historical "unlock/state-load scatter" failure mode.
- Live-forwarded (unmocked) responses preserve upstream headers minus hop-by-hop/encoding ones — WebView fetches are CORS-bound, so `Access-Control-Allow-*` headers must survive the proxy or every preflighted request fails. Network-level forward failures (DNS `ENOTFOUND`, `ECONNREFUSED`) close the connection instead of synthesizing an HTTP 500, preserving the client's network-error semantics (e.g. the in-app browser's error screen for invalid hosts).
- Third-party native module audit: `@react-native-firebase/messaging`, `@sentry/react-native`, and `react-native-branch` do not construct their own `OkHttpClient` — no known bypass gaps. Modules added later should be re-audited.

The exit-gate evidence for N2 is `tests/smoke-appium/account-activity/web-socket-connection.spec.ts` (migrated from Detox in #33196 / MMQA-1987). The Appium path exercises the device proxy on both platforms; the WS local-bridge in `withFixtures` is what makes those subscriptions succeed under the proxy.

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
- Android local harness URLs should normally stay on the adb-reverse path; if they are routed through the global proxy, MockServer bridges known fallback ports to the matching host resource.
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

| Area                       | iOS                                              | Android                                                                                                         |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Proxy mechanism            | App-level launch arg                             | Emulator global HTTP proxy through adb                                                                          |
| Proxy host from app/device | `127.0.0.1`                                      | `10.0.2.2`                                                                                                      |
| Proxy port source          | `e2eIosProxyPort` launch arg                     | MockServer port written to Android global settings                                                              |
| CA trust                   | `simctl keychain add-root-cert` with DER cert    | Bundled into the E2E APK (`res/raw/e2e_proxy_ca`), trusted via the network security config — no runtime install |
| HTTPS trust gate           | Simulator keychain trust plus Mockttp CA         | `METAMASK_ENVIRONMENT=e2e` network security config trusts the APK-bundled proxy CA                              |
| WebSocket support          | SocketRocket E2E patch uses launch arg           | Depends on Android/network stack honoring global proxy                                                          |
| Local framework traffic    | App proxy exceptions avoid localhost-style hosts | Android global proxy exclusion list avoids localhost-style hosts                                                |
| Cleanup                    | No device-wide proxy state to clear              | Clear Android global proxy settings on teardown                                                                 |

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

Future work is tracked on MMQA-1923 (Phase 0) and its parent MMQA-1775:

- N1 — binary response handling on the device-proxy path (Buffer-safe bodies).
- N2 — Android native WSS coverage (OkHttp client factory under `METAMASK_ENVIRONMENT=e2e`).
- N3 — diagnostic canary spec under `tests/smoke-appium/network/`.
- N4 — warn-level `E2E_DEVICE_PROXY_MOCKED_REQUEST` log marker.
- N5 — disambiguate the unlock/splash-screen failure pattern.
- Decision DA — Android CA install strategy.
