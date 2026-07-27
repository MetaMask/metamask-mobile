# FeatureNotificationsGate — Feature Overview

---

## 1. Overview

A drop-in gate component any feature screen can embed. When a user lands on a feature that sends notifications but hasn't enabled them yet, a bottom panel appears to let them do so inline — without leaving the screen. Once enabled, the panel closes automatically. The user can also dismiss the panel without enabling; in that case they are navigated back. Nothing is shown if notifications are already set up.

**Components**

| Component                                                                                                                  | Role                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`FeatureNotificationsGate`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.tsx)       | The gate itself. Owns visibility, auto-close, and dismiss logic.         |
| [`MainNotificationToggle`](../../app/components/Views/Settings/NotificationsSettings/MainNotificationToggle.tsx)           | Toggle to turn on MetaMask notifications globally.                       |
| [`NotificationSectionContent`](../../app/components/Views/Settings/NotificationsSettings/NotificationSectionContent.tsx)   | Push + In-App toggles for a specific feature.                            |
| [`NotificationSettingsSection`](../../app/components/Views/Settings/NotificationsSettings/NotificationSettingsSection.tsx) | Separate full-screen settings page for a feature (not part of the gate). |

**How to add it to a screen**

Drop `<FeatureNotificationsGate feature="yourFeature" />` anywhere in the screen's component tree. Supported features: `walletActivity`, `perps`, `agenticCli`, `socialAI`, `marketing`, `priceAlerts`. By default, dismissing without enabling navigates back. Pass an `onDismiss` prop to override that behaviour.

For a real usage example, see [`ManagePriceAlertsView`](../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.tsx).

---

## 2. Conditional rendering

**When the panel appears**

The panel opens if either:

- The MetaMask master notifications toggle is off, **or**
- Both push and in-app channels are off for that specific feature

If notifications are fully set up, nothing renders.

**What shows inside the panel**

The panel takes a snapshot of the notification state at the moment it opens and keeps it frozen. This prevents sections appearing or disappearing mid-session as the user toggles things.

| State at open                               | Panel contents                        |
| ------------------------------------------- | ------------------------------------- |
| Master off + both channels off              | Master toggle + Push & In-App toggles |
| Master off, at least one channel already on | Master toggle only                    |
| Master on, both channels off                | Push & In-App toggles only            |

While the master toggle is still off, the Push and In-App toggles are visible but disabled — turning them on would have no effect until master is enabled first. Similarly, once the master toggle is turned on it becomes disabled since we don't want the user to be able to set up an undesirable state like master off + channels on.

---

## 3. OS push notification permissions

When push notifications are enabled for a feature, the gate also checks whether the OS has granted push permission.

- If already granted → nothing happens
- If the OS can still prompt → native system dialog appears
- If the user previously denied the OS dialog → they're deep-linked to the device Settings app

This check runs **independently of whether the panel is open**. If a user already has everything enabled when they land on the screen (panel never opens), the OS check still runs. This covers the case where push was enabled elsewhere but the OS permission dialog was never shown.

The OS dialog is intentionally delayed until after the bottom panel finishes opening, so both don't compete for the user's attention at the same time.

If the user later turns push off and back on, the OS check runs again — it resets each time push is disabled.

---

## 4. Dismiss behaviour

**Auto-close (no user action needed)**

The panel closes itself when the gate condition is satisfied:

- **Master was in the panel, user enables everything** — master, push, and in-app all turned on → auto-close.
- **Master was already on, not visible in panel, user enables both channels** — push and in-app toggled on → auto-close.
- **Master-only panel satisfied** — the panel only showed the master toggle (at least one channel was already on at mount, so channel toggles were hidden). User turns master on → gate closes even if the other channel is still off. The rationale: channels weren't surfaced as a problem, so the gate doesn't hold for them.

After auto-close, the user stays on the feature screen. No navigation happens.

**User-initiated close**

The user can tap the X or swipe the panel down at any time. What happens next depends on whether they satisfied the gate before closing:

| User closes panel                        | Gate satisfied? | Result                                 |
| ---------------------------------------- | --------------- | -------------------------------------- |
| After enabling notifications             | Yes             | Stays on screen                        |
| Without enabling (taps X or swipes down) | No              | Navigated back (or custom `onDismiss`) |

**Configuring dismiss**

The default behaviour on an unsatisfied dismiss is `navigation.goBack()`. This can be overridden per usage — e.g. staying on the screen, showing an error state, or navigating somewhere specific — by passing an `onDismiss` callback.
