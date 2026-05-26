# Agentic CLI: Push-Driven Mobile Webview (POC)

Scoping doc for the work covered by sub-tasks under [MMAI-138](https://consensyssoftware.atlassian.net/browse/MMAI-138).
This branch is the exploration phase — the goal is to validate the end-to-end pipe (CLI → backend → push → mobile → webview)
and lock down the design before turning the sub-tasks into real implementation.

## What we're building

The agentic CLI delegates two user-facing actions to the MetaMask Mobile app:

1. **CLI login** — when a user runs `mm login` (or equivalent) on the CLI and provides their account, the backend
   sends a push to that user's MetaMask Mobile. The user taps the push, the app opens a webview, and the user
   completes the login challenge inside that webview.
2. **Transaction approve / reject** — when the CLI initiates a transaction that requires user confirmation, the
   same channel is used: push → webview → approve or reject. The webview is hosted by the backend; the mobile app
   only ferries auth context in and result events back out.

Phase 1 deliberately treats the mobile side as a thin shell. The actual UI (login form, tx review) is rendered by
the web side and embedded in a `WebView`.

## User flows

### Flow A: CLI login

```
1. User on CLI: `mm login --account <ethereum_address>`
2. CLI/Mimir backend → NAAP: trigger push (recipient = rcpt-caip10:<address>)
3. NAAP → FCM/APNS → MetaMask Mobile
4. User taps the push:
   a. Killed: app cold-starts, vault unlocks via password, then routes to webview
   b. Background: app resumes, routes to webview
   c. Foreground: in-app banner tap routes directly to webview
5. Mobile receives `https://link.metamask.io/agentic-cli?...` and opens the hardcoded hosted approval page
6. Mobile injects the user's bearer token into the webview's `Authorization` header and `#token=<bearer>` URL fragment
7. User completes the login challenge in the webview
8. Webview posts an `approved`, `rejected`, `close`, or `error` message back to the native side
9. Mobile dismisses the webview and shows a toast/result
```

### Flow B: Transaction approve / reject

Identical to Flow A except `operationType=tx_approve` and the hosted webview renders the tx intent +
human-readable policy diff (per [MMAI-138](https://consensyssoftware.atlassian.net/browse/MMAI-138) AC) plus
Approve / Deny buttons. The backend signals back through `postMessage`.

## Architecture

```
┌────────────────┐  POST  ┌─────────────────┐  FCM   ┌───────────────────┐
│ Mimir / CLI BE │ ─────▶ │  NAAP           │ ─────▶ │ Firebase / APNS    │
│ (issues push)  │        │ (push.api...)   │        │                    │
└────────────────┘        └─────────────────┘        └─────────┬─────────┘
                                                                │
                                                                ▼
                              ┌────────────────────────────────────────────────────────┐
                              │ MetaMask Mobile                                        │
                              │                                                        │
                              │   FCMService (foreground / background / cold-start)    │
                              │      └─ extracts data.deeplink                         │
                              │           └─ DeeplinkManager.setDeeplink()             │
                              │                └─ AppStateEventProcessor               │
                              │                     ↓ (gated on LOGIN + onboarding)    │
                              │                handleDeeplinkSaga                      │
                              │                     ↓                                  │
                              │                SharedDeeplinkManager.parse()           │
                              │                     ↓                                  │
                              │                handleUniversalLink                     │
                              │                     ↓ (new path: /agentic-cli)          │
                              │                MfaWebviewScreen ─── new ───            │
                              └────────────────────────────────────────────────────────┘
```

## Hosted web contract

The current hosted approval page lives in
[`torusresearch/developer-dashboard`](https://github.com/torusresearch/developer-dashboard).
Mobile accepts a notification CTA link in this shape:

```text
https://link.metamask.io/agentic-cli?projectId=<projectId>&notificationId=<requestId>&operationType=<login|tx_approve>&subjectId=<subjectId>
```

Mobile then opens:

```text
https://developer.metamask.io/agentic/approval?projectId=<projectId>&notificationId=<requestId>&operationType=<login|tx_approve>&subjectId=<subjectId>#token=<bearer>
```

The hosted page notifies native with:

```ts
type WebviewToNative =
  | { source: 'mm-cli-mfa'; type: 'approved'; approvalId: string }
  | { source: 'mm-cli-mfa'; type: 'rejected'; approvalId: string }
  | { source: 'mm-cli-mfa'; type: 'error'; approvalId: string; message: string }
  | { source: 'mm-cli-mfa'; type: 'close'; approvalId: string };
```

### Phase 1 operation scope

Confirmed with CW Lee on 2026-05-26: Phase 1 dashboard/mobile validation is `transaction_request` only.
Mimir currently has three MFA operation types: `transaction_request`, `signature_request`, and `wallet_mode_change`.
The backend can return data for `signature_request` and `wallet_mode_change`, but the hosted dashboard approval UI is
transaction-shaped today and expects fields such as `subject.tx.chainId`.
Use `transaction_request` for Phase 1 approve/reject validation. Do not use `signature_request` or
`wallet_mode_change` as mobile webview smoke tests until dashboard adds dedicated views for them.

## Reusable infrastructure (no work needed)

| Layer                    | File                                                                      | Notes                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Push reception           | `app/util/notifications/services/FCMService.ts`                           | iOS via APNS-through-Firebase, Android FCM. Custom `NotificationModule` on Android holds the cold-start intent.  |
| Cold-start tap           | `FCMService.onClickPushNotificationWhenAppClosed`                         | Reads `data.deeplink`                                                                                            |
| Background tap           | `FCMService.onClickPushNotificationWhenAppSuspended`                      | Reads `data.deeplink`                                                                                            |
| Deeplink buffering       | `app/core/DeeplinkManager/DeeplinkManager.ts` + `AppStateEventProcessor`  | Survives login                                                                                                   |
| Login-gated dispatch     | `app/store/sagas/index.ts` `handleDeeplinkSaga`                           | Waits for `LOGIN` / `CHECK_FOR_DEEPLINK` / `SET_COMPLETED_ONBOARDING`, gates on `KeyringController.isUnlocked()` |
| Universal link routing   | `app/core/DeeplinkManager/utils/parseDeeplink.ts` → `handleUniversalLink` | Add new paths here                                                                                               |
| Server-side push fan-out | NAAP API (`/api/internal/v1/notifications`)                               | Recipient by `rcpt-caip10` works without profile-sync integration                                                |

## Greenfield work (this branch's scope)

| Item                                                 | Owner                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New deeplink handler `/agentic-cli`                  | Mobile                      | Add to `handleUniversalLink`. Push to MfaWebviewScreen with `projectId`, `notificationId`, `operationType`, and `subjectId`. Mobile hardcodes the hosted approval page to `https://developer.metamask.io/agentic/approval`, while explicit `approvalPageLink` support remains for local or alternate test pages.                                                                                                                                                           |
| Legacy deeplink handlers `/cli-login`/`/cli-approve` | Mobile                      | Kept temporarily for the local mock/debug button.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `MfaWebviewScreen`                                   | Mobile                      | Hosts a `react-native-webview` with `source.headers.Authorization` set to the user's bearer token (MMAI-176).                                                                                                                                                                                                                                                                                                                                                              |
| `postMessage` listener                               | Mobile                      | Webview → native event channel for `approved` / `rejected` / `close` / `error` (MMAI-177).                                                                                                                                                                                                                                                                                                                                                                                 |
| Foreground push routing                              | Mobile                      | Decision (2026-05-05): tap on the in-app banner routes **directly to the webview**, not to today's notifications inbox. Two changes needed: (a) extend `processAndHandleNotification` to recognise our `notification_type` (today's branch silently drops non-wallet schemas), (b) replace the hardcoded `OPEN_NOTIFICATIONS_VIEW` press action in `push-utils.ts` with a deeplink press action.                                                                           |
| Modal-collision handling                             | Mobile                      | Decision (2026-05-05): webview takes priority **only when launched via push tap** (origin = `ORIGIN_PUSH_NOTIFICATION`). On normal app launch, no pending deeplink exists (current behavior) — banners/modals show as usual, and the user accesses missed sessions via the in-app notification inbox. Implementation: ensure the saga's deeplink dispatch runs before the Wallet screen mounts its banner stack, or have banners check for a pending push-origin deeplink. |
| New `team` + `notification_type` enum values         | Notifications platform team | Registered target values: `team-onboarding` and `agentic-cli`. Local dashboard testing can still use dashboard-allowed defaults.                                                                                                                                                                                                                                                                                                                                           |
| NAAP integration in Mimir                            | Backend (Mimir)             | POST to NAAP `/api/internal/v1/notifications`, recipient by `rcpt-caip10`.                                                                                                                                                                                                                                                                                                                                                                                                 |

## App states to support

| State      | Behavior                                                                                                                                                     | Status today                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Killed     | OS shows tray notif (from FCM `notification` block); tap → cold start → unlock prompt → after `LOGIN`, saga consumes pending deeplink → routes to webview    | Plumbing reusable; `/agentic-cli` deeplink handler added                                                                                                                |
| Background | OS shows tray notif; tap → `onNotificationOpenedApp` → `handleDeeplink` → saga (already unlocked) → routes                                                   | Same as above                                                                                                                                                           |
| Foreground | OS suppresses tray; in-app banner shown via Notifee. Decided: tap routes **directly to webview** (overrides today's `OPEN_NOTIFICATIONS_VIEW` press action). | Press-action change required; `processAndHandleNotification` also needs a parser branch for our `notification_type` (today's branch silently drops non-wallet schemas). |

## Backend payload shape (NAAP)

Minimum viable payload that the mobile pipeline can route today, validated end-to-end via the [Notify Dashboard](https://naap.dev-api.cx.metamask.io/public/dashboard):

```json
{
  "channels": ["channel-push"],
  "platforms": ["platform-mobile"],
  "recipient": { "type": "rcpt-caip10", "value": "eip155:1:0x<address>" },
  "team": "team-notify",
  "notification_type": "internal-test",
  "notification_event": "dashboard_test",
  "deduplication_id": "<uuid>",
  "metadata": { "notificationId": "<requestId>" },
  "template": {
    "version": "1.0",
    "default": {
      "item": {
        "title": { "text": "Approve CLI sign-in" },
        "short_desc": { "text": "Tap to review" },
        "cta": {
          "link": "https://link.metamask.io/agentic-cli?projectId=<projectId>&notificationId=<requestId>&operationType=login&subjectId=<subjectId>",
          "content": { "text": "Review" }
        }
      }
    }
  }
}
```

For real production traffic, `team` and `notification_type` must be replaced with the registered enum values (see
"Greenfield work").

## Decisions

- **Foreground UX (2026-05-05)**: in-app banner appears; tapping it routes directly to the webview. No
  intermediate notifications-inbox stop. Today's hardcoded `OPEN_NOTIFICATIONS_VIEW` press action in
  `app/core/Engine/controllers/notifications/push-utils.ts` must be replaced with a deeplink press action.
- **Modal collision (2026-05-05)**: the webview takes priority over post-login banners (Polymarket-style ad,
  legacy Google sheet, "What's New", multichain intro, etc.) **only when the app is launched via a push tap**.
  On a plain app launch (launcher icon, biometric unlock), there's no pending push deeplink and the existing
  banner/modal behavior is unchanged — the user reaches any missed CLI-login or tx-approval session through
  the in-app notification inbox.

## Open questions

1. **Wire format** — confirm that `template.default.item.cta.link` is forwarded into `remoteMessage.data.deeplink`
   on the FCM payload. Mobile's existing handler reads exactly that field; if NAAP puts it elsewhere, we need either
   a NAAP adjustment or a mobile-side parser tweak. (Easy to confirm with one test push + the dev logs in this branch.)
2. **Auth header lifecycle** — bearer token has a TTL. If the user takes time to act in the webview, the token
   may expire mid-session. Need a refresh strategy.
3. **postMessage protocol** — current hosted schema is `{ source: 'mm-cli-mfa', type: 'approved' | 'rejected' | 'close' | 'error', approvalId, message? }`.
4. **Recipient by CAIP-10 vs profile-id** — confirm `rcpt-caip10` works for `channel-push` (the OpenAPI allows it; not yet tested for push specifically).

## Smoke testing this branch

Local smoke testing currently uses direct deeplinks instead of Notifee. This keeps the mobile MFA webview loop
testable on both Android and iOS while backend push delivery is still being finalized.

1. Start Metro: `yarn watch:clean`.
2. Start the mock backend:

   ```sh
   cd ~/Documents/Repo/tylerdashboard/mfa-backend
   npm run dev:no-push
   ```

3. Build and install the app with `yarn start:ios` or `yarn start:android`.
4. From Wallet home, tap the dev-only `Open CLI-MFA deeplink` button. It creates a mock session, opens the
   corresponding `https://link.metamask.io/cli-login?...` link, and routes through the normal DeeplinkManager path.
5. Approve or reject in the webview and confirm the screen dismisses.

To test the OS-level universal link handoff without the debug button, create a mock session with
`POST /api/cli/initiate`, then open the link manually:

```sh
# iOS simulator
xcrun simctl openurl booted "https://link.metamask.io/cli-login?sessionId=<sessionId>&server=http%3A%2F%2Flocalhost%3A3000"

# Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/cli-login?sessionId=<sessionId>&server=http%3A%2F%2F10.0.2.2%3A3000"
```

No notification or Notifee test hooks are required for this local smoke path.

## Jira

- Epic: [MMAI-135](https://consensyssoftware.atlassian.net/browse/MMAI-135) MFA: Mobile + Cross-cutting
- Story (parent): [MMAI-138](https://consensyssoftware.atlassian.net/browse/MMAI-138) [Mobile WebView] A3 — MFA confirmation screen
- Sub-tasks (this branch's scope):
  - [MMAI-175](https://consensyssoftware.atlassian.net/browse/MMAI-175) Render corresponding webview in mobile as per notification
  - [MMAI-176](https://consensyssoftware.atlassian.net/browse/MMAI-176) Pass authentication header to webview
  - [MMAI-177](https://consensyssoftware.atlassian.net/browse/MMAI-177) Handle success/error result from webview
- Companion: [MMAI-137](https://consensyssoftware.atlassian.net/browse/MMAI-137) [Mobile] A2 — Push notification handler
