# Design: Android in-app WebView CDP scroll (Appium)

**Date:** 2026-08-04  
**Status:** Approved for implementation planning  
**Scope:** Spike — CDP scroll only; native tap/fill/read unchanged

## Problem

Android Appium smoke cannot reliably use Chromedriver WebView context on CI:

- `switchContext` into WEBVIEW often hangs during Chromedriver session creation.
- In-app pages under LavaMoat/ShadowRoot scuttling further break Chromedriver DOM atoms.

As a workaround, Android Appium routes all in-app WebView interactions through native UiAutomator (`AndroidWebViewNative`). That is reliable, but snaps tests spend significant time scrolling via `UiScrollable` / repeated `scrollGesture` sweeps.

Standalone Chrome already bypasses Chromedriver via CDP (`ChromeCdpHelpers`). MetaMask’s in-app browser enables WebView debugging in e2e (`webviewDebuggingEnabled={isTestEnvironment}`), so the same approach can target the app WebView.

## Goal

Speed up Android Appium WebView **scrolling** for snaps (and other `WebView.*` consumers) by using CDP `scrollIntoView`, while keeping native UiAutomator for tap/fill/read and falling back to the existing native scroll path when CDP fails.

## Non-goals

- Restoring Chromedriver WebView context for Android Appium.
- CDP tap / fill / read in this spike (follow-up if CDP scroll proves stable).
- Changing iOS Appium or Detox WebView paths.
- Changing MMConnect Chrome CDP helpers beyond optional shared primitives if extraction is trivial.

## Approaches considered

| Option | Description | Decision |
|--------|-------------|----------|
| **A. CDP scroll + native interaction** | Discover MetaMask WebView CDP socket; scroll via `Runtime.evaluate`; then native resolve + tap/fill/read | **Chosen** |
| B. Full CDP interactions | Scroll, tap, fill, read via CDP | Deferred — larger LavaMoat/surface risk |
| C. Native scroll only optimization | Fewer UiScrollable bases / better anchors | Rejected as primary — unlikely to match DOM scroll speed |

## Architecture

```
WebView.scrollIntoView / tapById / fillById / readTextById
        │
        ▼ (Android Appium only)
AndroidWebViewNative.scrollAndroidWebIdIntoView
        │
        ├─1. NATIVE_APP context
        ├─2. Try in-place UiAutomator find (unchanged)
        ├─3. Try CDP scrollIntoView(webId, pageUrl?)  ← NEW
        │       └─ on success: re-find by resource-id; return if found
        └─4. Existing UiScrollable / scrollGesture fallback
```

Tap/fill/read continue to call `scrollAndroidWebIdIntoView`, then existing native click/keys/getText.

## Components

### 1. `AndroidWebViewCdpHelpers` (new)

Location: `tests/framework/AndroidWebViewCdpHelpers.ts`

Responsibilities:

1. Resolve a CDP HTTP endpoint for the **MetaMask in-app WebView** (not Chrome browser).
2. Select the page target matching `pageUrl` (or best MetaMask browser page when URL omitted but webId-only callers exist).
3. Open a short-lived CDP WebSocket session.
4. Evaluate scroll script for `document.getElementById(webId)`.
5. Close the session; never leave the Appium session in a WEBVIEW Chromedriver context.

Discovery strategy (in order):

1. Prefer Appium `mobile:getContexts` / detailed contexts that expose `webSocketDebuggerUrl` for the MetaMask package WebView (not `WEBVIEW_chrome`).
2. Else `adb forward` to `@webview_devtools_remote_<pid>` for the MetaMask app process (`APP_PACKAGE_IDS.ANDROID`), then `http://127.0.0.1:<port>/json/list`.
3. Match targets by URL (same host/path alias rules as `ChromeCdpHelpers` / `PlaywrightContextHelpers`) against `pageUrl` when provided.

Public API (minimal):

```ts
scrollElementByIdIntoView(webId: string, options?: { pageUrl?: string }): Promise<boolean>
```

- Returns `true` if evaluate reported the element existed and scroll ran.
- Returns `false` (or throws only for programming errors) on discovery/connect/evaluate failure so callers can fall back — prefer **catch internally and return false** with debug logs so scroll path stays non-fatal.

Reuse: extract shared CDP session / fetch polling from `ChromeCdpHelpers` only if it stays a small shared module without expanding scope. Prefer duplicating a thin session helper first if extraction risks a large refactor.

### 2. `AndroidWebViewNative` (update)

In `scrollAndroidWebIdIntoView`:

1. Keep native context switch + in-place find.
2. After in-place miss, call `AndroidWebViewCdpHelpers.scrollElementByIdIntoView(webId, { pageUrl: options.pageUrl })` when `options.pageUrl` is present (required for reliable target selection).
3. If CDP returns true, re-find by resource-id with the existing short timeout; return if found.
4. Otherwise continue with UiScrollable / gesture fallback unchanged.

`WebViewByIdOptions` already includes `pageUrl` for Appium; snaps pass `TEST_SNAPS_URL`. Call sites without `pageUrl` skip CDP and use native scroll only.

### 3. `WebView` facade

No API change. Android Appium already routes through `AndroidWebViewNative`. Ensure `pageUrl` continues to be forwarded in scroll options (already part of `WebViewByIdOptions`).

## Error handling

| Failure | Behavior |
|---------|----------|
| No WebView debug socket / adb forward fails | Log debug; return false → native scroll |
| No matching CDP page target | Log debug; return false → native scroll |
| CDP evaluate throws / element missing | Log debug; return false → native scroll |
| CDP succeeds but resource-id still missing | Fall through to UiScrollable (virtualized a11y node) |
| LavaMoat blocks evaluate | Treated as CDP failure → native scroll |

Never attempt Chromedriver `switchContext` as part of this path.

## Testing

Unit tests (Jest), following existing framework test patterns:

- Target / URL matching for MetaMask WebView pages (including path normalization).
- Endpoint discovery prefers MetaMask package WebView over `WEBVIEW_chrome`.
- Successful CDP scroll path: mocked fetch + WebSocket/session → returns true; native re-find used by caller.
- CDP failure → `scrollAndroidWebIdIntoView` still reaches UiScrollable / gesture (mock CDP to return false).
- Without `pageUrl`, CDP helper is not required / not called (or no-ops).

Manual / CI validation (after merge-ready implementation):

- Run a snaps Android Appium subset that scrolls deep on the test-snaps page and confirm:
  - Logs show CDP scroll when available.
  - Fallback still works if CDP is forced off (env flag optional for spike: `ANDROID_WEBVIEW_CDP_SCROLL=0`).

Optional spike flag:

- `ANDROID_WEBVIEW_CDP_SCROLL` default on for Android Appium; set `0`/`false` to force native-only scroll for bisect.

## Success criteria

1. With CDP available, scrolling to off-screen test-snaps controls no longer depends on multi-attempt UiScrollable sweeps as the happy path.
2. When CDP is unavailable, behavior matches today’s native scroll (no new flakes from missing CDP).
3. Tap/fill/read remain native UiAutomator.
4. Unit tests cover success + fallback; no Chromedriver context switch introduced.

## Follow-ups (out of scope)

- CDP tap/fill/read if scroll spike is stable on CI.
- Shared CDP module for Chrome + in-app WebView.
- Broader docs update in `docs/testing/appium-smoke-testing.md` once proven.
