# FeatureNotificationsGate

## Overview

`FeatureNotificationsGate` lets a feature require notification setup before the user continues. If the requirement is not satisfied, it presents a bottom sheet with feature-specific copy, a notification preview, and one shared “Turn on notifications” action.

The gate renders nothing itself. It opens `Routes.SHEET.FEATURE_NOTIFICATIONS_GATE` in the root modal flow as a `transparentModal`, ensuring the sheet renders above the feature screen without relying on `zIndex`, a native `Modal`, or sibling order.

The implementation is split across:

- [`FeatureNotificationsGate`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.tsx): mounted by the feature screen; decides whether to present the sheet, handles an unsatisfied dismissal, and checks OS push permission.
- [`FeatureNotificationsGateSheet`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGateSheet.tsx): renders the preview and CTA, enables notifications, and closes the sheet route.
- [`featureNotificationsGateConfig`](../../app/components/Views/Settings/NotificationsSettings/featureNotificationsGateConfig.ts): maps supported notification preference sections to their localized copy keys.
- [`useFeatureNotificationsStatus`](../../app/components/Views/Settings/NotificationsSettings/hooks/useFeatureNotificationsStatus.ts): reads the master toggle, feature channels, and preference-loading state.

## Integration guide

### 1. Register the feature copy

Configuring feature-specific copy is required. TypeScript does not allow a feature to be passed to `FeatureNotificationsGate` until it is registered.

Add the source copy under `notifications.feature_gate.<feature>` in [`locales/languages/en.json`](../../locales/languages/en.json):

```json
{
  "notifications": {
    "feature_gate": {
      "your_feature": {
        "title": "Feature-specific heading",
        "description": "Explain why notifications are useful.",
        "preview": {
          "title": "Notification preview title",
          "message": "Notification preview message",
          "timestamp": "now"
        }
      }
    }
  }
}
```

Every feature must provide:

- `title`
- `description`
- `preview.title`
- `preview.message`
- `preview.timestamp`

The CTA is shared and already defined at `notifications.feature_gate.cta`; do not add a feature-specific CTA.

### 2. Register the localization keys

Add the notification preference key and its five localization keys to `FEATURE_NOTIFICATIONS_GATE_COPY` in [`featureNotificationsGateConfig.ts`](../../app/components/Views/Settings/NotificationsSettings/featureNotificationsGateConfig.ts).

The registry only accepts keys from `NotificationPreferenceSection`, and the component only accepts keys present in the registry. TypeScript rejects both invalid preference keys and valid-but-unconfigured features. Currently configured: `priceAlerts`.

### 3. Mount the gate

Render the gate after the screen has decided it will remain mounted:

```tsx
{
  screenWillStay && (
    <FeatureNotificationsGate
      feature="yourFeature"
      autoDismiss
      onDismiss={handleDismiss}
    />
  );
}
```

Props:

- `feature`: required; a configured notification preference section.
- `autoDismiss`: optional; closes the sheet when the requirement is satisfied. Defaults to `true`.
- `onDismiss`: optional; runs when the user closes the sheet without satisfying the requirement. Defaults to `navigation.goBack()`.

Only mount the gate on a screen that intends to stay. A screen that may still redirect, such as after a fetch, must wait until that decision is complete. Otherwise, the sheet can outlive its presenting screen. [`ManagePriceAlertsView`](../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.tsx) demonstrates this by mounting the gate only when `hasAlertsToManage` is true.

### 4. Test the integration

Host-screen unit tests should normally mock the gate because its behavior is covered by [`FeatureNotificationsGate.test.tsx`](../../app/components/Views/Settings/NotificationsSettings/FeatureNotificationsGate.test.tsx):

```ts
jest.mock('.../NotificationsSettings/FeatureNotificationsGate', () => ({
  FeatureNotificationsGate: (props: unknown) => mockFeatureGate(props),
}));
```

See [`CreatePriceAlertView.test.tsx`](../../app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView.test.tsx) and [`ManagePriceAlertsView.test.tsx`](../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.test.tsx) for examples.

If a unit test renders the real gate, its tree needs both a TanStack `QueryClientProvider` and a Redux `Provider`, such as those supplied by `renderWithProvider`. Component view tests already receive both providers from `tests/component-view/render.tsx` and should exercise the real gate.

## Runtime behavior

### When the sheet appears

The gate waits for stored preferences to load, then presents the sheet when either:

- The global MetaMask notifications toggle is off.
- Both push and in-app channels are off for the selected feature.

Nothing is presented when the global toggle and at least one feature channel are enabled.

### What the CTA does

Pressing “Turn on notifications”:

1. Opens the Basic Functionality consent sheet instead if Basic Functionality is disabled.
2. Otherwise, enables the global notifications toggle when needed.
3. Enables both push and in-app channels for the selected feature.

With `autoDismiss` enabled, the sheet closes once the global toggle and at least one feature channel are on. The CTA enables both channels, but accepting either channel as satisfied also handles an existing or concurrent preference change.

### Closing the sheet

The user can close the sheet using the close button, overlay, or swipe gesture.

- If the gate is satisfied, the user remains on the feature screen.
- If it is still blocked, `onDismiss` runs. Its default implementation calls `navigation.goBack()`.
- If `autoDismiss` is `false`, satisfying the gate does not close the sheet automatically.

## Implementation details

### Route and focus communication

Because the sheet is a separate route, the gate uses navigation focus to detect when it closes:

1. The host screen is focused and blocked, so the gate presents the sheet and records that it did so.
2. Presenting the sheet takes focus from the host screen.
3. Closing the sheet returns focus to the host screen.
4. If the host screen is still blocked, the user dismissed without satisfying the requirement, so `onDismiss` runs.
5. If the requirement is satisfied, the screen remains usable.

The ref in `useGateSheetPresentation` stores the one bit of history needed to distinguish “the sheet has never opened” from “the sheet opened and was dismissed.” A closed sheet leaves no equivalent trace in navigation state.

`onDismiss` remains on the gate because functions should not be passed through route params. The serializable `feature` and `autoDismiss` values are forwarded to the sheet route.

### OS push permission

When the feature's push channel is enabled, the gate also checks the OS push permission:

- If permission is granted, nothing happens.
- If the OS can still prompt, the native permission dialog appears.
- If permission was previously denied, the user is directed to device settings.

This check runs independently of sheet visibility. It therefore also covers users whose in-app notification preferences are already enabled while OS push permission remains off. The check is delayed until sheet opening interactions finish, and it is armed again whenever the feature's push channel is disabled.
