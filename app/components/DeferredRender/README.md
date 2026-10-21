# DeferredRender

Shared gate for mounting expensive UI after the navigation push has finished
and the screen has painted its critical content.

Use it for work that competes with the push animation: a WebView chart, a
heavy below-the-fold section, a large image tree. The critical shell (title,
price, back, primary actions) renders on the first commit. Deferred parts
mount one stage per frame after the transition.

This module does not wire that gate into Token details, Perps, or Predict.
Those screens keep their current render timing.

## When to use

- The slow part is **JavaScript or native view work on mount** (WebView
  creation, a large subtree, decoding).
- The user can understand the screen and act on it before that part exists.
- You know, or can estimate, the height of the deferred region.

## When not to use

- The screen is slow because it is **waiting on the network**. A placeholder
  does not make the response arrive sooner. The user then sees a spacer and
  then a spinner. Fix the fetch, or gate the fetch on visibility, instead.
- The deferred node is a **tappable primary action** (buy, send, swap, close,
  confirm, amount entry). Those must be in the first paint and must be able
  to take accessibility focus. Never put them inside `DeferredRender`.
- The node is cheap (a label, an icon, a short list the user must read to
  know which screen this is).
- You need the deferred subtree's layout in order to measure the critical
  content above it. Reserve height only when the estimate is honest.

## How a visit works

1. On the host's first commit, `performance.mark` records
   `deferred-render:<screenId>:first-render`.
2. The host waits for `useScreenTransitionComplete` (`app/components/hooks/useScreenTransitionComplete.ts`).
   - `transitionEnd` with `data.closing === true` is ignored (the screen is leaving).
   - If the focused screen never emits `transitionEnd` (initial route, tab
     switch, animation disabled, non-stack navigator), the hook flips true
     after `SCREEN_TRANSITION_FALLBACK_MS` (450).
   - If there is no navigator, `useNavigation` would throw. The hook reads
     `NavigationContext` and, when it is missing, uses that same 450ms timer
     without a focus check.
   - If the screen is no longer focused when that timer fires, it stays
     closed and re-arms on the next `focus`. That focus check applies only
     when a navigator is present.
3. After the gate opens, the next animation frame runs. When
   `requestIdleCallback` exists, the first stage also waits for an idle
   callback. Later stages wait one animation frame each. If the runtime has
   no idle callback, the first stage mounts on that frame.
4. A timeout is armed when the stage is scheduled, before
   `requestAnimationFrame`, so content still mounts when the frame or idle
   callback never runs. The first stage waits
   `DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS` (250), because that timer has to
   cover the frame and the idle wait. Each later stage waits
   `DEFERRED_RENDER_FRAME_TIMEOUT_MS` (100). Pass `frameTimeoutMs` to use one
   backup for every stage instead. There is no hardware-tier branching.
5. After the commit that mounts the last stage's children,
   `performance.mark` records `deferred-render:<screenId>:complete` and
   `onDeferredComplete` runs. Both happen once per visit. They mean the
   deferred children have committed, not merely that the stage was released.
   A visit that unmounts before that commit does not fire them.

`InteractionManager.runAfterInteractions` is not used. It has been deprecated
since React Native 0.80.

Released stages only move forward. Parent re-renders, prop updates, and
scrolling a slot offscreen and back do not show the placeholder again, as
long as the **host stays mounted**. A new visit is a remount (a fresh push
onto the stack) or a new `screenId`.

Mount the host with the screen, not inside a virtualized row. A slot may
live in the row. When the row remounts, it reads the host and paints
children immediately.

## Marks

Recorded with `performance.mark` from `react-native-performance` (User Timing).
Two calls per visit. No detail payload.

| Moment                           | Mark name                                 |
| -------------------------------- | ----------------------------------------- |
| Host first commit                | `deferred-render:<screenId>:first-render` |
| Last deferred children committed | `deferred-render:<screenId>:complete`     |

`<screenId>` is the `screenId` prop, unchanged. Pick a stable slug, for
example `token-details` or `perps-market-details`.

The span between the marks is first commit of the host to deferred-ready.
Mount the host on the screen's first render so that span lines up with
critical content. It does not include the touch that started navigation.
Pair the first mark with an existing navigation-tap mark when you need
tap-to-ready.

Helpers: `deferredRenderFirstRenderMark(screenId)` and
`deferredRenderCompleteMark(screenId)`.

## API

### `DeferredRender`

One deferred region. Creates a single-stage visit when it is not inside a host.

```tsx
import { DeferredRender } from '../../components/DeferredRender';

<DeferredRender
  screenId="token-details"
  estimatedHeight={280}
  onDeferredComplete={() => {
    // once per visit
  }}
>
  <PriceChart />
</DeferredRender>;
```

`estimatedHeight` is density-independent pixels and should match the chart's
final height. The placeholder is a `View` of that height. It sets
`accessible={false}`, `accessibilityElementsHidden`,
`importantForAccessibility="no-hide-descendants"`, and `focusable={false}`,
so it is not read and does not take focus.

### `DeferredRenderHost` and staged slots

Several regions share one visit, one pair of marks, and one callback.
Stage 0 releases on the first idle frame. Each next stage releases on the
following animation frame.

```tsx
import {
  DeferredRender,
  DeferredRenderHost,
} from '../../components/DeferredRender';

<DeferredRenderHost
  screenId="perps-market-details"
  stages={2}
  onDeferredComplete={handleChartReady}
>
  <MarketHeader />
  <DeferredRender stage={0} estimatedHeight={320}>
    <PerpsChart />
  </DeferredRender>
  <DeferredRender stage={1} estimatedHeight={480}>
    <BelowFoldStats />
  </DeferredRender>
</DeferredRenderHost>;
```

`stage` must be in `0 .. stages - 1`. A slot past that range stays on the
placeholder. `stages` should stay constant for the visit.

Inside a host, `screenId`, `enabled`, and `onDeferredComplete` on
`DeferredRender` are ignored. Put them on the host.

### `useDeferredRender`

For a custom placeholder. Still render a spacer with a real height, and
still keep it out of the accessibility tree. `DeferredPlaceholder` does
that.

```tsx
import {
  DeferredPlaceholder,
  useDeferredRender,
} from '../../components/DeferredRender';

const { isStageReady } = useDeferredRender({
  screenId: 'token-details',
  onDeferredComplete: handleReady,
});

return isStageReady() ? <PriceChart /> : <DeferredPlaceholder height={280} />;
```

`enabled={false}` reveals every stage on the first commit and still fires
`onDeferredComplete` once, after that commit. Use it for a screen that
should not defer (tests, or a path that already paid the cost). Turning
`enabled` back on does not hide content that was released. Flipping
`enabled` to false while a visit is still waiting mounts the remaining
stages on the next commit.

`frameTimeoutMs` replaces both backup timeouts. Omit it for 250ms on the
first stage and 100ms on each later stage.

Inside a host, `screenId`, `enabled`, `frameTimeoutMs`, and
`onDeferredComplete` on a slot are ignored. In development, passing them
logs a warning. A `stage` greater than or equal to `stages` also logs a
warning in development and stays on its placeholder. A placeholder height
of `0`, a negative number, or `NaN` logs a warning in development; pass the
real reserved height.

## Cleanup

On unmount the hook cancels its animation frame, idle callback, and timeout,
and `useScreenTransitionComplete` removes its `transitionEnd` and `focus`
listeners and its fallback timer. Callbacks check a mounted flag before
`setState`, including when the user pops the screen before the frame runs.
`onDeferredComplete` and the complete mark do not run for a visit that
unmounts before the last stage's children commit.
