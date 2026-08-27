# RN 0.85 Upgrade — Execution Plan & PR TODO

> Source of truth for verdicts: `rn-0.85-blockers.txt` (web-verification pass 2026-07-14).
> Currently on `react-native@0.83.6` (patched) → target **0.85.3**.
> Legend: `[x]` done/merged · `[~]` PR open, in flight · `[ ]` todo · `[?]` decision/spike needed

---

## 1. IN FLIGHT — PRs already open (track to merge)

| PR         | Scope                                                       | CI status                  | Action                                  |
| ---------- | ----------------------------------------------------------- | -------------------------- | --------------------------------------- |
| [~] #33192 | `absoluteFillObject` codemod                                | 🟢 GREEN                   | **Merge now**                           |
| [~] #32966 | reanimated 4.5.1 + worklets 0.10.1 + gesture-handler 2.32.0 | 🟡 pending (rebased 07-14) | Watch CI → merge (unblocks nitro-fetch) |
| [~] #33118 | svg 15.15.5 + regenerated patch                             | 🟡 pending                 | Watch CI                                |
| [~] #33121 | screens 4.25.2                                              | 🟡 pending                 | **Fixing**                              |
| [~] #33201 | jest preset → `@react-native/jest-preset`                   | 🟡 pending                 | **Fixing**                              |
| [~] #33214 | `ContextContainer::Shared` JNI fix                          | 🟡 pending                 | **Fixing**                              |

**Immediate focus:** merge #33192, get the 3 red PRs green. Nothing new starts until this foundation is stable.

---

## 2. TODO — new work, grouped into proposed PRs

### Tier 1 — Required blockers (app won't build/run on 0.85 without these)

- [ ] **PR-1 · get-random-values → 2.0.0** _(SOLO — wallet-critical, land EARLIEST for max soak)_
  - Real iOS link failure on 0.85 (`_RCTRegisterModule`, legacy arch compiled out).
  - Fix = in-place bump to 2.0.0 (TurboModule rewrite), **not** the expo-crypto rewrite.
  - Touches `shim.js`. Verify entropy path end-to-end.

- [ ] **PR-2 · Nitro crypto cluster** _(GROUP — atomic, peer-coupled)_
  - `react-native-quick-base64` 2.2.0 → **3.0.1**
  - `react-native-quick-crypto` 0.7.15 → **1.1.5**
  - Why grouped: quick-crypto 1.x peers `quick-base64 >=3.0.0` — splitting breaks peers.
  - Both patches drop/rewrite. Keep `nitro-modules` on **0.35.5** (do NOT bump to 0.36.x).

- [ ] **PR-3 · nitro-fetch → ≥1.4.1 (take 1.4.2 or 1.5.0)** _(SOLO — sequenced)_
  - **Depends on #32966 merging first** (worklets 0.10.1 peer).
  - Still peers `nitro-modules ^0.35.2` → confirms 0.36.x stays out.

- [ ] **PR-4 · Firebase app+messaging → 25.1.0** _(SOLO isolate — early, beta soak)_
  - MUST also bake Podfile `RCT_USE_PREBUILT_RNCORE=0` / forceStaticLinking — the bump does **not** fix #8883 (PR #9024 still unreleased).
  - Audit deprecated messaging permission APIs (v25).

- [ ] **PR-5 · Sentry → 8.18.0** _(SOLO isolate)_
  - Min safe 8.15.1 (8.13/8.14 drop events on 0.85). v7 risks silent event drops on Hermes V1.
  - Init API changed → patch rework, align `@sentry/*` devDeps.

- [ ] **PR-6 · Braze → 22.0.0** _(SOLO isolate — Xcode-26-driven)_
  - Re-check ReactModuleInfo patch still applies. `placementId` rename is a no-op for us (no native BrazeBannerView) — skip that audit.

- [ ] **PR-7 · §C required native bumps** _(GROUP — similar mechanical native bumps)_
  - `react-native-permissions` 3.7.2 → **5.6.0** (constants renamed, ~4 files)
  - `react-native-blob-util` 0.19.9 → **0.24.10** (+ bump the `resolutions` pin for `redux-persist-filesystem-storage/react-native-blob-util`)
  - `react-native-view-shot` 4.0.3 → **5.1.1** (Paper→Fabric snapshot fix)
  - ~~`react-native-video` → **≥6.19.1**~~ DONE — lockfile already resolved 6.19.1; explicit bump to `^6.19.2` in PR #33347 (also picks up absoluteFill fix)

- [ ] **PR-8 · react-native-share → 12.3.1** _(SOLO — ~17 files + patch regen, schema change)_
  - 7.3.7 calls `BackHandler.removeEventListener` (removed RN 0.77); fixed 12.0.5.

- [ ] **PR-9 · cookies → @preeternal/react-native-cookie-manager 6.3.3** _(SOLO — ~4 files)_
  - Old pkg archived + no New-Arch support. Fork is API-compatible TurboModule (v6.3.2 = RN 0.85 refresh).

- [ ] **PR-10 · notifee → 9.1.8** _(SOLO — small)_
  - 9.0.0 below the 9.1.4 new-arch floor. Add maven workaround.

- [ ] **PR-11 · @react-native-community/checkbox replacement** _(SOLO — verify)_
  - Flagged unsupported-on-new-arch by expo-doctor. Replace with design-system checkbox / expo-checkbox (~3 files).

### Tier 2 — Investigations / verifications (may become PRs)

- [?] **segment @2.23.0 `trackDeepLinks` on bridgeless** — verify our patch covers it; if not, patch/bump (real crash risk).
- [?] **ble-plx** — KEEP our patch (3.5.1 lacks the iOS new-arch null-arg fix). Only bump if patch re-applied. Ledger E2E either way.
- [?] **§B wildcard natives** (os, i18n, sensors, fast-crypto, randombytes, background-timer, material-textfield) — no breakage evidence; **spike build (#32888) decides**. Batch any real failures into one PR.
- [?] **§F unknowns** (rive, branch, veriff, gzip, confirmation-code-field, skeleton-placeholder, scrollable-tab-view) — no evidence; smoke-build to confirm.
- [?] **react-native-fs** / **react-native-default-preference** — dead but no proven 0.85 break. If spike fails: fs → `@dr.pogodin/react-native-fs` 2.38.2 (cheap fork) or expo-file-system; default-preference → mmkv / turbo-preferences.

### Tier 3 — Non-blocking batch

- [ ] **PR-12 · §G safe chores** _(one batch PR)_
  - safe-area-context 5.8.0 · lottie 7.3.8 · flash-list 2.3.2 · walletconnect/core 2.23.10 · clipboard 1.16.3 · slider 5.2.0 · keyboard-controller 1.22.0 · branch 6.10.0 · rive 9.8.3 · masked-view 0.3.2 · aes-crypto 3.3.0 · inappbrowser 3.7.1 · react-dom 19.2.3

---

## 3. DECISIONS / PROCESS BLOCKERS (not library bumps)

- [?] **Expo 55 → 56 decision** — this is what actually pulls the Xcode 26 / iOS 16.4 / TS 6 floors (NOT RN 0.85 core). Decide early; it gates the toolchain audit.
- [?] **CI runner / Xcode audit** — RN 0.85 core needs only Xcode 16.1 / iOS 15.1 / TS 5.x / Node 22.11 / JDK 17. If taking Expo 56 or Braze 22 → Xcode 26 applies. Lead-time risk.
- [?] **Global fetch collision** — SDK 56 installs `expo/fetch` as `globalThis.fetch` vs our nitro-fetch. Decide `EXPO_PUBLIC_USE_RN_FETCH=1` vs ordering; add boot assertion.
- [ ] **metro babel transformer** — swap zombie `metro-react-native-babel-transformer` → `@react-native/metro-babel-transformer` (can land anytime).
- [?] **@metamask/react-native-webview fork 14.6.0** — build fork vs 0.85; decide rebase onto upstream v15.
- [?] **Hermes V1 validation** — default since 0.84; validate boot/memory/bytecode tooling/Sentry symbolication. Plan to ship ON.
- [?] **SPIKE BUILD #32888 refresh** — re-run after each wave; the only reliable detector for §B + §F.

### 🔴 Hard blocker with no upstream fix

- [?] **Detox #4963** — `FabricUIManagerIdlingResources NoSuchFieldException` (`mMountItemDispatcher`) on Android New Arch.
  - **⚠️ Pinning to 0.85.0 does NOT help (verified 07-14):** the `mMountItemDispatcher` field is byte-identical across RN 0.83.8 → 0.84.0 → 0.85.0 → 0.85.3, and 0.85.1/.2/.3 changed nothing in Fabric mounting. It's a reflection/bridgeless-timing bug, not a field rename/removal, so no RN pin avoids it.
  - **Fix status:** #4963 still OPEN; no Detox release fixes it (latest 20.51.3; master still hardcodes the reflection with no fallback; no 21.x exists).
  - **Mitigations:** (a) **workaround now** — wrap affected taps in `device.disableSynchronization()`/`enableSynchronization()` + explicit `waitFor().toBeVisible().withTimeout()` (skips the idling resource; keeps Android E2E alive); (b) patch Detox ourselves (`try/catch(NoSuchFieldException)` → fall back to idle); (c) shift Android smoke to Appium for the window. **Decide + track weekly.**

---

## 4. VERIFIED NOT REQUIRED — dropped or deferred to post-upgrade

These were in the blocker list but web-verification cleared them (see `rn-0.85-blockers.txt`):

- **react-native-keychain 10** — v10 unrelated to 0.85 + vault migration risk. Stay on 9.x.
- **nitro-modules 0.36.1** — WRONG target (breaks nitro-fetch/text-decoder peers). Keep 0.35.5 (0.35.10 optional).
- **mmkv v4 / vision-camera v5** — KEEP v3 / v4. Nitro rewrites with open build issues; not required.
- **§C optional bumps** — netinfo 12, async-storage 3 (migration risk overstated), device-info 15, datetimepicker 9. Defer.
- **vector-icons scoped 13.x** — deprecated but works; codemod is post-upgrade hygiene (~48 files).
- **expo-video / expo-file-system / expo-crypto migrations** — all optional; cheaper bumps exist (see Tier 1/2).

---

## 5. SEQUENCING

1. **Foundation:** merge #33192; green the 3 red PRs (#33121, #33201, #33214).
2. **Parallel, zero-conflict, start now:** PR-1 (get-random-values, longest soak) · Detox #4963 investigation · Expo 56 + CI/Xcode decision.
3. **After #32966 merges:** PR-2 (nitro crypto) → PR-3 (nitro-fetch).
4. **Staggered isolates (soak, one every few days):** PR-4 Firebase · PR-5 Sentry · PR-6 Braze.
5. **Refresh spike #32888** → turn §B/§F into a concrete error list.
6. **Mechanical waves:** PR-7 (§C required) · PR-8 share · PR-9 cookies · PR-10 notifee · PR-11 checkbox.
7. **Decisions before upgrade PR:** fetch collision · webview fork · Hermes V1 validation.
8. **Last:** PR-12 (§G safe chores). Post-upgrade: vector-icons, keychain, expo migrations, mmkv v4, vision-camera v5.
