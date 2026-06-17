# QR Sync Implementation Plan

This document captures the long-term implementation plan for QR sync on
mobile. It is intended to be updated as the work progresses and used as the
reference point between phases.

## Goals

- Support QR sync both before and after onboarding is complete.
- Reuse the existing MWP transport, session, and crypto building blocks where
  they fit naturally.
- Keep QR sync isolated from `SDKConnectV2`'s persistent dapp-connection
  lifecycle.
- Expose UI-relevant service events such as `otp-display-grant`,
  `sync-ready`, and `sync-error`.
- Avoid routing QR sync through the provider RPC bridge unless future product
  requirements make that clearly beneficial.

## Architecture Summary

- Create a dedicated `app/core/QrSync/` module.
- Make `QrSyncController extends BaseController` the primary feature
  abstraction.
- Store only sanitized, serializable, UI-safe state in the controller.
- Keep runtime-only objects as private controller fields:
  - `QrSyncSession`
  - in-flight promises
  - timers
  - secret-bearing normalized import plans
- Reuse:
  - `WebSocketTransport`
  - `SessionStore`
  - `WalletClient`
  - `KeyManager`
- Do not reuse:
  - `ConnectionRegistry`
  - `RPCBridgeAdapter`
  - `BackgroundBridge`
- Use controller state as the durable UI source of truth.
- Use messenger/controller events for controller coordination and targeted UI
  bridges where necessary.

## Phase 0: Contract Alignment

### Step 0.1: Freeze the peer payload contract

- Confirm `QrSyncActionTypes` and message versioning with extension.
- Confirm whether `value` is plaintext after decryption or another encoded
  representation.
- Confirm whether `hiddenIndexes` is the final wire key.

### Step 0.2: Freeze mobile import semantics

- Before onboarding:
  - require a primary mnemonic
  - allow additional mnemonics and private keys
- After onboarding:
  - treat imports as additive
  - reject unsupported primary semantics unless explicitly defined

### Step 0.3: Freeze terminal behavior

- `sync-completed` cleans up the logical QR sync session
- `sync-error`/cancel cleans up the logical QR sync session
- shared WebSocket teardown is not required

## Phase 1: Type Layer

### Step 1.1: Establish wire types

- `QrSyncMessage`
- `QrSyncData`
- `QrSyncDataEntry`
- `QrSyncError`
- `QrSyncOffer`

### Step 1.2: Establish mobile-local state types

- `QrSyncPhase`
- `QrSyncConnectionStatus`
- `QrSyncState`

### Step 1.3: Establish service event types

- `phase-changed`
- `connection-status-changed`
- `otp-display-grant`
- `sync-ready`
- `sync-completed`
- `sync-error`

### Step 1.4: Keep wire messages separate from service events

- peer messages model encrypted protocol payloads
- service events model mobile-side controller state transitions

## Phase 2: Validation and Normalization

### Step 2.1: Add payload validation

- validate message version
- validate message shape
- validate deadline
- validate supported data types

### Step 2.2: Add semantic validation

- only mnemonic entries may be primary
- `hiddenIndexes` only valid for mnemonic entries
- reject empty import payloads
- reject expired sessions/payloads

### Step 2.3: Add normalization

- convert wire payloads into mobile import-ready structures
- derive a sanitized `QrSyncOffer` for UI review surfaces

## Phase 3: Controller Foundation

### Step 3.1: Add `QrSyncController`

- define controller name, state, and metadata
- keep state serializable and secret-free
- add typed controller messenger
- establish the controller's public methods

### Step 3.2: Add controller init + messenger wiring

- create controller init file
- create messenger types/config
- define allowed actions/events needed by QR sync
- keep capabilities narrow and explicit

### Step 3.3: Define controller/runtime boundaries

- `QrSyncController` owns feature state and orchestration
- `QrSyncSession` is a private runtime helper
- normalized secret-bearing import plans stay outside controller state

## Phase 4: Session Helper

### Step 4.1: Add `QrSyncSession`

- create transport
- create session store
- create wallet client
- connect, resume, disconnect

### Step 4.2: Wire wallet-client events

- `display_otp`
- `connected`
- `disconnected`
- `message`
- `error`

### Step 4.3: Keep QR sync transport concerns isolated

- no provider bridge
- no dapp permission routing
- no SDK connection list integration

## Phase 5: Host App Bridge

### Step 5.1: Define a QR sync host adapter

- show/hide OTP UI
- show review/import state
- surface errors
- request password or confirmation when needed

### Step 5.2: Decide UI bridging responsibilities

- transient UX may respond to targeted controller/UI bridge events
- durable UI state should come from controller-backed state

## Phase 6: Import Orchestration

### Step 6.1: Add `QrSyncImportService`

- determine whether onboarding is complete
- route to pre-onboarding or post-onboarding import flow
- orchestrate existing authentication/keyring primitives through the
  controller's allowed dependencies

### Step 6.2: Reuse existing import primitives

- restore vault from mnemonic
- import mnemonic into existing wallet
- import private key into existing wallet
- apply account naming where supported

### Step 6.3: Avoid secret leakage into UI state

- secrets stay in service scope
- UI receives sanitized review data only

## Phase 7: Registry and Entry Flow

### Step 7.1: Add `QrSyncRegistry`

- dedupe repeated launches
- own active QR sync sessions
- cleanup on terminal states

### Step 7.2: Integrate with QR/deeplink entrypoints

- add QR sync request parsing
- dispatch into `QrSyncRegistry`
- keep separate from standard SDK connect entry flow

## Phase 8: Metadata Handling

### Step 8.1: Account naming

- support deterministic private-key account naming first
- defer mnemonic-derived naming until product semantics are explicit

### Step 8.2: Hidden indexes

- validate and carry through the import plan
- apply only once downstream wallet/account visibility semantics are finalized

## Phase 9: Hardening

### Step 9.1: Failure handling

- define retryability
- define partial-failure behavior
- improve telemetry and logging

### Step 9.2: Tests

- type/validation tests
- controller tests
- session lifecycle tests
- import orchestration tests
- before/after onboarding integration coverage

## Current Status

- Phase 0 reviewed
- Phase 1 completed with:
  - wire message types
  - mobile-local state types
  - service event types
  - explicit separation between wire messages and service events
- Phase 2 has been started with:
  - initial payload validation
  - initial semantic validation
  - initial normalization into review/import-ready structures
- Phase 3 has been started with:
  - a `QrSyncController` scaffold
  - controller state metadata
  - a QR sync controller messenger type/factory
  - a QR sync controller init function scaffold
  - a controller entrypoint for scanned QR payloads
  - routing of incoming session messages into controller-consumable events
- A QR sync connection-request parser/validator now exists for the mobile scan
  entry flow.
- A session helper exists and is now positioned as a private runtime helper to
  be owned by `QrSyncController`.
- Secret-bearing normalized import plans are now stored privately on the
  controller while only sanitized review state is exposed to UI.
- No controller registration or import orchestration implementation has been
  added yet

## Resume Checkpoint

### Architecture decisions already made

- `QrSyncController extends BaseController` is the primary QR sync feature
  abstraction.
- `QrSyncSession` is a private runtime helper owned by the controller.
- Controller state must remain serializable and UI-safe.
- Secret-bearing normalized import plans must stay out of controller state.
- The mobile entrypoint is QR scan -> controller -> wallet-side MWP session.
- `sync-ready` is normalized into:
  - a private `QrSyncImportPlan`
  - a public sanitized `QrSyncImportReview`

### What is already implemented

- Types and constants for:
  - wire messages
  - controller state
  - service events
  - import plan / import review
- Validation and normalization for incoming `sync-ready` payloads.
- QR scan payload parsing and `SessionRequest` validation.
- `QrSyncController.handleScannedQrPayload(scannedQrData)`.
- `QrSyncSession` lifecycle wrapper around:
  - `WebSocketTransport`
  - `SessionStore`
  - `WalletClient`
- Incoming message routing from session -> controller.
- Controller-owned private storage of the current import plan.

### Files created so far

- `app/core/QrSync/types.ts`
  - shared QR sync types
- `app/core/QrSync/constants.ts`
  - action names, relay URL, message version
- `app/core/QrSync/controller-types.ts`
  - controller name, state, actions, events, messenger type
- `app/core/QrSync/QrSyncController.ts`
  - controller scaffold and current entrypoints
- `app/core/QrSync/services/qr-sync-payload-validator.ts`
  - validation + normalization for `sync-ready`
- `app/core/QrSync/services/qr-sync-connection-request.ts`
  - QR scan parsing + `SessionRequest` validation
- `app/core/QrSync/services/qr-sync-session.ts`
  - wallet-side MWP runtime helper
- `app/core/QrSync/services/qr-sync-message-router.ts`
  - routes incoming raw decrypted messages into controller events
- `app/core/Engine/messengers/qr-sync-controller-messenger.ts`
  - messenger factory
- `app/core/Engine/controllers/qr-sync-controller-init.ts`
  - init scaffold

### What is intentionally not implemented yet

- Engine registration / wiring into the full messenger-client init pipeline
- UI bridge / Redux-connected screen flow
- review approval / rejection actions from UI back into controller
- import orchestration after `sync-ready`
- onboarding-aware branching for import execution
- final `sync-completed` / cancel send-back behavior
- cleanup policy beyond current basic detach/reset behavior
- tests

## Next Iteration Start Point

Start from **Phase 6: Import Orchestration**, but do one small bridge step
first so the controller can actually move from review state to import
execution.

### Immediate next step

Add controller methods for review flow decisions:

- `approveCurrentReview(...)`
- `rejectCurrentReview(...)`
- maybe `cancelCurrentSession(...)`

These methods should:

- operate on the already-stored private `QrSyncImportPlan`
- transition controller phase appropriately
- prepare the controller to call the future import orchestration layer

### Then implement

Create `QrSyncImportService` and wire it into the controller:

- detect before vs after onboarding
- call existing wallet import primitives
- keep secrets out of controller state
- on success, send `sync-completed`
- on failure, emit/store `sync-error`

## Open Questions To Reconfirm Before Resuming

- Is the scanned QR payload always JSON/base64 JSON, or can it arrive as a
  deeplink-style wrapper too?
- Should mobile force `mode: 'untrusted'` on connect, similar to Agentic CLI,
  or should it trust the QR-provided mode?
- After user approves review, should mobile send any intermediate ack before
  import starts, or only final `sync-completed` / error?
- For post-onboarding imports, what exact behavior should happen if a primary
  mnemonic is included?
