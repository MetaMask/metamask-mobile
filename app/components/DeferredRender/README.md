# DeferredRender

## What it is

`DeferredRender` is a small primitive that holds back an expensive part of a
screen until the screen's opening transition has finished and the JS thread
has had a frame (and, when available, an idle slot) to breathe. Until then it
renders a fixed-height, accessibility-hidden placeholder so the layout does
not shift when the real content mounts.

The critical shell of the screen (title, key values, back button, primary
actions) renders on the first commit as usual. Only the subtrees you wrap are
deferred.

Exports from `app/components/DeferredRender`:

| Export                              | Kind      | Purpose                                               |
| ----------------------------------- | --------- | ----------------------------------------------------- |
| `DeferredRender`                    | component | One deferred region, or a staged slot inside a host   |
| `DeferredRenderHost`                | component | Owns one visit shared by several staged slots         |
| `DeferredPlaceholder`               | component | Fixed-height, accessibility-hidden spacer             |
| `useDeferredRender`                 | hook      | Same gate, for a custom render branch                 |
| `deferredRenderFirstRenderMark(id)` | function  | Returns `deferred-render:<id>:first-render`           |
| `deferredRenderCompleteMark(id)`    | function  | Returns `deferred-render:<id>:complete`               |
| `DeferredRenderProps`               | type      | Props of `DeferredRender`                             |
| `DeferredRenderHostProps`           | type      | Props of `DeferredRenderHost`                         |
| `DeferredPlaceholderProps`          | type      | Props of `DeferredPlaceholder` (`height`, `testID`)   |
| `UseDeferredRenderOptions`          | type      | Options of `useDeferredRender`                        |
| `UseDeferredRenderResult`           | type      | `{ releasedStage, isComplete, isStageReady(stage?) }` |

This module is a capability only. It is not wired into any screen.

## How it works

A **visit** is the lifetime of one hook or host instance. A fresh push onto
the stack remounts the screen and starts a new visit; so does a new
`screenId`. Each visit goes through the same gate:

1. **First commit.** In a layout effect, the host records the User Timing mark
   `deferred-render:<screenId>:first-render`.
2. **Screen transition complete.** The host waits for
   `useScreenTransitionComplete` (`app/components/hooks/useScreenTransitionComplete.ts`):
   - It opens on the navigator's `transitionEnd` event. Events with
     `data.closing === true` belong to a screen that is leaving and are
     ignored.
   - If the focused screen never emits `transitionEnd` (initial route,
     animation disabled, non-stack navigator), it opens after
     `SCREEN_TRANSITION_FALLBACK_MS` (**450 ms**). If the screen is no longer
     focused when that timer fires, the gate stays closed and the timer
     re-arms on the next `focus` event.
   - With no navigator (no `NavigationContext` value, or the export is missing
     in a test mock), it opens after the same 450 ms timer, without a focus
     check.
3. **Next animation frame, then idle.** Stage 0 waits for one
   `requestAnimationFrame`, then for `requestIdleCallback` when the runtime
   provides it. Without `requestIdleCallback`, stage 0 mounts on that frame.
4. **Later stages.** With `stages > 1`, each following stage waits one more
   animation frame (no idle wait).
5. **Fallback timeouts.** Each stage arms a backup `setTimeout` when it is
   scheduled, _before_ `requestAnimationFrame`, so content always mounts even
   if a frame or idle callback never runs. Whichever fires first wins and the
   others are cancelled.
   - Stage 0: `DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS` = **250 ms** (covers
     the frame and the idle wait; the same value is passed as the
     `requestIdleCallback` `timeout` option).
   - Each later stage: `DEFERRED_RENDER_FRAME_TIMEOUT_MS` = **100 ms**.
   - `frameTimeoutMs` replaces both values with a single timeout for every
     stage.
6. **Complete.** In an effect after the commit that mounts the last stage's
   children, the host records `deferred-render:<screenId>:complete` and calls
   `onDeferredComplete`. Both happen once per visit, and not at all if the
   visit unmounts first.

Released stages only move forward. Parent re-renders, prop changes (except
`screenId`), and a slot scrolling offscreen and back do not bring the
placeholder back while the host stays mounted. Changing `screenId` starts a
new visit: the released stage resets (to `-1`, or to all stages when
`enabled` is `false`), the gate runs again, and the marks and
`onDeferredComplete` fire again for the new id. On unmount, the pending frame, idle callback, timeout,
and navigation listeners are all cancelled.

### Perf marks

Marks are recorded with `performance.mark` from `react-native-performance`,
two per visit, with no detail payload:

| Moment                           | Mark name                                 | Helper                                    |
| -------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Host first commit                | `deferred-render:<screenId>:first-render` | `deferredRenderFirstRenderMark(screenId)` |
| Last deferred children committed | `deferred-render:<screenId>:complete`     | `deferredRenderCompleteMark(screenId)`    |

`<screenId>` is used unchanged, so pick a stable slug. The span between the
two marks is host first commit to deferred content committed. It does not
include the tap that started navigation; pair it with a `trace()` span
started at navigation when you need tap-to-ready (see "How to measure").

### Why not `InteractionManager`

`InteractionManager.runAfterInteractions` is deprecated in React Native
(since 0.80) and is not used here. The primitive instead composes the three
signals it actually needs: the navigator's transition event, then
`requestAnimationFrame`, then `requestIdleCallback`, each backed by a timeout.

## Usage

Import from the module index:

```tsx
import {
  DeferredPlaceholder,
  DeferredRender,
  DeferredRenderHost,
  useDeferredRender,
} from '../../components/DeferredRender';
```

### `DeferredRender` with its placeholder

Outside a host, `DeferredRender` creates its own single-stage visit and
`screenId` is required (it throws without one). While deferred it renders a
`DeferredPlaceholder` of `estimatedHeight` density-independent pixels.

```tsx
<DeferredRender
  screenId="example-screen"
  estimatedHeight={280}
  onDeferredComplete={() => {
    // once per visit, after the children have committed
  }}
>
  <ExpensiveChart />
</DeferredRender>
```

Props: `estimatedHeight` (required), `children`, `screenId`, `enabled`,
`frameTimeoutMs`, `onDeferredComplete`, `testID` (defaults to
`deferred-render-placeholder-<stage>`), and `stage` (only meaningful inside a
host).

Match `estimatedHeight` to the final layout. A height of `0`, a negative
number, or `NaN` logs a development warning. The placeholder is a plain `View`
with `accessible={false}`, `accessibilityElementsHidden`,
`importantForAccessibility="no-hide-descendants"`, `focusable={false}` and
`pointerEvents="none"`, so it is never read, focused, or tapped.

### `DeferredRenderHost` with staged slots

Use a host when several regions should share one visit, one pair of marks
and one callback. Stage 0 releases after the transition, a frame and idle;
each next stage releases one frame later.

```tsx
<DeferredRenderHost
  screenId="example-screen"
  stages={2}
  onDeferredComplete={handleDeferredReady}
>
  <ScreenHeader />
  <DeferredRender stage={0} estimatedHeight={320}>
    <ExpensiveChart />
  </DeferredRender>
  <DeferredRender stage={1} estimatedHeight={480}>
    <BelowTheFoldSection />
  </DeferredRender>
</DeferredRenderHost>
```

- `stage` must be in `0 .. stages - 1`. A slot at `stages` or above stays on
  its placeholder and logs a development warning. A negative `stage` is
  treated as already released: it renders its children immediately, with no
  warning.
- `stages` defaults to 1 and should stay constant for the visit.
- Inside a host, `screenId`, `enabled`, `frameTimeoutMs` and
  `onDeferredComplete` on a slot are ignored (with a development warning).
  Put them on the host.
- Mount the host with the screen, not inside a virtualized row. Slots may live
  in rows; a row that remounts after release paints its children immediately.

### `useDeferredRender` for a custom branch

The hook takes the same options as the host and returns
`{ releasedStage, isComplete, isStageReady }`. `releasedStage` is `-1` while
everything is deferred; `isStageReady(stage = 0)` is true once that stage is
released.

```tsx
function ExampleSection() {
  const { isStageReady } = useDeferredRender({
    screenId: 'example-screen',
    onDeferredComplete: handleDeferredReady,
  });

  return isStageReady() ? (
    <ExpensiveChart />
  ) : (
    <DeferredPlaceholder height={280} />
  );
}
```

If you render your own placeholder instead of `DeferredPlaceholder`, still
give it the real height and keep it out of the accessibility tree.

### Turning deferral off

`enabled={false}` releases every stage on the first commit and still fires the
complete mark and `onDeferredComplete` once, after that commit. Flipping
`enabled` to `false` while a visit is waiting mounts the remaining stages on
the next commit. Turning it back on never hides content that was already
released.

## When to use

Defer only when a trace shows the deferred work competing with the
navigation push. Typical evidence:

- JS tasks longer than 50 ms inside the push window (from navigation start to
  `transitionEnd`), attributable to mounting the subtree you want to defer.
- Dropped or janky frames during the push animation that disappear when that
  subtree is removed.
- A heavy mount right after the transition (large subtree, WebView or native
  view creation, image decoding) that blocks input or the first paint of the
  critical content.

Also make sure that:

- The user can understand the screen and act on it before the deferred part
  exists.
- You know, or can honestly estimate, the height of the deferred region.

## When NOT to use

- **The gap between data ready and content ready is idle.** If JS busy % is
  low in the data-ready → content-ready gap while you wait for content (a WebView or chart
  library booting, its own fallback timers, native work off the JS thread),
  there is nothing for deferral to unblock.
- **Content renders within tens of milliseconds of its data.** Most of the
  wait is network; content follows data almost immediately. A placeholder
  does not make the response arrive sooner. Fix
  or start the fetch earlier instead.
- **The node is a primary action** (buy, send, swap, confirm, amount entry,
  close). It must be in the first paint and able to take accessibility focus.
- **The node is cheap** (labels, icons, a short list the user needs to
  recognize the screen).
- **You need its layout** to measure the critical content above it.

In these cases deferring only adds latency: the content waits for the
transition, a frame and idle, and in the worst case up to the fallback
timeouts (450 ms for the transition fallback plus 250 ms for stage 0, plus
100 ms per later stage).

## How to measure

Measure before and after wrapping anything:

1. **Add `trace()` spans** from `app/util/trace.ts` (`trace`, `endTrace`,
   `TraceName`, `TraceOperation`): one from navigation start (the tap
   handler) to data ready, and one from navigation start to content ready.
   Use an existing `TraceName` / `TraceOperation` or add one for your screen.
   For deferred content, end the content span in `onDeferredComplete`. The
   built-in `deferred-render:<screenId>:first-render` and
   `deferred-render:<screenId>:complete` marks are still recorded and can be
   read alongside the spans.

   ```tsx
   import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';

   // ExampleScreenLoad / ExampleOp stand for entries you add to the enums.
   // Tap handler
   trace({ name: TraceName.ExampleScreenLoad, op: TraceOperation.ExampleOp });
   navigation.navigate('ExampleScreen');

   // In the screen
   <DeferredRenderHost
     screenId="example-screen"
     onDeferredComplete={() => endTrace({ name: TraceName.ExampleScreenLoad })}
   >
   ```

2. **Run on both platforms**, iOS and Android, with several repetitions per
   variant (with and without `DeferredRender`), on cold and warm visits.
   Ignore runs where content is ready before its data (a cached path).
3. **Look at the push window in a profiler trace** (JS long tasks, frame
   timeline) to confirm the cause matches the "When to use" evidence, and
   compare span durations between variants.
4. **Confirm on a release build.** Simulator and development builds are
   directional only; dev JS overhead and warnings distort both the busy and
   the idle cases.

Keep the change only if the push becomes smoother (fewer long tasks or
dropped frames) without a meaningful increase in the navigation-to-content span.
