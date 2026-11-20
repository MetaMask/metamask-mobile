# Notifications use-case matrix

What the notification settings flows look like, and which test layer is responsible for proving them. Main happy paths first; edge cases live inside those tests.

Layer notation: **U** = Unit, **I** = Integration (Shape A = controller harness), **CV** = Component view. Primary layer is **bold**.

Shared four-layer model: [`../../STRATEGY.md`](../../STRATEGY.md). Domain rollout and shape detail: [`STRATEGY.md`](STRATEGY.md).

---

## Notification settings toggles

The settings screen drives `NotificationServicesController` /
`NotificationServicesPushController` through the Engine messenger; the I/O
boundary is the Trigger / Push / AUS HTTP APIs plus FCM (native push).

| ID                    | Use case                                                                                                                    | U   | I     | CV                                                                                                     | Coverage notes                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --- | ----- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| NOT-SET-MASTER-ON     | Master toggle on (first time) → AUS preferences seeded, keyring accounts subscribed on Trigger API, settings state flips on |     | **✓** |                                                                                                        | Shape A: real controller flow; marketing/product-announcement flags seeded into the preferences blob. |
| NOT-SET-PUSH-TOKEN    | Master toggle on → FCM token registered and linked to the accounts through the real push controller                         |     | **✓** |                                                                                                        | Shape A: NSC → push controller messenger seam; links POST carries the token + platform.               |
| NOT-SET-MASTER-OFF    | Master toggle off → FCM token removed, enabled flags cleared, snap notifications kept                                       |     | **✓** | Screen sections and toggle rendering by enabled state (existing `NotificationsSettings.view.test.tsx`) | Shape A.                                                                                              |
| NOT-SET-RE-ENABLE     | Re-enable after disable → FCM token re-registered carrying the previous token                                               |     | **✓** |                                                                                                        | Shape A: the push disable keeps the token for the backend cleanup path.                               |
| NOT-SET-ANNOUNCEMENTS | Feature-announcements toggle → local flag only, no API or push side effects                                                 |     | **✓** |                                                                                                        | Shape A: pins the toggle as local-only.                                                               |
| NOT-SET-ACCT-ON       | Enable wallet activity for an account → Trigger API enabled write, push untouched                                           |     | **✓** |                                                                                                        | Shape A: FCM links stay in place; per-account updating state settles.                                 |
| NOT-SET-ACCT-OFF      | Disable wallet activity for an account → Trigger API disabled write, no FCM removal                                         |     | **✓** |                                                                                                        | Shape A.                                                                                              |
| NOT-SET-ACCT-FAIL     | Trigger API rejects the account disable write → settings error, updating state cleared                                      |     | **✓** | Screen error handling stays CV                                                                         | Shape A rejection path.                                                                               |
| NOT-SET-MASTER-FAIL   | Trigger API subscription read fails during master enable → enable aborts, AUS not seeded, state untouched                   |     | **✓** |                                                                                                        | Shape A rejection path: a half-applied enable must not pass.                                          |
| NOT-SET-PRESENCE      | Settings screen subscription read (`checkAccountsPresence`) maps the Trigger API config per account                         |     | **✓** |                                                                                                        | Shape A: the per-account switch initial value source.                                                 |

---

## Deliberately not in this matrix (owned elsewhere)

| Concern                                                                  | Owner                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Settings screen rendering, switch states, section visibility             | CV — `NotificationsSettings.view.test.tsx` (MMQA-2604 items 2–3)                      |
| Redux action helpers around the controllers (`app/actions/notification`) | Unit — `app/actions/notification/helpers/index.test.tsx`                              |
| OS push permission dialog grant/deny                                     | E2E — deferred to GE-634 (device boundary; see MMQA-2604 item 2)                      |
| Notification list fetch/processing/mark-as-read flows                    | Follow-up use cases on this same harness (`fetchAndUpdateMetamaskNotifications`)      |
| Braze registration state (`markBrazePushRegistrationDesired`)            | Unit — `useBrazeIdentity` / helpers tests; Braze is app-side, outside the controllers |
