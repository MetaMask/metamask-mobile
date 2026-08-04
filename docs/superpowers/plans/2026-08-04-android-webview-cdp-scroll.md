# Android WebView CDP Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed up Android Appium in-app WebView scrolling via CDP `scrollIntoView`, with native UiAutomator fallback.

**Architecture:** New `AndroidWebViewCdpHelpers` discovers MetaMask WebView CDP endpoint and scrolls by HTML id. `AndroidWebViewNative.scrollAndroidWebIdIntoView` tries CDP after in-place miss, then existing UiScrollable/gesture path.

**Tech Stack:** TypeScript, Jest, Appium/WDIO driver, `ws`, `adb`

## Global Constraints

- Android Appium only; no Chromedriver `switchContext`
- CDP scroll only; native tap/fill/read unchanged
- CDP failures must fall back to native scroll (non-fatal)
- `pageUrl` required to attempt CDP; without it, native-only
- Optional kill switch: `ANDROID_WEBVIEW_CDP_SCROLL=0`
- Unit tests: no "should" in names; AAA pattern

## File Structure

- Create: `tests/framework/AndroidWebViewCdpHelpers.ts`
- Create: `tests/framework/AndroidWebViewCdpHelpers.test.ts`
- Create: `tests/framework/AndroidWebViewNative.test.ts`
- Modify: `tests/framework/AndroidWebViewNative.ts` (options + CDP attempt)
- Spec already at: `docs/superpowers/specs/2026-08-04-android-webview-cdp-scroll-design.md`

---

### Task 1: CDP helper — URL match + enable flag + scroll API (unit-tested)

**Files:**
- Create: `tests/framework/AndroidWebViewCdpHelpers.ts`
- Create: `tests/framework/AndroidWebViewCdpHelpers.test.ts`

**Interfaces:**
- Produces:
  - `isAndroidWebViewCdpScrollEnabled(): boolean`
  - `urlsReferToSameDapp(candidateUrl: string, dappUrl: string): boolean`
  - `pickMetaMaskWebViewDebuggerUrl(rawContexts: RawAppiumContext[], packageId: string): string | undefined`
  - `AndroidWebViewCdpHelpers.scrollElementByIdIntoView(webId: string, options: { pageUrl: string }): Promise<boolean>`

- [ ] **Step 1: Write failing tests** for enable flag, URL matching, MetaMask-vs-Chrome context pick, scroll success/failure (mock fetch/ws/driver)

- [ ] **Step 2: Run tests — expect FAIL** (`yarn jest tests/framework/AndroidWebViewCdpHelpers.test.ts`)

- [ ] **Step 3: Implement helper**

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

### Task 2: Wire CDP into AndroidWebViewNative scroll

**Files:**
- Modify: `tests/framework/AndroidWebViewNative.ts`
- Create: `tests/framework/AndroidWebViewNative.test.ts`

**Interfaces:**
- Consumes: `AndroidWebViewCdpHelpers.scrollElementByIdIntoView`, `isAndroidWebViewCdpScrollEnabled`
- Extends `AndroidWebViewScrollOptions` with `pageUrl?: string`

- [ ] **Step 1: Write failing tests** — with pageUrl + CDP true, skips UiScrollable; CDP false falls back; no pageUrl skips CDP

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Wire CDP attempt after in-place miss**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit + push + update PR**

### Task 3: Verification

- [ ] Run both unit test files
- [ ] Lint touched files if needed
- [ ] Push and update PR body
