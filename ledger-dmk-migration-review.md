# Ledger DMK Migration — Code Review & Analysis

**Branch:** `oc/dmk-test` (PR [#30794](https://github.com/MetaMask/metamask-mobile/pull/30794))
**Reviewed against:** Ledger's official DMK agent skills — [`ledger-dmk-implementation`](https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/ledger-dmk-implementation), [`dmk-intent-vocabulary`](https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/dmk-intent-vocabulary), [`dmk-business-logic`](https://github.com/LedgerHQ/agent-skills/tree/main/skills/dmk/dmk-business-logic) — plus the installed package sources (`@ledgerhq/device-management-kit@1.5.x`, `@ledgerhq/device-transport-kit-react-native-ble@1.3.x`, `@metamask/eth-ledger-bridge-keyring@12.3.0`).

**Review priorities (per request):** 1. reliability · 2. correctness · 3. performance · 4. missing gaps · 5. scalability & maintenance.

---

## 1. Architecture as implemented (context for the findings)

```
UI hooks (useDeviceConnectionFlow / useAdapterLifecycle)
  └─ LedgerBluetoothDMKAdapter          (app/core/HardwareWallet/adapters/LedgerBluetoothDMKAdapter.ts)
       ├─ discovery / BLE-state ────────► DMK instance #1  (getDmk(), app/core/Ledger/dmk.ts)
       │                                  + legacy TransportBLE.observeState (3rd BLE stack)
       └─ connect / session / signing ──► Ledger.ts helpers ──► LedgerKeyring.bridge = LedgerDmkBridge
                                                                   └─ DMK instance #2 (built inside the
                                                                      keyring bridge, owns sessions and
                                                                      the SignerEth used for signing)
```

Key design choices in this branch:

- The keyring's `LedgerDmkBridge` (from `@metamask/eth-ledger-bridge-keyring`) builds and owns its **own** DMK instance; sessions live there and are what signing uses.
- The adapter builds a **second** DMK instance (`getDmk()`) used only for `listenToAvailableDevices()` discovery, because the bridge's `startDiscovering()` is useless on RN BLE (the transport's `startDiscovering()` literally returns `from([])` — verified in `RNBleTransport.js`) and `listenToAvailableDevices` also surfaces already-paired/connected devices.
- Device IDs are stateless (ble-plx connects by UUID/MAC), so a device discovered on DMK #1 can be connected on DMK #2. This works, but has real costs (findings R‑2, R‑3).
- DMK errors are translated back into legacy `TransportStatusError`s by the keyring (`dmk-error-translator.mjs`), so the existing status-code parser keeps working — a clever compatibility move.

### What is done well

Before the findings — several things in this branch are genuinely strong and should be kept:

- **Session reuse across operations** (soft vs. hard `#closeSession`, `LedgerBluetoothDMKAdapter.ts:872–906`) matches the skill's teardown rule exactly: _"Do not disconnect between consecutive operations — the session is a transport connection, not an authorization."_
- **The 3s disconnect debounce** (`LedgerBluetoothDMKAdapter.ts:378–400`) correctly absorbs the BLE drop that Ledger devices produce when switching apps — a classic source of false-positive "disconnected" UI.
- **Derivation paths remain developer constants** (`LEDGER_LIVE_PATH` etc., `app/core/Ledger/constants`), never user input — per the skill's hard security rule. The `m/` prefix is stripped upstream by the keyring middleware (`stripPathPrefix`) before reaching DMK, avoiding the documented `parseInt("m") → NaN` gotcha.
- **No stub/mock transport anywhere in production code.**
- **The keep-alive adapter logic** in `useAdapterLifecycle.ts:146–175` (don't destroy the adapter when `walletType` transiently nulls mid-flow) fixes a real class of "adapter destroyed mid-APDU" failures, and is well documented.
- **The metro `reflect-metadata` shim** (`metro.config.js:59–105`, `app/shims/reflect-metadata-once.js`) is thoroughly reasoned and scoped narrowly to the DMK closure.

---

## 2. Findings

Ordered by severity within each category. Each finding has: location, what happens, why it matters (with skill/doc reference), and a suggested change.

### RELIABILITY

---

#### R‑1 (Critical) — Feature-flag split-brain: keyring bridge and adapter can disagree

**Where:**

- `app/core/Engine/wallet-init/initialization.ts:25–38` — reads `RemoteFeatureFlagController` **persisted state directly** at engine init (remoteFeatureFlags + localOverrides), no basic-functionality gate.
- `app/core/HardwareWallet/hooks/useAdapterLifecycle.ts:66–68, 85` — reads `selectRemoteFeatureFlags` **live** at adapter-creation time.
- `app/selectors/featureFlagController/index.ts:49–58` — `selectRemoteFeatureFlags` returns `{}` **when basic functionality is disabled**.

**What happens:** The two reads are documented as agreeing "as long as the flag is stable across the two reads" (`app/core/Ledger/dmk.ts:20–22`), but there are two concrete divergence vectors:

1. **Basic functionality off.** The engine-init read ignores the basic-functionality setting; the selector does not. A user with basic functionality disabled and the remote flag persisted as enabled gets: keyring → `LedgerDmkBridge`, adapter → legacy `LedgerBluetoothAdapter`.
2. **Runtime flag flip.** `RemoteFeatureFlagController` refetches periodically. The keyring builders are fixed at engine init; the adapter re-evaluates on every adapter creation. A flag that flips after init produces a mismatch until the next app restart.

**Why it matters:** The mismatch is silent and fatal for Ledger users:

- _DMK adapter + legacy bridge:_ `connectLedgerDmkHardware` calls `await ledgerBridge.updateSessionId?.(sessionId)` (`app/core/Ledger/Ledger.ts:163`). On `LedgerMobileBridge` that method doesn't exist, the optional chain **silently no-ops**, and the following `getAppNameAndVersion()` fails on a transport-less legacy bridge.
- _Legacy adapter + DMK bridge:_ the legacy adapter calls `updateTransportMethod(transport)`, which on `LedgerDmkBridge` is a **no-op shim returning `true`** (`ledger-dmk-bridge.mjs:149–151`), then every command throws `'Session ID not set. Call connect() or setSessionId() first.'`

**Suggested change:**

1. Resolve the flag **once** at engine init and latch it — e.g. `initializeWallet` calls a `setDmkEnabled(useDmk)` exported from `app/core/Ledger/dmk.ts`; `useAdapterLifecycle` reads the latch instead of live Redux state. A flag flip then takes effect on next launch, atomically for both sides. (The `TODO: Remove this parameter when we remove the DMK feature flag` comments already anticipate this being temporary — a latch makes the temporary state safe.)
2. Independent of (1), make the mismatch loud: in `connectLedgerDmkHardware` (`Ledger.ts:160–165`), replace the optional chain with an explicit guard —
   ```ts
   if (typeof ledgerBridge.updateSessionId !== 'function') {
     throw new Error(
       'DMK adapter paired with non-DMK Ledger bridge (feature-flag mismatch)',
     );
   }
   ```
   A clear error in Sentry beats a generic downstream failure.

---

#### R‑2 (Critical) — The BLE discovery scan is never stopped: battery drain + link interference

**Where:** `LedgerBluetoothDMKAdapter.ts:506, 545–559` (`stopDeviceDiscovery`), `:222–253` (`#doBackgroundReconnect` scan), and `RNBleTransport.listenToAvailableDevices` (verified in `node_modules/@ledgerhq/device-transport-kit-react-native-ble/lib/esm/api/transport/RNBleTransport.js`).

**What happens:** `stopDeviceDiscovery()` only unsubscribes the RxJS subscription. The code comment even acknowledges it: _"The underlying DMK scan may persist."_ It does — permanently:

- `listenToAvailableDevices()` calls `_startScanning()` via a `tap`, and the returned observable has **no unsubscribe teardown** that stops the scan. `_stopScanning()` (which calls native `manager.stopDeviceScan()` and clears a 1-second `setInterval`) runs in exactly two places: `transport.stopDiscovering()` and `transport.connect()`.
- In this architecture, `connect()` happens on **DMK #2** (the bridge's transport), so it stops _that_ transport's scan — never DMK #1's. `dmk.stopDiscovering()` is never called anywhere in the branch.

Net effect: after the first device-selection scan (and after every `backgroundReconnect` fallback scan), a native BLE scan **with `allowDuplicates: true`** plus a 1 s JS interval runs for the remainder of the app session.

**Why it matters:**

- Continuous BLE scanning is one of the most battery-expensive things a mobile app can do; `allowDuplicates: true` disables OS-level scan batching on iOS.
- An active scan on the same adapter degrades the connected GATT link's throughput and stability — i.e., it directly harms the APDU exchange reliability you're migrating to improve.
- Android penalizes long-running scans (scan downgrade after 30 min; apps that start >5 scans per 30 s get scans silently suppressed) — subsequent discovery attempts can silently find nothing.

**Suggested change:** In `stopDeviceDiscovery()` call `getDmk().stopDiscovering()` (the API exists on `DeviceManagementKit`, verified against the installed package) in addition to unsubscribing. Same at the end of the `#doBackgroundReconnect` scan (`:255` both branches). Verify on-device with `adb shell dumpsys bluetooth_manager | grep -A5 ScanManager` or the iOS PacketLogger that scans actually stop.

---

#### R‑3 (High) — Three parallel BLE stacks / two DMK instances

**Where:**

- DMK #1: `app/core/Ledger/dmk.ts:37–53`.
- DMK #2: inside `LedgerDmkBridge` (`keyrings.ts:91` → `new LedgerDmkBridge({ transportFactory: RNBleTransportFactory })`).
- Stack #3: `LedgerBluetoothDMKAdapter.ts:1, 927` — `TransportBLE.observeState` from the **legacy** `@ledgerhq/react-native-hw-transport-ble`, used only for Bluetooth on/off monitoring.

**What happens:** Each `RNBleTransportFactory` invocation constructs `new BleManager()` (verified in `RNBleTransportFactory.js`), and the legacy transport keeps its own. That's **three** `react-native-ble-plx` managers. ble-plx documents `BleManager` as a singleton; multiple instances mean multiple native clients with independent state subscriptions and scan registrations (which compounds R‑2 on Android's per-app scan budget).

**Why it matters:** The DMK skill is unambiguous: _"One DMK instance per application — singleton"_ ([dmk-sdk-reference.md, Architecture](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-sdk-reference.md)), and the platform-patterns doc calls creating two instances a bug outright. The current split exists for one reason: the bridge doesn't expose `listenToAvailableDevices`/`observeBleState`/`stopDiscovering`, only `startDiscovering` — which is a no-op on RN BLE.

**Suggested change (in order of preference):**

1. **Upstream (`@metamask/eth-ledger-bridge-keyring`):** add pass-throughs on `LedgerDmkBridge` for `listenToAvailableDevices`, `stopDiscovering`, and ideally BLE state (`observeBleState` is already on the transport). Then delete `getDmk()` and the `TransportBLE.observeState` usage; the adapter talks to exactly one DMK. This also fixes R‑2 structurally (connect on the same transport stops its own scan).
2. **Alternative upstream:** let `LedgerDmkBridge` accept an injected, pre-built `DeviceManagementKit` (`new LedgerDmkBridge({ dmk: getDmk() })`) instead of a `transportFactory`. One instance, no API additions.
3. **Interim (this repo, if upstream lags):** keep the split but (a) fix R‑2, and (b) replace `TransportBLE.observeState` with a small wrapper over DMK #1 — otherwise the legacy transport package can never be removed after migration, defeating a main goal of the DMK move.

---

#### R‑4 (High) — Locked device is misreported as "app not open" in the wrong-app path

**Where:** `LedgerBluetoothDMKAdapter.ts:756–797` (`#handleWrongApp`), `:1036–1064` (`#isDeviceLocked`).

**What happens:** A locked device on the dashboard typically still answers `GetAppAndVersion` with `BOLOS`. `#doEnsureDeviceReady` then routes to `#handleWrongApp('BOLOS')` → emits `AppNotOpen` → sends `OpenAppCommand`, which fails on a locked device (status `0x5515`, translated by the keyring to `TransportStatusError`). Both catch blocks in `#handleWrongApp` swallow the error (`:778–780`, `:792–794` — soft `#closeSession` is a no-op) and return. The locked check at `:722` never sees this error because `#handleWrongApp` doesn't rethrow.

**Why it matters:** The user is told to open the Ethereum app when the actual fix is _enter your PIN_. The skill classifies "Device locked" as a **mandatory ESCALATE with its own message** ([ledger-dmk-implementation SKILL.md → Error classification](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/SKILL.md)): _"The Ledger is locked. Enter your PIN on the device to continue."_ Guessing wrong here produces an unrecoverable-looking loop for the user.

**Suggested change:** In both catch blocks of `#handleWrongApp`, check `this.#isDeviceLocked(error)`; if locked, emit `DeviceEvent.DeviceLocked` and rethrow instead of swallowing. Consider the same for `0x6807` (app not installed — see C‑3).

---

#### R‑5 (High) — 10 s timeout on app-open races the user's physical confirmation

**Where:** `LedgerBluetoothDMKAdapter.ts:54` (`LEDGER_OPERATION_TIMEOUT_MS = 10000`), applied to `openEthereumAppOnLedger()` at `:771–776`.

**What happens:** `OpenAppCommand` requires the user to physically confirm the app launch on the device. A user who takes more than 10 seconds (very common: device in hand, reading the prompt, Stax/Flex UI animation) hits `'Device unresponsive while opening Ethereum app'` and lands in the retry/error path while the confirmation dialog may still be showing on the device.

**Why it matters:** The skill's timeout table specifies **30 s default for app-open user confirmation** (acceptable range 5–300 s), explicitly separating "user thinking time" from "device unresponsive" ([SKILL.md → Timeouts](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/SKILL.md)). 10 s is appropriate for pure APDU status checks like `getAppNameAndVersion`, not for HITL steps.

**Suggested change:** Introduce a second constant (e.g. `LEDGER_USER_CONFIRM_TIMEOUT_MS = 30000`) for `openEthereumAppOnLedger` (and `closeRunningAppOnLedger` can stay at 10 s — no user interaction).

---

#### R‑6 (High) — No timeout and no `cancel()` anywhere on signing operations

**Where:** Upstream `#waitForDeviceAction` (`ledger-dmk-bridge.mjs:332–345`) — `firstValueFrom` until `Completed`/`Error`, no timeout; the DMK's `{ observable, cancel }` **`cancel` is never invoked anywhere** in this branch or the keyring package.

**What happens:** If the user walks away mid-signature, or the device wedges in a Pending state, the keyring promise (and everything awaiting it — `KeyringController.signTransaction`, the confirmation flow, `useHardwareWalletSubmit`'s `runSubmit`) hangs indefinitely. Dismissing the app-side UI doesn't cancel the device action; DMK queues intents per session, so a zombie action can also block subsequent commands.

**Why it matters:** Skill Step 5: _"60 s elapsed → `cancel()` → ESCALATE: 'Operation timed out — user did not respond.'"_ Whether MetaMask wants a hard 60 s policy is a product decision (the legacy stack also waited indefinitely), but having **no** cancellation path when the user explicitly dismisses the flow is a gap regardless.

**Suggested change:** Two tiers:

1. _Minimum:_ when the confirmation flow is dismissed/aborted (`refs.abortControllerRef`, `handleCloseFlow`), propagate cancellation — today the abort signal only guards `connectLedgerDmkHardware` pre-checks (`Ledger.ts:58–66`), not the signing action. This likely needs the bridge to expose the pending action's `cancel` (upstream request), or a `bridge.destroy()` on explicit user cancel (heavier but available now).
2. _Better:_ upstream, add an optional timeout to `#waitForDeviceAction` honoring the skill's 60 s default.

---

#### R‑7 (Medium) — `hideAwaitingConfirmation` no longer disconnects — behavior change also hits the legacy (flag-off) path

**Where:** `app/core/HardwareWallet/HardwareWalletProvider.tsx:160–163` (diff removed `refs.adapterRef.current?.disconnect()`).

**What happens:** Keeping the session alive after signing is exactly right for DMK (session reuse). But the removed call — with its comment _"Ledger BLE transports are cached by device id inside the transport package, so release the transport once signing is no longer awaiting"_ — also served the **legacy** `LedgerBluetoothAdapter`, and this code runs for 100 % of users while the DMK flag is off. Whatever stale-cached-transport bug motivated that disconnect can now regress for everyone before DMK ships.

**Suggested change:** Make post-signing release an adapter concern: add e.g. `releaseAfterOperation()` to the adapter interface — legacy adapter implements it as `disconnect()`, DMK adapter as a no-op — and call that from `hideAwaitingConfirmation`. Alternatively gate on `walletType`/flag, but the interface method keeps the provider adapter-agnostic.

---

#### R‑9 (Medium, second pass) — `backgroundReconnect` bypasses the `#connectInFlight` mutual exclusion

**Where:** `LedgerBluetoothDMKAdapter.ts:164–211` (strategy 1 — direct connect), vs. `:108–139` (`connect()`'s in-flight latch).

**What happens:** `connect()` serializes itself through `#connectInFlight`, but `#doBackgroundReconnect` strategy 1 calls `connectLedgerDmkDevice()` directly without setting or checking that latch (strategy 2 is safe — it funnels through `this.connect()`). If the UI triggers `connect()` while a `backgroundReconnect` is mid-flight (plausible: `ensureDeviceReady`'s background-reconnect path racing a user tapping the device in the scan sheet), two `bridge.connect()` calls interleave. The middleware disconnects the replaced managed session (`ledger-dmk-transport-middleware.mjs:83–92`), but the adapter's `#sessionId` is assigned by whichever caller resolves **last** — which can be the session the middleware just disconnected. The adapter then believes it's connected to a dead session; the next operation fails with `DeviceSessionNotFound` and heals through the retry loop, but only after a visible error cycle. A similar window exists between `destroy()` and a `#doConnect` that's already past its await (the `#isDestroyed` check at `:300` covers destroy-before-resolve, not destroy-between-resolve-and-assign... it does actually — but not for the backgroundReconnect strategy-1 path at `:182`, which re-checks `#isDestroyed` but not a concurrent `connect`).

**Suggested change:** Route strategy 1 through the same latch: set `#connectInFlight` (or a shared `#sessionMutationInFlight`) around the direct-connect, and have `connect()` await it, mirroring how `backgroundReconnect` already dedups against itself via `#backgroundReconnectInFlight`.

---

#### R‑8 (Medium) — `destroy()`/`disconnect()` can _create_ a Ledger keyring as a side effect

**Where:** `app/core/Ledger/Ledger.ts:75–85` (`ensureLedgerKeyringExists` inside `withLedgerKeyring`) → `:128–132` (`getLedgerDmkBridge`) → `:212–215` (`disconnectLedgerDmkSession`) ← called from `#closeSession(hard)` ← `destroy()` / `disconnect()`.

**What happens:** Session teardown fetches the bridge via `withLedgerKeyring`, which **adds a new Ledger keyring if none exists**. Concrete sequence: user does _Forget device_ (`forgetLedger`) → keyring removed → provider unmounts → `adapter.destroy()` → `#closeSession('destroy', true)` → `disconnectLedgerDmkSession()` → `ensureLedgerKeyringExists()` → `addNewKeyring(LedgerKeyring.type)` — an empty Ledger keyring is re-persisted into the vault of a user who just asked to forget the device. Also runs vault ops fire-and-forget during React unmount, potentially while the wallet is locked (rejects, but noisily).

**Suggested change:** Give teardown a read-only lookup: a `getLedgerDmkBridgeIfExists()` that uses `withKeyringV2` without the ensure step (or checks `controller.keyrings.some(...)` first) and no-ops when absent. Only _connect_-direction helpers should ensure existence.

---

### CORRECTNESS

---

#### C‑1 (High) — Fast-path `ensureDeviceReady` fails hard where the main path guides the user

**Where:** `app/core/HardwareWallet/hooks/useDeviceConnectionFlow.ts:164–176` (`ensureDeviceReadyOrError`), `:267–286` (already-connected fast path), `:288–317` (background-reconnect path).

**What happens:** In the main flow, "device not ready" (wrong app / dashboard) leads to `createBlockingPromise()` — the promise resolves only when the flow completes, so the `AppNotOpen` UI can guide the user to open the Ethereum app and the operation then proceeds. In the two new fast paths, `ensureDeviceReadyOrError` instead calls `handleError(new Error('Device not ready'))` — an unclassified error that parses to `ErrorCode.Unknown` ("Something went wrong") — and returns `false` immediately. Callers like `useHardwareWalletSubmit.ts` treat `false` as terminal: `dispatch(TransactionFailed)`.

**Concrete repro:** Ledger connected, user backs out to the dashboard on the device, then submits a swap. Old behavior: "Open the Ethereum app" UI, user opens it, swap continues. New fast path: generic error + `TransactionFailed`.

**Suggested change:** When the fast-path readiness check returns `false` (as opposed to throwing), fall through to the `createBlockingPromise()` flow rather than erroring — the `AppNotOpen`/`DeviceLocked` events already emitted by the adapter will drive the right UI, and the promise preserves the "wait for user to fix it" contract. Reserve `handleError` for thrown errors.

---

#### C‑2 (Medium) — DMK rejection tags and buried error codes are not classified

**Where:** `app/core/HardwareWallet/errors/mappings.ts:278–285`, `parser.ts:175–202` (`parseDMKErrorByTag`).

**What happens:** The main rejection path is fine — the ETH signer surfaces rejection with `errorCode "6985"`, the keyring translates it to `TransportStatusError(0x6985)`, and the status-code parser maps it to `UserRejected` (verified `0x6985`/`0x5501`/`0x5515` all exist in `LEDGER_ERROR_MAPPINGS`). But errors that reach the app **without** passing through the keyring's translator — anything thrown from `bridge.connect`/`middleware`/DMK directly, which the adapter propagates raw — are classified only by `_tag`. Two gaps versus the skill's guidance:

1. `RefusedByUserDAError` (the device-action-layer rejection tag) is not in `ERROR_NAME_MAPPINGS`, so it would parse as Unknown → red "Something went wrong" for a user who deliberately pressed _reject_. The skill is explicit that rejection must surface as a distinct, non-alarming outcome ([SKILL.md → Error classification](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/SKILL.md)).
2. `UnknownDeviceExchangeError` buries its status code in `originalError.errorCode` ([dmk-sdk-reference.md → Key Gotchas](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-sdk-reference.md)): _"Always check `error?.errorCode ?? error?.originalError?.errorCode` when classifying."_ `parseDMKErrorByTag` looks at `_tag` only.

**Suggested change:** In `parseDMKErrorByTag`, after the tag lookup fails, extract `errorCode ?? originalError?.errorCode` and route it through the existing `parseLedgerStatusCode` (it already handles hex strings via `extractStatusCode`-style parsing — a small adapter is enough). Add `RefusedByUserDAError: ErrorCode.UserRejected` to `ERROR_NAME_MAPPINGS`. Mirror the skill's `isDeviceRejection()` helper from [dmk-code-patterns.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-code-patterns.md).

**Second-pass addendum — the `0x6f00` fallback misclassifies as "device unresponsive."** Verified against installed packages: `translateDmkError` returns `TransportStatusError(0x6f00)` for **any** error lacking a 4-hex-digit `errorCode` (`dmk-error-translator.mjs:16`), and `LEDGER_ERROR_MAPPINGS['0x6f00']` maps to `ErrorCode.DeviceUnresponsive` — i.e. "connection timed out" messaging. DA-layer errors without an `errorCode` (e.g. `RefusedByUserDAError`, `UnknownDAError`, context-module failures inside the signing state machine) therefore all surface as a red _timeout_ error. Worst case: a deliberate on-device rejection that surfaces at the DA layer reads as "Connection timed out" instead of the neutral "cancelled" the skill mandates. The command-layer rejections (errorCode `6985`/`5501`) are handled correctly — this is specifically the no-errorCode fallback. Fix belongs upstream in `translateDmkError` (check `_tag` before falling back to `0x6f00`), with the `ERROR_NAME_MAPPINGS` addition above as the app-side backstop.

---

#### C‑3 (Medium) — `0x6807` (app not installed) is unmapped

**Where:** `LEDGER_ERROR_MAPPINGS` (in `@metamask/hw-wallet-sdk`) has no `0x6807` key; the legacy stack had a dedicated `AppIsNotInstalled` communication error (`parser.ts:89–94` still maps it).

**What happens:** With DMK, a missing Ethereum app surfaces as `TransportStatusError(0x6807)` → unknown status → `ErrorCode.Unknown`. Combined with R‑4 (the error is currently swallowed in `#handleWrongApp`), a user without the app installed loops on "open the Ethereum app" with no hint that they must _install_ it via Ledger Live.

**Why it matters:** Skill error table: app not installed → ESCALATE with _"The required app is not installed on the Ledger. Install it via Ledger Wallet and try again."_

**Suggested change:** Map `0x6807` → `ErrorCode.DeviceMissingCapability` (which already renders app-related messaging) — either upstream in `hw-wallet-sdk`'s `LEDGER_ERROR_MAPPINGS`, or locally in `parseLedgerStatusCode` before the SDK lookup. Pair with the R‑4 rethrow so the error actually escapes.

---

#### C‑4 (Medium) — `#verifyEthereumAppUnlocked` verifies nothing; locked state is knowable but hidden

**Where:** `LedgerBluetoothDMKAdapter.ts:737–751`; bridge monitoring in `ledger-dmk-bridge.mjs:354–374`.

**What happens:** The method name promises a check; the body unconditionally emits `AppOpened` and returns `true`. The doc comment correctly explains why: the bridge's `onSessionStateChange` collapses the DMK's rich `DeviceSessionState` (which includes `DeviceStatus.LOCKED` — skill Step 3's whole point) into `{ connected: boolean }` (`deviceStatus !== NOT_CONNECTED`).

**Why it matters:** Skill Step 3 gates every operation on device state (`Ready`/`Locked`/`Busy`), enabling a _proactive_ "enter your PIN" prompt. Today, locked is only discovered reactively when the next operation errors — one extra failed round-trip and a worse first paint of the error UI. Not a functional bug (the error path works), but a known-gap to track.

**Suggested change:** Short-term, rename to `#emitEthereumAppOpened` so the code doesn't claim a check it doesn't perform. Properly: upstream, widen the bridge's session-state payload to `{ connected, deviceStatus }` and have the adapter treat `LOCKED` as an immediate `DeviceEvent.DeviceLocked`.

---

#### C‑5 (Low) — Android version detection via `getSystemVersion()` string parsing

**Where:** `LedgerBluetoothDMKAdapter.ts:561–594` (`ensurePermissions`).

**What happens:** `Number(getSystemVersion()) || 0` parses the _release string_. Non-numeric or OEM-mangled strings fall to `0`, sending an Android 12+ device down the `ACCESS_FINE_LOCATION` branch, where the grant is useless for BLE (needs `BLUETOOTH_SCAN/CONNECT` on API 31+) — scan then fails with a misleading permission state. Also, `Linking.openSettings()` fires on plain `DENIED` (`:581–590`), which is a _re-requestable_ state — bouncing the user to Settings on the first decline is aggressive; Settings is only necessary on `BLOCKED`.

**Suggested change:** Use `Platform.Version >= 31` (numeric API level, no parsing) for the branch. Only `openSettings()` when the result is `RESULTS.BLOCKED`. Note the DMK RN BLE transport ships its own `AndroidPermissionsService` and performs the same requests inside `_waitForScanningPrerequisites` — after R‑3 consolidation you may be able to delete this method entirely.

---

#### C‑6 (Low) — `resetDmk()` leaks the previous instance

**Where:** `app/core/Ledger/dmk.ts:55–58`.

**What happens:** The reference is nulled without calling `dmk.close()` (the API exists — verified on `DeviceManagementKit.prototype`). The old instance keeps its `BleManager`, BLE-state subscription, and any lingering scan; the next `getDmk()` stacks a fresh one on top. Currently only tests call `resetDmk`, but it's an exported footgun.

**Suggested change:** `state.dmk?.close(); state.dmk = null;` (fire-and-forget with a catch is fine).

---

#### C‑7 (Medium, second pass) — `resolveOrCreateAdapter` leaks the replaced adapter's BLE monitoring

**Where:** `app/core/HardwareWallet/hooks/useDeviceConnectionFlow.ts:74–95` (specifically `:89` — `existing?.disconnect().catch(() => {})`).

**What happens:** When the target wallet type differs from the existing adapter, the old adapter is replaced via `disconnect()` — but only `destroy()` stops the adapter's own `TransportBLE.observeState` subscription (`#bleStateSubscription`, `LedgerBluetoothDMKAdapter.ts:924–975`) and clears `#transportStateCallbacks`. The orphaned adapter's BLE state listener runs for the remainder of the app session, and `#isDestroyed` never gets set, so any late async callbacks on it still execute. The parallel replacement path in `useAdapterLifecycle.ts:156–158` was correctly migrated to `destroy()` in this branch; this one was missed. One leaked adapter per wallet-type swap (e.g. user with both a Ledger and a QR account switching between them repeatedly).

**Suggested change:** `existing?.destroy()` — matching `useAdapterLifecycle`. (`destroy()` internally performs the session close that `disconnect()` did, minus the `Disconnected` event, which is not wanted here anyway.)

---

#### C‑8 (Low, second pass) — `#doConnect` has two inconsistent failure contracts

**Where:** `LedgerBluetoothDMKAdapter.ts:275–285` vs `:350–358`.

**What happens:** When the deviceId has no cached `DiscoveredDevice`, `#doConnect` emits `ConnectionFailed` and **returns successfully** (no throw); when retries are exhausted, it emits `ConnectionFailed` **and throws**. Callers that `await adapter.connect(id)` therefore cannot rely on rejection to detect failure — `useDeviceConnectionFlow.connect():193–210` proceeds to `setDeviceId` + readiness check after a "successful" connect that never created a session, recovering only via the `#sessionId == null → false` guard one layer down, with a second `ConnectionFailed` emitted along the way. Skill rule: _"Never silently swallow errors"_ — resolving successfully on a known failure is the promise-level equivalent.

**Suggested change:** Throw in the no-cached-device branch too (after emitting), so `connect()` has a single contract: resolves ⇒ session exists.

---

### PERFORMANCE

---

#### P‑1 — Covered by R‑2/R‑3 (persistent scan + triple BLE stack) — these are the dominant performance issues.

#### P‑2 (Low) — Session refresher configuration left implicit

**Where:** `Ledger.ts:187–192` (`connectLedgerDmkDevice` → `bridge.connect({ device })`).

**What happens:** No `sessionRefresherOptions` are passed, so DMK's default refresher polls the device on its default interval for the lifetime of the session — on top of the (currently unstopped) scan from R‑2 and the bridge's own `getDeviceSessionState` monitoring. Fine in isolation; just make the choice explicit per skill Step 2 (`sessionRefresherOptions: { isRefresherDisabled: false, pollingInterval: … }`) so the BLE duty cycle is a reviewed decision rather than a default.

---

### MISSING GAPS

---

#### G‑1 (High, verify on device) — DMK's ETH signer introduces new on-device prompts the app UI doesn't narrate

**Where:** `SignTransactionDeviceAction` in `@ledgerhq/device-signer-kit-ethereum` (verified in installed package); bridge `#waitForDeviceAction` filters the observable to `Completed`/`Error` only, discarding `intermediateValue.requiredUserInteraction`.

**What happens:** The DMK signing state machine does much more than the old `hw-app-eth` call: it auto-runs `OpenAppDeviceAction`, fetches app config, and — on supported devices (non-Nano, app version ≥ threshold) — can emit **`UserInteractionRequired.Web3ChecksOptIn`**, a brand-new on-device prompt asking the user to opt into Ledger's transaction-check service, _mid-signing_. Because the bridge discards intermediate states, the MetaMask UI will say "confirm the transaction on your device" while the device is actually showing an unexplained opt-in screen. There's also a **blind-sign fallback** path (`BlindSignTransactionFallback`): if clear-signing context fails for a non-rejection reason, DMK silently retries in basic/blind mode — behavior worth knowing about for security review.

**Why it matters:** The skill's core UI pattern maps every `UserInteractionRequired` value to a specific prompt ([dmk-code-patterns.md → Observable Subscription](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-code-patterns.md)). Dropping intermediates was a deliberate compat simplification upstream, but Web3ChecksOptIn on a Stax/Flex is a user-visible surprise this branch inherits silently.

**Suggested change:**

1. QA the full signing flow on a Stax/Flex with a recent Ethereum app to observe the opt-in prompt.
2. Upstream feature request: have `LedgerDmkBridge` expose an intermediate-state callback/observable so mobile can update the awaiting-confirmation copy per step (this also unlocks the skill-recommended prompts for `ConfirmOpenApp`, `UnlockDevice`, etc.).

---

#### G‑2 (Medium) — No `originToken` on `SignerEthBuilder` (Clear Signing enrollment)

**Where:** Upstream — `ledger-dmk-transport-middleware.mjs:128–131`: `new SignerEthBuilder({ dmk, sessionId }).build()`.

**What happens:** Per the business-logic skill, `originToken` is the partner token for Ledger's Clear Signing program; without it the signer works but metadata-backed clear signing can silently degrade to raw-hex signing ([dmk-business-logic → Clear Signing](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/dmk-business-logic/SKILL.md), [Ledger docs](https://developers.ledger.com/docs/clear-signing/for-wallets)). `LedgerDmkBridge`'s constructor options don't currently accept one, so this needs an upstream change too.

**Suggested change:** Confirm with Ledger whether MetaMask should enroll (or already has a token from the extension work); thread `originToken` through `LedgerDmkBridge` opts → middleware → `SignerEthBuilder`. Track as a pre-GA item since it changes what users see on-device.

---

#### G‑3 (Medium) — Test coverage of the adapter is a fraction of its risk surface

**Where:** `LedgerBluetoothDMKAdapter.test.ts` — 224 lines covering only `walletType` and `#isDeviceLocked` classification, against 1,110 lines of adapter.

**Untested reliability-critical paths:** `connect` dedup/in-flight semantics (`:103–139`), retry loop + `#isSessionLost` session reset (`:638–678`), both `backgroundReconnect` strategies incl. the destroy-mid-reconnect guard (`:164–272`), session-monitor debounce/complete/error → `#handleDisconnect` (`:361–401`), `#handleWrongApp` branches (`:756–797`), discovery lifecycle + 30 s timeout (`:483–559`), `#withTimeout` onTimeout cleanup (`:1073–1102`), `destroy()` during in-flight connect (`:300–307`). These are precisely the paths where DMK behaves differently from the legacy transport.

**Suggested change:** Add AAA unit tests (per `docs/testing/unit-testing.md`) mocking the `Ledger.ts` helpers and `getDmk`, prioritizing: (1) transient-error retry → success, (2) session-lost → fresh connect, (3) wrong-app → open-app → locked-error propagation (locks in R‑4's fix), (4) discovery timeout with 0 devices, (5) `destroy()` racing `connect()`.

---

#### G‑4 (Low) — Discovery never restarts scanning after BLE toggles

**Where:** `LedgerBluetoothDMKAdapter.ts:483–543`.

**What happens:** If Bluetooth is off when discovery starts, `_waitForScanningPrerequisites` errors (`BlePoweredOff`), `onError` fires, and the 30 s timer is the only other exit. When the user then enables Bluetooth, nothing restarts the scan — the UI must re-trigger `startDeviceDiscovery`. Verify the scanning screen wires `onTransportStateChange` → re-scan; if not, users on the scan screen who toggle BT sit on an empty list.

---

### SCALABILITY & MAINTENANCE

---

#### M‑1 (Medium) — Metro deep-path pins will break silently on package upgrades

**Where:** `metro.config.js:80–86` (`LEDGER_DMK_ESM_PACKAGES` → hardcoded `lib/esm/index.js`), `:96–105` (importer path fragments).

**What happens:** All five paths exist today (verified). But the pins bypass the packages' `exports` maps; a future minor release that reorganizes `lib/` produces a Metro resolution error only at bundle time — or worse, silently resolves the CJS build again and reintroduces the non-deterministic `reflect-metadata` "property is not configurable" crash the shim exists to prevent. `@ledgerhq/signer-utils` is also only a _transitive_ dependency: a hoisting change could relocate it under a nested `node_modules`, which `path.resolve(__dirname, 'node_modules', …)` won't find.

**Suggested change:** Add a trivial Jest test asserting `fs.existsSync` for each pinned path (and that `require.resolve('@ledgerhq/signer-utils/package.json')` resolves to the top level), so `yarn.lock` bumps fail loudly in CI instead of at runtime. Consider anchoring with `path.dirname(require.resolve(`${pkg}/package.json`))` instead of the raw `node_modules` join.

---

#### M‑2 (Low) — `reset()` and `resetFlowState()` are duplicate methods

**Where:** `LedgerBluetoothDMKAdapter.ts:429–453` — identical bodies (`#flowComplete = false`); the docstrings acknowledge the equivalence. The interface (`types.ts`) requires both for legacy reasons. Post-migration, collapse to one on the `HardwareWalletAdapter` interface; until then, have one call the other so they can't drift.

---

#### M‑3 (Low) — Logging bypasses `DevLogger` convention

**Where:** `LedgerBluetoothDMKAdapter.ts:43–51` — raw `console.log` wrapper relying on babel `transform-remove-console`, while every sibling file (`Ledger.ts`, hooks) uses `DevLogger`. Works (the babel plugin removes the whole call, arguments included), but it forks the logging story and drops `DevLogger`'s gating. Suggest switching to `DevLogger.log` for consistency, or documenting why the adapter deliberately avoids it.

---

#### M‑5 (Low, second pass) — Dead code shipped with the branch

**Where:**

- `app/hooks/useEventCallback.ts` (+ `useEventCallback.test.ts`, 89 lines total) — **no production consumer**; `useAdapterLifecycle` ended up using manual ref-mirroring instead. Delete or adopt (adopting it would actually simplify the five hand-rolled `xRef.current = x` pairs in `useAdapterLifecycle.ts:66–80`).
- `app/selectors/featureFlagController/ledgerDmk/index.ts` (`selectLedgerDmkEnabled`) — **never imported** (only mentioned in a comment in `dmk.ts:18`). Worse, it's a _third_ implementation of flag resolution that silently diverges from `isDmkEnabled`: the selector ignores `LEDGER_FORCE_DMK`, so a force-enabled dev build would report `false` through the selector while both real call sites report `true`.

**Suggested change:** Either wire `useAdapterLifecycle` to `selectLedgerDmkEnabled` (implemented as `flags => isDmkEnabled(flags)` so there's exactly one resolution function) or delete the selector. Delete `useEventCallback` or adopt it. Both fold naturally into the R‑1 flag-latch work.

---

#### M‑4 (Low) — Bridge type contracts are duck-typed casts

**Where:** `Ledger.ts:35–56` (`LedgerBridgeConnection`, `LedgerDmkBridgeConnection`) + `as unknown as` casts at `:131, :162, :245, :268, :280`.

**What happens:** Necessary while both bridges coexist, but the casts are what allowed the R‑1 silent no-op. Once R‑1's runtime guard is in, consider exporting the real bridge types from `@metamask/eth-ledger-bridge-keyring` (they exist in the package's `.d.ts`) instead of local structural interfaces, so upstream API changes surface as compile errors here. Add a `TODO(remove-with-dmk-flag)` marker consistent with the ones in `keyrings.ts`.

---

## 3. Skill-compliance scorecard

| Skill gate (ledger-dmk-implementation)   | Status | Notes                                                                                                                     |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Step 1 — SDK init, singleton             | ⚠️     | Two DMK instances + legacy BLE stack (R‑3)                                                                                |
| Step 2 — Discovery & connect             | ⚠️     | Works; scan never stops (R‑2); refresher implicit (P‑2)                                                                   |
| Step 3 — Device state check before ops   | ❌     | Locked/Busy not pre-checked; coarse `{connected}` only (C‑4)                                                              |
| Step 4 — App management                  | ⚠️     | Manual `OpenAppCommand` + signer auto-open both exist; 10 s HITL timeout (R‑5); locked/not-installed swallowed (R‑4, C‑3) |
| Step 5 — Operation observable handling   | ⚠️     | Completed/Error only; intermediates dropped (G‑1); no cancel/timeout (R‑6)                                                |
| Session teardown rules                   | ✅     | Session reused across ops; hard teardown only on switch/destroy                                                           |
| Error classification (rejection ≠ error) | ⚠️     | Main path correct via translator; raw-DMK path gaps (C‑2, C‑3)                                                            |
| Derivation-path rules                    | ✅     | Constants only; `m/` stripped before DMK                                                                                  |
| No stub in production                    | ✅     |                                                                                                                           |
| Clear Signing / originToken              | ⚠️     | Not threaded (G‑2)                                                                                                        |

## 4. Suggested sequencing

1. **Before wider flag rollout (correctness/reliability blockers):** R‑1 (flag latch + loud mismatch guard), R‑2 (`stopDiscovering`), C‑1 (fast-path fallback), R‑4 + C‑3 (locked / not-installed classification), R‑7 (legacy disconnect regression), C‑7 (`resolveOrCreateAdapter` destroy).
2. **Before GA:** R‑5 (HITL timeout), R‑9 (connect/backgroundReconnect serialization), C‑2 incl. `0x6f00` addendum (rejection classification), R‑8 (teardown keyring creation), G‑1 (Web3ChecksOptIn QA), G‑3 (tests), C‑5, C‑6, C‑8, M‑5 (dead code / single flag resolver).
3. **Upstream asks to file now (longest lead time):** bridge pass-throughs or DMK injection (R‑3), intermediate-state surface (G‑1), cancel/timeout on device actions (R‑6), `originToken` option (G‑2), richer session state (C‑4), `translateDmkError` `_tag`-aware fallback (C‑2 addendum).

## 5. Implementation status

The in-repo findings have been implemented on this branch (2026-07-11/12, uncommitted working tree). Every fix carries an inline comment explaining the why at the change site; the code for each change is reproduced in §5.1 below.

| Finding                                | Status      | Where                                                                                                                                                                                                                                    |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R‑1 flag latch + loud guard            | ✅ Fixed    | `dmk.ts` (`setDmkEnabled`/`getDmkEnabled`), `initialization.ts`, `useAdapterLifecycle.ts`, guard in `Ledger.ts` `connectLedgerDmkHardware`                                                                                               |
| R‑2 scan never stops                   | ✅ Fixed    | `#stopDmkScan()` (`dmk.stopDiscovering()`) in `stopDeviceDiscovery` + background-reconnect scan                                                                                                                                          |
| R‑4 locked/not-installed swallowed     | ✅ Fixed    | `#handleWrongApp` rethrows via `#isDeviceLocked`/`#isAppNotInstalled`                                                                                                                                                                    |
| R‑5 app-open timeout                   | ✅ Fixed    | `LEDGER_OPEN_APP_TIMEOUT_MS = 30000`                                                                                                                                                                                                     |
| R‑7 legacy disconnect regression       | ✅ Fixed    | Optional `releaseAfterOperation()` on the adapter interface; legacy Ledger + QR implement it; provider calls it; DMK omits it                                                                                                            |
| R‑8 teardown creates keyring           | ✅ Fixed    | `disconnectLedgerDmkSession` no-ops when no Ledger keyring exists                                                                                                                                                                        |
| R‑9 backgroundReconnect race           | ✅ Fixed    | Strategy 1 delegates to `connect()` (shares `#connectInFlight`); `connect()` no longer rethrows a prior attempt's failure                                                                                                                |
| C‑1 fast-path hard failure             | ✅ Fixed    | Fast paths use `tryEnsureReady` and fall through to the guided blocking flow on not-ready                                                                                                                                                |
| C‑2 rejection classification           | ✅ Fixed    | `RefusedByUserDAError` mapping + `errorCode ?? originalError.errorCode` status fallback in `parseDMKErrorByTag`                                                                                                                          |
| C‑3 `0x6807` unmapped                  | ✅ Fixed    | `MOBILE_LEDGER_STATUS_CODE_OVERRIDES` in `parser.ts` → `DeviceMissingCapability`                                                                                                                                                         |
| C‑4 misleading verify method           | ✅ Renamed  | `#emitEthereumAppOpened` (real pre-flight lock check still needs the upstream bridge change)                                                                                                                                             |
| C‑5 Android version parsing            | ✅ Fixed    | `Platform.Version >= 31`; `openSettings()` only on `BLOCKED`                                                                                                                                                                             |
| C‑6 `resetDmk` leak                    | ✅ Fixed    | Closes the DMK before nulling                                                                                                                                                                                                            |
| C‑7 `resolveOrCreateAdapter` leak      | ✅ Fixed    | `destroy()` instead of `disconnect()`                                                                                                                                                                                                    |
| C‑8 dual connect contract              | ✅ Fixed    | No-cached-device branch now throws                                                                                                                                                                                                       |
| M‑1 metro pin guard                    | ✅ Added    | `app/core/Ledger/dmkMetroEsmPaths.test.ts` (parses the list out of metro.config.js)                                                                                                                                                      |
| M‑2 duplicate reset methods            | ✅ Fixed    | `reset()` delegates to `resetFlowState()`                                                                                                                                                                                                |
| M‑5 dead code                          | ⚠️ Partial  | `useEventCallback` tests' type errors fixed; the unused hook + unused `selectLedgerDmkEnabled` left in place pending an adopt-or-delete decision (wiring the selector into `dmk.ts` would drag native BLE imports into its module graph) |
| R‑3, R‑6, G‑1, G‑2, C‑4 (bridge state) | ⛔ Upstream | Require changes in `@metamask/eth-ledger-bridge-keyring` / partner enrollment — file upstream issues                                                                                                                                     |

Additionally, seven test failures and 29 tsc errors that pre-existed on the branch (verified by stash-and-rerun against the unmodified tree) were repaired: outdated `createAdapter` arity expectations, adapter mocks missing the interface's new required members (`deviceId`, `onTransportStateChange`, `destroy`), the `useHwSwapLifecycle` → `useHardwareWalletSubmit` required-prop mismatch, and `useEventCallback.test.ts` generic annotations. A follow-up lint pass re-added `@ledgerhq/hw-app-eth` to `package.json` (the legacy adapter still imports it directly for its unlock check — the branch had removed the dependency and was surviving on hoisting of the keyring's transitive copy) and cleared the branch-owned warnings (`no-void`, `no-shadow`, deprecated `MutableRefObject`). Post-fix: **0 eslint errors across the entire branch diff, 0 tsc errors repo-wide, and 64 suites / 1,347 tests pass** across `app/core/HardwareWallet`, `app/core/Ledger`, `app/core/Engine/wallet-init`, and the HW swaps components.

### 5.1 The changes, with code

Each entry: what changed, why, and the code as it now stands in the working tree.

#### R‑1 — Flag latch + loud mismatch guard

**Why:** the keyring's Ledger bridge is chosen once at engine init, but the adapter re-evaluated the flag from live Redux state on every adapter creation. Two divergence vectors existed (mid-session remote-flag refetch; `selectRemoteFeatureFlags` returning `{}` when basic functionality is off while the init-time read is ungated). A mismatch silently breaks all Ledger operations in both directions.

`app/core/Ledger/dmk.ts` — the latch:

```ts
const state: {
  dmk: DeviceManagementKit | null;
  /** DMK flag value resolved once at engine init (see `setDmkEnabled`). */
  dmkEnabled: boolean | null;
} = { dmk: null, dmkEnabled: null };

/**
 * Latch the resolved DMK flag at engine init. [...] Latching the init-time
 * value makes the adapter choice atomically consistent with the keyring
 * choice; a flag change takes effect on the next app launch for BOTH sides.
 */
export const setDmkEnabled = (enabled: boolean): void => {
  state.dmkEnabled = enabled;
};

/** The DMK flag as the keyring saw it at engine init. */
export const getDmkEnabled = (
  fallbackFlags?: Record<string, unknown> | null,
): boolean => state.dmkEnabled ?? isDmkEnabled(fallbackFlags);
```

`app/core/Engine/wallet-init/initialization.ts` — set the latch where the bridge is chosen:

```ts
const useDmk = isDmkEnabled({
  ...(remoteFeatureFlagState?.remoteFeatureFlags ?? {}),
  ...(remoteFeatureFlagState?.localOverrides ?? {}),
});
// Latch the resolved value for the whole app session. The adapter factory
// reads this latch (getDmkEnabled) instead of live Redux flags, so the
// adapter choice can never diverge from the keyring-bridge choice made below.
setDmkEnabled(useDmk);
```

`app/core/HardwareWallet/hooks/useAdapterLifecycle.ts` — both adapter-creation sites now call `getDmkEnabled(dmkFlagsRef.current)` instead of `isDmkEnabled(...)` (live flags remain only as a defensive fallback for the latch-never-set case).

`app/core/Ledger/Ledger.ts` (`connectLedgerDmkHardware`) — a mismatch now fails loudly instead of optional-chaining into a no-op:

```ts
const ledgerBridge = keyring.bridge as unknown as LedgerBridgeConnection;
// Fail loudly on a feature-flag mismatch instead of optional-chaining: [...]
if (typeof ledgerBridge.updateSessionId !== 'function') {
  throw new Error(
    'Ledger DMK adapter is paired with a non-DMK keyring bridge — ledgerDmk feature-flag mismatch between engine init and adapter creation',
  );
}
await ledgerBridge.updateSessionId(sessionId);
```

#### R‑2 — Stop the native BLE scan

**Why:** verified in `RNBleTransport`: unsubscribing `listenToAvailableDevices` does **not** stop the native scan — only `transport.stopDiscovering()` or a `connect()` on the _same_ transport does, and our connects go through the bridge's separate DMK instance. Without this, the scan (with `allowDuplicates` + a 1 s interval) ran for the rest of the app session: battery drain, degraded GATT/APDU throughput, and Android scan throttling.

`app/core/HardwareWallet/adapters/LedgerBluetoothDMKAdapter.ts`:

```ts
stopDeviceDiscovery(): void {
  log('[LedgerDMK] stopDeviceDiscovery called');
  if (this.#scanSubscription) {
    this.#scanSubscription.unsubscribe();
    this.#scanSubscription = null;
    // Unsubscribing alone does NOT stop the native BLE scan: [...]
    this.#stopDmkScan();
  }
  if (this.#scanTimeoutId) {
    clearTimeout(this.#scanTimeoutId);
    this.#scanTimeoutId = null;
  }
}

/** Stop the discovery DMK instance's native BLE scan. Fire-and-forget. */
#stopDmkScan(): void {
  try {
    getDmk()
      .stopDiscovering()
      .catch((error: unknown) => {
        log('[LedgerDMK] stopDiscovering failed:', error);
      });
  } catch (error) {
    log('[LedgerDMK] stopDiscovering threw synchronously:', error);
  }
}
```

The background-reconnect scan calls `this.#stopDmkScan()` on every exit path as well (same rationale, right after its discovery promise settles).

#### R‑9 — Serialize `backgroundReconnect` with `connect()`

**Why:** strategy 1 called `connectLedgerDmkDevice()` directly, bypassing the `#connectInFlight` latch — a concurrent UI-triggered `connect()` could interleave a second `bridge.connect()`, leaving `#sessionId` pointing at the session the middleware just disconnected. Delegating to `connect()` shares the latch and reuses the destroy-guard/retry/monitoring/event logic the inline version duplicated (~40 lines deleted).

```ts
// Strategy 1: Direct connect using cached device info (no scan).
// Delegates to this.connect() rather than calling connectLedgerDmkDevice
// directly: connect() owns the #connectInFlight latch, so a concurrent
// UI-triggered connect() cannot interleave a second bridge.connect() [...]
if (
  this.#lastConnectedDevice &&
  this.#lastConnectedDevice.id === targetDeviceId
) {
  try {
    // Seed the discovery cache so connect() finds the device without a
    // scan — device IDs are stateless for the BLE transport.
    this.#discoveredDevices.set(targetDeviceId, this.#lastConnectedDevice);
    await this.connect(targetDeviceId);
    if (this.isConnected() && this.#deviceId === targetDeviceId) {
      return true;
    }
  } catch (error) {
    log(
      '[LedgerDMK] backgroundReconnect - direct connect failed, falling back to scan:',
      error,
    );
  }
  if (this.#isDestroyed) return false;
}
```

`connect()`'s in-flight await was also hardened so it no longer rethrows a _previous_ caller's failure:

```ts
if (this.#connectInFlight) {
  // Wait for the in-flight attempt but don't rethrow its failure as ours:
  // that attempt's initiator already received (and handled) the error.
  await this.#connectInFlight.catch(() => undefined);
  ...
}
```

#### R‑4 + C‑3 — Locked / app-not-installed no longer swallowed

**Why:** a locked device typically still reports `BOLOS` to the app check, so the lock is only discovered when `OpenAppCommand` fails with `0x5515`. The old catch swallowed that, telling the user to "open the Ethereum app" when the fix is entering their PIN. Same for `0x6807` (app not installed) — looping on "open the app" can never succeed; the user must install it via Ledger Live.

`LedgerBluetoothDMKAdapter.ts` (`#handleWrongApp`, open-app catch — the close-app catch mirrors the lock check):

```ts
} catch (openError) {
  // A locked device typically still reports "BOLOS" to the app check, so the
  // lock is only discovered HERE, when the open command fails with 0x5515.
  // Rethrow so #doEnsureDeviceReady's catch classifies it and emits
  // DeviceEvent.DeviceLocked. Same for 0x6807 (app not installed).
  if (this.#isDeviceLocked(openError) || this.#isAppNotInstalled(openError)) {
    throw openError;
  }
  // Everything else (transient BLE drops during the app switch, etc.) keeps
  // the old swallow-and-return-false behavior: the AppNotOpen event already
  // emitted drives the retry UI.
  log('[LedgerDMK] Failed to send open app command:', openError);
  await this.#closeSession('handleWrongApp-error');
}
```

New helper covering both error shapes (keyring-translated `TransportStatusError.statusCode` and raw DMK `errorCode`, incl. the `originalError` nesting of `UnknownDeviceExchangeError`):

```ts
#isAppNotInstalled(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false;
  const err = error as {
    statusCode?: number;
    errorCode?: string;
    originalError?: { errorCode?: string };
  };
  if (err.statusCode === APP_NOT_INSTALLED_STATUS_CODE) return true;
  const code = err.errorCode ?? err.originalError?.errorCode;
  return (
    typeof code === 'string' &&
    parseInt(code, 16) === APP_NOT_INSTALLED_STATUS_CODE
  );
}
```

And the parser side (C‑3), `app/core/HardwareWallet/errors/parser.ts` — `0x6807` is absent from hw-wallet-sdk's `LEDGER_ERROR_MAPPINGS`, so it's mapped locally until it can be added upstream:

```ts
const MOBILE_LEDGER_STATUS_CODE_OVERRIDES: Record<string, ErrorCode> = {
  '0x6807': ErrorCode.DeviceMissingCapability,
};
// checked in parseLedgerStatusCode before the SDK mapping lookup
```

#### R‑5 — 30 s app-open timeout

**Why:** opening an app requires a physical confirmation on the device; the skill's default for that HITL step is 30 s. The blanket 10 s APDU timeout regularly expired while the user was still reading the on-device prompt.

```ts
const LEDGER_OPERATION_TIMEOUT_MS = 10000;
// Opening an app requires the user to physically confirm on the device.
// Per Ledger's DMK guidance the app-open user-confirmation timeout defaults
// to 30s — the 10s LEDGER_OPERATION_TIMEOUT_MS is for pure APDU round-trips.
const LEDGER_OPEN_APP_TIMEOUT_MS = 30000;
```

`openEthereumAppOnLedger()` is now wrapped with `LEDGER_OPEN_APP_TIMEOUT_MS`; `closeRunningAppOnLedger()` (no user interaction) keeps 10 s.

#### R‑7 — Per-adapter post-signing release

**Why:** the branch removed the provider's blanket `disconnect()` after signing so the DMK session could stay alive — but that call also served the legacy Ledger adapter (cached BLE transports must be released) and QR, and it runs for 100 % of users while the flag is off. The behavior is now an adapter concern.

`app/core/HardwareWallet/types.ts`:

```ts
/**
 * Optional hook invoked when a signing/confirmation flow ends
 * (`hideAwaitingConfirmation`). Adapters whose transports must be released
 * after each operation implement this [...]. Adapters that reuse their
 * session across operations — the DMK adapter, whose session is a transport
 * connection, not an authorization — omit it.
 */
releaseAfterOperation?(): void;
```

`LedgerBluetoothAdapter` and `QRWalletAdapter` implement it as `this.disconnect().catch(() => undefined)`; the DMK adapter deliberately does not implement it. `HardwareWalletProvider.tsx`:

```ts
const hideAwaitingConfirmation = useCallback(() => {
  awaitingConfirmationRejectRef.current = null;
  // Adapter-specific post-operation release. [...]
  refs.adapterRef.current?.releaseAfterOperation?.();
  updateConnectionState({ status: ConnectionStatus.Disconnected });
}, [refs, updateConnectionState]);
```

#### R‑8 — Teardown can no longer create a keyring

**Why:** `withLedgerKeyring` _creates_ the Ledger keyring when missing, and `disconnectLedgerDmkSession` runs on teardown paths — including provider unmount right after "forget device". Without the guard, forgetting a Ledger silently re-persisted an empty Ledger keyring into the vault.

`app/core/Ledger/Ledger.ts`:

```ts
export const disconnectLedgerDmkSession = async (): Promise<void> => {
  const hasLedgerKeyring = Engine.context.KeyringController.state.keyrings.some(
    (keyring) => keyring.type === LegacyLedgerKeyring.type,
  );
  if (!hasLedgerKeyring) {
    DevLogger.log(
      '[Ledger] disconnectLedgerDmkSession - no Ledger keyring, nothing to disconnect',
    );
    return;
  }
  const bridge = await getLedgerDmkBridge();
  await bridge.destroy();
};
```

#### C‑1 — Fast paths fall through to the guided flow

**Why:** the two new fast paths in `ensureDeviceReady` treated "device not ready" (wrong app / dashboard) as terminal — `handleError(new Error('Device not ready'))` parsed to a generic red "Something went wrong", and swap/bridge submits dispatched `TransactionFailed`. The main path instead shows "open the Ethereum app" and waits via the blocking promise. The fast paths now resolve only on ready and otherwise fall through to that guided flow.

`app/core/HardwareWallet/hooks/useDeviceConnectionFlow.ts` (already-connected fast path; the background-reconnect path mirrors it):

```ts
// Fast paths below resolve immediately ONLY when the device reports ready.
// A not-ready result (wrong app open, dashboard) must NOT be treated as a
// terminal error: the adapter has already emitted the guiding event
// (AppNotOpen / DeviceLocked), and the main flow's blocking promise lets the
// user fix the device and continue [...]
if (
  targetDeviceId &&
  adapter.isConnected?.() &&
  adapter.deviceId === targetDeviceId
) {
  try {
    refs.abortControllerRef.current = new AbortController();
    const isReady = await tryEnsureReady(adapter, targetDeviceId);
    if (isReady) {
      return true;
    }
    // fall through to guided flow
  } catch (error) {
    // fall through to full flow
  } finally {
    refs.abortControllerRef.current = null;
  }
}
```

The now-redundant `ensureDeviceReadyOrError` helper was removed.

#### C‑2 — DMK rejection classification

**Why:** command-layer rejections carry `errorCode 6985/5501` and route correctly through the keyring's translator, but the device-action-layer tag `RefusedByUserDAError` has no `errorCode` — a deliberate on-device "reject" press parsed as a red unknown error. And per the DMK guidance, `UnknownDeviceExchangeError` buries its status word in `originalError.errorCode`.

`app/core/HardwareWallet/errors/mappings.ts`:

```ts
// DMK device-action-layer rejection. Unlike command-layer rejections (which
// carry errorCode 6985/5501 [...]), this tag has no errorCode — without a
// mapping, a deliberate on-device "reject" press surfaced as a red unknown
// error instead of a neutral cancellation.
RefusedByUserDAError: ErrorCode.UserRejected,
```

`parser.ts` (`parseDMKErrorByTag`) — unrecognized tags now fall back to the APDU status word, checking both locations:

```ts
// Unrecognized tag → fall back to the APDU status word. DMK carries it as a
// 4-hex-digit `errorCode` string, and UnknownDeviceExchangeError buries it
// one level down in `originalError.errorCode` [...]
const rawErrorCode = /* errorObj.errorCode ?? errorObj.originalError?.errorCode */;
if (rawErrorCode && /^[0-9a-fA-F]{4}$/u.test(rawErrorCode)) {
  return parseLedgerStatusCode(parseInt(rawErrorCode, 16), walletType, ...);
}
```

#### C‑4 / C‑5 / C‑6 / C‑7 / C‑8 / M‑2 — smaller fixes

- **C‑4:** `#verifyEthereumAppUnlocked` → `#emitEthereumAppOpened`. The method performed no verification (the bridge's session state has no LOCKED granularity); the rename stops the code claiming a check it doesn't do, and the docstring marks where a real Step‑3 pre-flight belongs once the bridge exposes `deviceStatus`.
- **C‑5:** `ensurePermissions` now branches on `Number(Platform.Version) >= 31` (numeric API level — the old `Number(getSystemVersion()) || 0` fell to `0` on non-numeric release strings, routing Android 12+ devices to the useless `ACCESS_FINE_LOCATION` branch). `Linking.openSettings()` fires only on `RESULTS.BLOCKED` — a plain `DENIED` is re-requestable.

  ```ts
  const apiLevel = Number(Platform.Version) || 0;
  if (apiLevel >= 31) {
    const result = await requestMultiple([BLUETOOTH_CONNECT, BLUETOOTH_SCAN]);
    ...
    if (!allGranted) {
      const anyBlocked = /* either result === RESULTS.BLOCKED */;
      if (anyBlocked) await Linking.openSettings();
      return false;
    }
  }
  ```

- **C‑6:** `resetDmk()` calls `state.dmk?.close()` before nulling — DMK owns a native `BleManager`; nulling without close leaked that stack and the next `getDmk()` ran a second live BLE manager alongside the orphan.
- **C‑7:** `resolveOrCreateAdapter` uses `existing?.destroy()` instead of `disconnect()` — only `destroy()` stops the replaced adapter's own BLE-state monitoring; the old code leaked one live BLE listener per wallet-type swap.
- **C‑8:** `#doConnect`'s no-cached-device branch now **throws** after emitting `ConnectionFailed`, so `connect()` has one contract: resolves ⇒ a session exists. Previously it resolved successfully, and callers proceeded to readiness checks against a non-existent session.
- **M‑2:** `reset()` delegates to `resetFlowState()` so the two interface-mandated (and intentionally identical) methods can never drift.

#### M‑1 — CI guard for the metro ESM pins

**Why:** `metro.config.js` bypasses the DMK packages' `exports` maps with hardcoded `lib/esm/index.js` paths. A package upgrade that reorganizes `lib/` would fail only at bundle time — or silently resolve the CJS build again and reintroduce the `reflect-metadata` "property is not configurable" crash the shim prevents.

New `app/core/Ledger/dmkMetroEsmPaths.test.ts` parses `LEDGER_DMK_ESM_PACKAGES` out of `metro.config.js` itself (so the two can't drift) and asserts each pinned `lib/esm/index.js` exists, plus the `reflect-metadata` shim and its require target.

#### Dependency fix — `@ledgerhq/hw-app-eth` restored

**Why:** the branch removed it from `package.json`, but the legacy `LedgerBluetoothAdapter` (shipped to all users while the flag is off) still imports it directly (`new Eth(transport).getAddress(...)` in its unlock check) and was surviving only on hoisting of `@metamask/eth-ledger-bridge-keyring`'s transitive copy — also an `import-x/no-extraneous-dependencies` lint error. Re-added `"@ledgerhq/hw-app-eth": "^6.42.0"` (resolves to the already-installed 6.42.2, so no tree change). Remove it again when the legacy adapter is deleted post-migration.

## 6. Second-pass verification log

A second review pass was run using the locally installed skills (byte-identical to the GitHub copies used in the first pass — verified with `diff -r`). New findings from that pass: **R‑9, C‑7, C‑8, M‑5, and the C‑2 `0x6f00` addendum.** Claims from the first pass that were re-verified against installed package sources rather than assumed:

| Claim                                                                               | Result                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locked device (`0x5515`) detection despite `#isDeviceLocked` only checking `0x6b0c` | ✅ Works — `new TransportStatusError(0x5515)` self-upgrades to `LockedDeviceError` (name mapped in `ERROR_NAME_MAPPINGS`; message contains "Locked device" for the adapter's fallback). No change needed to R‑4/C‑4 conclusions, which concern the _swallowing_, not the classification. |
| `0x6807` (app not installed) unclassifiable                                         | ✅ Confirmed — message is `"UNKNOWN_ERROR (0x6807)"`, no name/status mapping → `ErrorCode.Unknown` (C‑3 stands).                                                                                                                                                                         |
| Rejection path `errorCode "6985"` → `UserRejected`                                  | ✅ Confirmed end-to-end (`LEDGER_ERROR_MAPPINGS['0x6985'] → 2000 = UserRejected`); the gap is confined to no-errorCode DA errors (C‑2 addendum).                                                                                                                                         |
| Duplicate rxjs breaking DMK observable interop                                      | ❌ Not an issue — all DMK-family packages resolve the single `rxjs@7.8.2`; the lone `rxjs@6.6.7` comes from the pre-existing `@keystonehq/sdk` (QR path).                                                                                                                                |
| Metro ESM pin targets exist                                                         | ✅ All five `lib/esm/index.js` paths present at current versions (M‑1's CI-guard suggestion stands for future upgrades).                                                                                                                                                                 |
| `FeatureFlagNames.ledgerDmk`, `DISCONNECT_ERROR_NAMES` referenced by new code       | ✅ Both exist.                                                                                                                                                                                                                                                                           |
| Adapter test scope                                                                  | ✅ Confirmed by full read: `walletType` + five `#isDeviceLocked` cases only (G‑3 unchanged).                                                                                                                                                                                             |

## 7. References

- Skills: [ledger-dmk-implementation/SKILL.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/SKILL.md) · [dmk-code-patterns.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-code-patterns.md) · [dmk-sdk-reference.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-sdk-reference.md) · [dmk-platform-patterns.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/ledger-dmk-implementation/dmk-platform-patterns.md) · [dmk-business-logic/SKILL.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/dmk-business-logic/SKILL.md) · [dmk-intent-vocabulary/SKILL.md](https://github.com/LedgerHQ/agent-skills/blob/main/skills/dmk/dmk-intent-vocabulary/SKILL.md)
- DMK SDK: [LedgerHQ/device-sdk-ts](https://github.com/LedgerHQ/device-sdk-ts) · [Clear Signing for wallets](https://developers.ledger.com/docs/clear-signing/for-wallets)
- Verified package sources: `@ledgerhq/device-transport-kit-react-native-ble` `RNBleTransport.js` / `RNBleTransportFactory.js`; `@metamask/eth-ledger-bridge-keyring` `dmk/ledger-dmk-bridge.mjs`, `dmk/ledger-dmk-transport-middleware.mjs`, `dmk/dmk-error-translator.mjs`; `@ledgerhq/device-signer-kit-ethereum` `SignTransactionDeviceAction.js`; `@metamask/hw-wallet-sdk` `hardware-error-mappings.mjs`.
