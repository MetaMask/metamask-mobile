# Notifications integration strategy

Domain rollout and shape detail for **notification settings** (Engagement). Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case → layer assignments live in [`notifications-use-cases.md`](notifications-use-cases.md).

## TL;DR

Integration for notifications proves the settings toggles drive the real
`NotificationServicesController` / `NotificationServicesPushController` pair —
controller state, the Trigger API subscription writes, the AUS preference
seeding, and the FCM token registration/removal — with only the HTTP and
FCM/native push boundaries mocked. The two controllers run on the production
messenger layout, so the NSC → push controller seam and the app messenger
delegation lists are exercised for real. No Shape B/C: the settings screen
behaviour stays in CV (existing `NotificationsSettings.view.test.tsx`).

## Notifications integration harness shapes

Only Shape A exists today.

| Layer of the stack                                                                                          | Shape A: controllers |
| ----------------------------------------------------------------------------------------------------------- | -------------------- |
| `@metamask/notification-services-controller` (both subpath entries)                                         | ✓ real               |
| Production messenger wiring (`app/core/Engine/messengers/notifications/`)                                   | ✓ real               |
| `global.fetch` — Trigger / Push / Notification / Contentful APIs                                            | mocked               |
| `config.pushService` — FCM/native push (`createRegToken`, `deleteRegToken`, `subscribeToPushNotifications`) | mocked               |
| `AuthenticationController` actions (`getBearerToken`, `isSignedIn`, `performSignIn`)                        | mocked (OAuth I/O)   |
| `KeyringController:getState` (account source)                                                               | mocked               |
| `AuthenticatedUserStorageService` notification-preference actions (AUS API)                                 | mocked               |
| Settings screen / hooks / Redux                                                                             | ✗ (CV owns)          |
| Native runtime (FCM, Braze, OS permissions)                                                                 | ✗ (E2E owns, GE-634) |

Best for: settings-toggle → controller → API/token seams. Cost low; maintenance burden low.

The mocked `AuthenticationController` / `KeyringController` /
`AuthenticatedUserStorageService` entries are the HTTP/OAuth/native I/O those
services perform in production, reached at their messenger boundary; the
controller code that consumes them runs for real.

## Harness inventory

When a harness is added or its public boundary changes, update this section. Follow the central [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md) workflow rather than documenting authoring rules here. Shared agent index: [`../../AGENTS.md`](../../AGENTS.md).

### Notifications — [`notifications.ts`](notifications.ts)

- **Shape:** A — controller-level harness
- **Real:** `NotificationServicesController`, `NotificationServicesPushController` (from `@metamask/notification-services-controller` `notification-services` / `push-services`), the production messenger getters from `app/core/Engine/messengers/notifications/`
- **Mocked:** `global.fetch` (Trigger API query + subscribe, Push API token links, Notification API, Contentful); `config.pushService` (FCM/native); `AuthenticationController:getBearerToken` / `:isSignedIn` / `:performSignIn`; `KeyringController:getState`; `AuthenticatedUserStorageService:getNotificationPreferences` / `:putNotificationPreferences`
- **Factory:** `buildNotificationsIntegrationHarness({ initialState?, initialPushState?, keyringAccounts? })`
- **Returns:** `{ notificationServicesController, pushController, rootMessenger, fetchCalls(urlPart, excludeUrlPart?), setHttpResponse(urlPart, { status, json }), waitFor(condition, timeoutMs?), mocks: { fetch, pushService, getBearerToken, isSignedIn, performSignIn, getNotificationPreferences, putNotificationPreferences } }`
- **Helpers:** `HARNESS_ACCOUNT_A` / `HARNESS_ACCOUNT_B` (lowercase-digit addresses so checksumming is a no-op), `HARNESS_BEARER_TOKEN`, `HARNESS_FCM_TOKEN`, endpoint constants (`TRIGGER_API_QUERY_ENDPOINT`, `TRIGGER_API_NOTIFICATIONS_ENDPOINT`, `PUSH_API_TOKEN_ENDPOINT`, `NOTIFICATION_API_LIST_ENDPOINT`)
- **Singleton reset:** every runtime module the controllers depend on (both package entries, `@metamask/messenger`, the two production messenger getters) is required inside a `jest.isolateModules` registry, so the 60s Trigger-API config-cache singleton (`notificationsConfigCache`) is fresh per harness build without reaching into package internals.
- **Use when:** proving a settings-toggle flow reaches real controller state, the Trigger/AUS APIs, and the push token lifecycle with mocked I/O. Smoke: [`notifications.integration.test.ts`](notifications.integration.test.ts)
- **Use cases:** see [`notifications-use-cases.md`](notifications-use-cases.md) (`NOT-SET-*`)

## Coverage plan (summary)

Driven by [`notifications-use-cases.md`](notifications-use-cases.md):

| Area                                                        |   E2E | Integration |    CV |  Unit |  Total |
| ----------------------------------------------------------- | ----: | ----------: | ----: | ----: | -----: |
| Settings toggles (master / wallet activity / announcements) |       |          10 |       |       |     10 |
| **Total (current matrix)**                                  | **0** |      **10** | **0** | **0** | **10** |

Integration owns the toggle → controller → API/token seams; CV owns screen
rendering and error handling; the OS permission dialog stays with E2E under
GE-634.

## Implementation plan

### Done — Shape A foundation + settings toggles

Use cases: `NOT-SET-*` (all ten rows).

- **Integration.** `notifications.ts` + `notifications.integration.test.ts` — master enable (state + AUS seed + Trigger subscribe), push token registration through the real push controller, master disable (FCM removal + snap retention), re-enable with old token, feature-announcements local toggle, account-level enable/disable writes, Trigger API rejection paths (account disable + master enable), and the settings-screen presence read.

### Optional follow-on (not in current matrix)

- `fetchAndUpdateMetamaskNotifications` list flows (on-chain + feature announcements + snaps merge) on the same harness.
- `markMetamaskNotificationsAsRead` batching against the Notification API.
- Keyring `stateChange` → enable/disable accounts seam (debounced; needs timer strategy before it can be deterministic).

## How to add a notifications integration test

```ts
import { buildNotificationsIntegrationHarness } from '../../../../../tests/integration/harnesses/notifications/notifications';

describe('My notifications flow', () => {
  it('drives the real controller', async () => {
    const harness = buildNotificationsIntegrationHarness();

    await harness.notificationServicesController.enableAccounts([ACCOUNT]);

    expect(
      harness.fetchCalls(TRIGGER_API_NOTIFICATIONS_ENDPOINT, '/query'),
    ).toHaveLength(1);
  });
});
```

The harness mocks the HTTP / FCM / auth / AUS boundary; the rest runs real. See [Harness inventory](#harness-inventory) above and the central [`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) for authoring rules.

## Files in this folder

```
harnesses/notifications/
├── notifications.ts                      Shape A: controller-level harness
├── notifications.integration.test.ts     settings-toggle integration tests
├── notifications-use-cases.md            every notifications settings use case → primary layer
└── STRATEGY.md                           this file
```
