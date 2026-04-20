# Haptics Toolkit

Centralized haptic feedback module for MetaMask Mobile.

**Only files under `app/util/haptics/` may import `expo-haptics` directly** (today: `vendorPlayback.ts`; `play.ts` / `useHaptics.ts` use shared gating via `gatedExecution.ts`). All feature code must import from `app/util/haptics`. ESLint `no-restricted-imports` enforces that.

## Core Principles

1. **Fewer moments, higher signal** — every haptic you add dilutes the ones that matter. Adding a new catalog entry requires design + platform sign-off + a QA sync note.
2. **Sync or skip** — a haptic that fires out of sync with its animation is worse than no haptic. QA must validate sync on a real device under realistic load before shipping.
3. **Semantic consistency** — success always feels like success; error always feels like error. Never reuse a haptic type across different meanings.
4. **Outcome ≠ error** — `playErrorNotification` is for system failures only. User-participated negative outcomes (lost bet, liquidation) must **never** use the error haptic.
5. **User control is mandatory** — respect OS haptics settings and the in-app "reduced haptics" toggle. The remote kill switch can disable all haptics instantly without a release.
6. **Android is progressive enhancement** — design for iOS Taptic Engine first; treat Android as best-effort with graceful failure.

## Catalog

| Moment               | Function                            | Underlying API               | Style  | Paired UI                         | Notes                                           |
| -------------------- | ----------------------------------- | ---------------------------- | ------ | --------------------------------- | ----------------------------------------------- |
| Success notification | `playSuccessNotification()`         | `notificationAsync(Success)` | —      | Toast / completion banner         | Non-negotiable #1                               |
| Error notification   | `playErrorNotification()`           | `notificationAsync(Error)`   | —      | Error toast / failure banner      | Non-negotiable #2. System failures only.        |
| Warning notification | `playWarningNotification()`         | `notificationAsync(Warning)` | —      | Compliance / restriction modal    |                                                 |
| Slider tick          | `playImpact('sliderTick')`          | `impactAsync(Light)`         | Light  | Slider step animation             |                                                 |
| Edge gesture engage  | `playImpact('edgeGestureEngage')`   | `impactAsync(Light)`         | Light  | Browser back/forward edge swipe   | Touch-down in edge zone; not slider ticks       |
| Slider grip          | `playImpact('sliderGrip')`          | `impactAsync(Medium)`        | Medium | Slider thumb press / release      | Distinct from tick / threshold crossings        |
| Tab change           | `playImpact('tabChange')`           | `impactAsync(Medium)`        | Medium | Tab transition                    |                                                 |
| Pull refresh engage  | `playImpact('pullToRefreshEngage')` | `impactAsync(Light)`         | Light  | Pull stretch past early threshold | Lighter than commit; pairs with `pullToRefresh` |
| Pull to refresh      | `playImpact('pullToRefresh')`       | `impactAsync(Medium)`        | Medium | Pull-to-refresh reload commit     |                                                 |
| Chart crosshair      | `playImpact('chartCrosshair')`      | `impactAsync(Light)`         | Light  | OHLC data change                  |                                                 |
| Selection            | `playSelection()`                   | `selectionAsync()`           | —      | Discrete value picker             |                                                 |

### Adding a new moment

1. Add the value to `catalog.ts` (`ImpactMoment` or `NotificationMoment`) with JSDoc.
2. Map the underlying style in `vendorPlayback.ts` (`IMPACT_STYLE_MAP`).
3. Add a row to this README table.
4. Get design + platform sign-off.
5. QA validates sync on both iOS and Android real devices under load.

## Usage

### In React components

```typescript
import { useHaptics } from '../../util/haptics';

function MyComponent() {
  const { playSuccessNotification } = useHaptics();

  const handleComplete = async () => {
    await performAction();
    await playSuccessNotification();
  };
}
```

### Outside React (utilities, sagas, class components)

```typescript
import { playErrorNotification } from '../../util/haptics';

async function handleFailure() {
  await playErrorNotification();
}
```

## Gates

All `play*` functions check `shouldPlayHaptic()` before calling the native API:

1. **In-app preference** — "reduced haptics" toggle in Settings.
2. **Remote kill switch** — feature flag; can disable all haptics instantly in production.
3. **OS-level** — `expo-haptics` itself is a no-op when the user has disabled system haptics.
4. **Try/catch** — native errors are swallowed; user flows never break.

## Future: vendor swap

If we migrate to Nitro Haptics or another native implementation, change `vendorPlayback.ts` (and optionally `gatedExecution.ts` if the gate contract changes). Call sites stay on `playSuccessNotification()` / `playImpact(moment)` / `useHaptics()`.
