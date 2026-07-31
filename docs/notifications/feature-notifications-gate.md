# FeatureNotificationsGate — Feature Overview

---

## 1. Overview

A drop-in gate any feature screen can embed. When a user lands on a feature that sends notifications but hasn't enabled them yet, a bottom sheet appears to let them do so inline — without leaving the screen. Once enabled, the sheet closes automatically. The user can also dismiss the sheet without enabling; in that case they are navigated back. Nothing is shown if notifications are already set up.

**The sheet is a navigation route.** The gate does not render the sheet inline. It navigates to a dedicated sheet screen registered on the app's root modal stack (`Routes.MODAL.ROOT_MODAL_FLOW` → `Routes.SHEET.FEATURE_NOTIFICATIONS_GATE`, presented as a `transparentModal`). This is the same mechanism every other bottom sheet in the app uses, and it is what guarantees the sheet always renders above all screen content — keypads, footers, forms — with no `zIndex`, native `Modal`, or render-order tricks. Opening the sheet is a `navigate`; closing it (X button, overlay tap, or auto-close) is a `goBack` that pops the route.

**Components**

| Component                                                                                                                                | Role                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`FeatureNotificationsGate`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.tsx)                     | Rendered by the feature screen; renders nothing itself. Opens the sheet route when the gate is blocked, dismisses the screen if the user gives up, and runs the OS push permission check. |
| `FeatureNotificationsGateSheet` (same file)                                                                                              | The sheet screen registered on the root modal stack. Owns the sheet UI, the toggle snapshot, and auto-close.                                                                              |
| [`MainNotificationToggle`](../../app/components/Views/Settings/NotificationsSettings/MainNotificationToggle.tsx)                         | Toggle to turn on MetaMask notifications globally.                                                                                                                                        |
| [`NotificationSettingsSectionContent`](../../app/components/Views/Settings/NotificationsSettings/NotificationSettingsSectionContent.tsx) | Push + In-App toggles for a specific feature.                                                                                                                                             |
| [`NotificationSettingsSection`](../../app/components/Views/Settings/NotificationsSettings/NotificationSettingsSection.tsx)               | Separate full-screen settings page for a feature (not part of the gate).                                                                                                                  |

**How to add it to a screen**

Render `<FeatureNotificationsGate feature="yourFeature" />` in the screen's component tree. Supported features: `walletActivity`, `perps`, `agenticCli`, `socialAI`, `marketing`, `priceAlerts`. By default, dismissing without enabling navigates back. Pass an `onDismiss` prop to override that behaviour.

**Contract: only mount the gate on a screen that intends to stay.** The gate binds its dismiss logic to the screen that presented the sheet. A screen that may still redirect on its own (e.g. replace itself after a fetch resolves) must not mount the gate until that decision is made — otherwise the sheet outlives its presenter and, if the user closes it without enabling, it re-opens once instead of dismissing. [`ManagePriceAlertsView`](../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.tsx) shows the pattern: it mounts the gate behind a `hasAlertsToManage` flag, because every other fetch outcome navigates away.

**Unit-testing a screen that embeds the gate**

The gate pulls in the whole notification preferences stack: `useNotificationStoragePreferences` needs a TanStack `QueryClientProvider`, and it reads feature flags through `useSelector`, so it needs a Redux store too. Any unit test that renders a screen containing `<FeatureNotificationsGate />` must either:

1. **Mock the gate** (preferred for the host screen's tests — gate behaviour is covered in [`FeatureNotificationsGate.test.tsx`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.test.tsx)), or
2. Wrap the render tree in **both** a `QueryClientProvider` and a Redux `Provider` (e.g. `renderWithProvider`)

Otherwise the suite fails with `No QueryClient set, use QueryClientProvider to set one` or `could not find react-redux context value; please ensure the component is wrapped in a <Provider>`. Mocking keeps the host screen's tests from having to track whichever providers the gate depends on next.

```ts
jest.mock('.../NotificationsSettings/FeatureNotificationsGate', () => ({
  FeatureNotificationsGate: (props: unknown) => mockFeatureGate(props),
}));
```

See [`CreatePriceAlertView.test.tsx`](../../app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView.test.tsx) and [`ManagePriceAlertsView.test.tsx`](../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.test.tsx) for host-screen examples.

Component view tests (`*.view.test.tsx`) need no such change — `tests/component-view/render.tsx` already supplies both providers, and mocking anything beyond Engine and native modules is forbidden there. Those tests exercise the real gate.

---

## 2. How the gate and the sheet talk to each other

Because the sheet is a separate route, the gate cannot watch it directly. It uses **navigation focus** as the signal instead:

- Presenting the sheet takes focus away from the host screen.
- Closing the sheet (any way) gives focus back.

So the gate only acts when its screen is focused while the gate is still blocked, and there are exactly two possibilities:

1. **No sheet was presented yet** → present it (and remember that it was, in a ref).
2. **A sheet was presented before** → it just closed with the gate still blocked, meaning the user gave up → dismiss the screen (`onDismiss`, default `navigation.goBack()`).

If the user _satisfied_ the gate instead, the sheet auto-closes and the refocus does nothing — the gate is no longer blocked and the screen just becomes usable.

The ref is needed because those two moments are otherwise indistinguishable: a closed sheet leaves no trace in navigation state, so "never presented" and "presented and rejected" look identical without one bit of memory. See the `useGateSheetPresentation` hook in [`FeatureNotificationsGate.tsx`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.tsx) for the full reasoning.

One consequence of the route split: `onDismiss` stays a prop on the gate component (functions can't travel through route params), while `feature` and `autoDismiss` are plain data and are forwarded to the sheet as route params.

---

## 3. Conditional rendering

**When the sheet appears**

The sheet is presented if either:

- The MetaMask master notifications toggle is off, **or**
- Both push and in-app channels are off for that specific feature

If notifications are fully set up, nothing is presented.

**What shows inside the sheet**

The sheet takes a snapshot of the notification state at the moment it opens and keeps it frozen. This prevents sections appearing or disappearing mid-session as the user toggles things.

The sheet is not presented until the stored preferences have loaded. An unresolved read looks identical to "every channel is off", so deciding earlier would open the sheet for users who already have the feature set up.

| State at open                               | Sheet contents                        |
| ------------------------------------------- | ------------------------------------- |
| Master off + both channels off              | Master toggle + Push & In-App toggles |
| Master off, at least one channel already on | Master toggle only                    |
| Master on, both channels off                | Push & In-App toggles only            |

While the master toggle is still off, the Push and In-App toggles are visible but disabled — turning them on would have no effect until master is enabled first. Similarly, once the master toggle is turned on it becomes disabled since we don't want the user to be able to set up an undesirable state like master off + channels on.

---

## 4. OS push notification permissions

When push notifications are enabled for a feature, the gate also checks whether the OS has granted push permission.

- If already granted → nothing happens
- If the OS can still prompt → native system dialog appears
- If the user previously denied the OS dialog → they're deep-linked to the device Settings app

This check runs **independently of whether the sheet is open** — it lives in the gate component on the screen, not in the sheet. If a user already has everything enabled when they land on the screen (sheet never opens), the OS check still runs. This covers the case where push was enabled elsewhere but the OS permission dialog was never shown.

The OS dialog is intentionally delayed until after the sheet finishes opening, so both don't compete for the user's attention at the same time.

If the user later turns push off and back on, the OS check runs again — it resets each time push is disabled.

---

## 5. Dismiss behaviour

**Auto-close (no user action needed)**

The sheet closes itself when the gate condition is satisfied:

- **Master was in the sheet, user enables everything** — master, push, and in-app all turned on → auto-close.
- **Master was already on, not visible in sheet, user enables both channels** — push and in-app toggled on → auto-close.
- **Master-only sheet satisfied** — the sheet only showed the master toggle (at least one channel was already on at mount, so channel toggles were hidden). User turns master on → gate closes even if the other channel is still off. The rationale: channels weren't surfaced as a problem, so the gate doesn't hold for them.

After auto-close, the user stays on the feature screen. No navigation happens.

**User-initiated close**

The user can tap the X or swipe the sheet down at any time. What happens next depends on whether they satisfied the gate before closing:

| User closes sheet                        | Gate satisfied? | Result                                 |
| ---------------------------------------- | --------------- | -------------------------------------- |
| After enabling notifications             | Yes             | Stays on screen                        |
| Without enabling (taps X or swipes down) | No              | Navigated back (or custom `onDismiss`) |

**Configuring dismiss**

The default behaviour on an unsatisfied dismiss is `navigation.goBack()`. This can be overridden per usage — e.g. staying on the screen, showing an error state, or navigating somewhere specific — by passing an `onDismiss` callback. Auto-close behaviour is controlled by the `autoDismiss` prop (default `true`).
