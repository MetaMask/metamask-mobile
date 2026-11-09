# Off-screen sections and scoped live updates

A long scroll screen whose **root** subscribes to live data (price streams, candles, polling) re-renders **every section** on every tick, including the ones the user cannot see. Two changes fix it, and they only pay off **together**:

1. **Scope live data to the section that renders it**, so a tick re-renders a leaf, not the screen.
2. **Unmount and pause sections far from the viewport** with `ViewportLifecycle`, so off-screen sections stop rendering and stop their work.

Measured on `PerpsMarketDetailsView`: one iPhone, dev client, Perf Monitor, BTC, no open position, idle about 30 seconds. Re-render rates come from a temporary counter used during the investigation and removed before this change.

| Version                 | Chart on screen                    | Scrolled to the bottom                | Screen root re-renders   |
| ----------------------- | ---------------------------------- | ------------------------------------- | ------------------------ |
| Baseline                | drops to 0, oscillates below 30    | same                                  | ~2.8/s                   |
| Unmount off-screen only | drops to 2–3                       | 31–46                                 | ~2.8/s                   |
| Scoped live data only   | 20–30, drops to 9                  | same, because the candles never pause | ~2.5–2.8/s               |
| Both                    | usually 43–53, rare drops below 30 | 54–60, occasional ~37                 | ~0.6–0.9/s at the bottom |

Unmounting alone leaves the streams in the root, which keeps redrawing the screen. Scoping alone leaves the chart mounted and streaming everywhere on the page.

## When to apply

Apply only when **all** of these hold:

- The screen is a long `ScrollView` of heterogeneous sections, not a list. `FlatList` / `FlashList` already virtualize — use them for homogeneous rows.
- At least one section owns live work: a stream subscription, polling, a chart, a looping animation.
- A measurement shows the cost: JS FPS drops while idle, or the screen root re-renders on each tick (React DevTools Profiler, or a temporary render counter).

Do **not** apply to short screens, static sections, or above-the-fold content. Without a before/after measurement on a device — with the live section on screen **and** scrolled away — do not ship it.

## 1. Scope live data to the leaf

Move each live hook out of the screen root and into the component that renders its value.

- **Render values in a leaf.** A small component owns the subscription and renders the value (or calls a render prop), so only that subtree re-renders.

  ```tsx
  <PerpsLiveCurrentPrice symbol={symbol}>
    {(price) => <PerpsMarketSummary currentPrice={price} />}
  </PerpsLiveCurrentPrice>
  ```

- **Handlers read a ref.** Press handlers (navigate, share) need the latest value, not a re-render. A render-less leaf reports each value through a stable callback that writes a ref.
- **Report primitives to the parent.** When the root needs a derived fact (loading / content / error for analytics), the leaf reports a string or boolean through a callback into `useState`. React skips the update when the primitive is unchanged.
- **Bail out of equal ticks in the hook.** A stream hook should return the previous reference when a tick repeats the same values (`setState((previous) => (unchanged ? previous : next))`), so consumers do not re-render on heartbeats.

Keep a live hook in the root only when the root itself must react to every value (for example, a banner whose visibility depends on the live price). Gate it with `enabled` so it only runs when that condition can apply.

## 2. Unmount and pause off-screen

`app/components/UI/ViewportLifecycle` exposes `ScrollViewportProvider`, `ViewportLifecycle` and `publishViewportTarget`.

```tsx
const publishViewportRef = useRef<ViewportPublisher | null>(null);

<ScrollViewportProvider publishRef={publishViewportRef}>
  <ScrollView
    ref={scrollViewRef}
    onScroll={() =>
      publishViewportTarget(publishViewportRef, scrollViewRef.current)
    }
    onLayout={() =>
      publishViewportTarget(publishViewportRef, scrollViewRef.current, {
        force: true,
      })
    }
  >
    <AboveTheFold />
    <ViewportLifecycle
      mode="unmount-when-far"
      preloadMargin={200}
      placeholderHeight={280}
      onVisible={handleChartVisible}
      onHidden={handleChartHidden}
    >
      <Chart />
    </ViewportLifecycle>
    <ViewportLifecycle
      mode="unmount-when-far"
      initiallyMounted={false}
      placeholderHeight={220}
    >
      <BelowTheFold />
    </ViewportLifecycle>
  </ScrollView>
</ScrollViewportProvider>;
```

- `mode="unmount-when-far"` unmounts children outside the viewport plus `preloadMargin`, keeping a placeholder of the last measured height so scroll position does not jump.
- **Unmounting removes UI, not work owned elsewhere.** If the root owns the subscription that feeds a section, pause it from `onHidden` / `onVisible` (for example, an `enabled` flag on the stream hook).
- `initiallyMounted={false}` only for sections below the fold. Sections visible on first paint keep the default, or they flash as a placeholder.
- `publishViewportTarget` throttles to one measurement per 100 ms and does nothing without a provider.

## Testing

Jest never produces a viewport measurement, so lazily mounted sections stay unmounted in screen tests. Mock `ViewportLifecycle` as a pass-through in those tests; the lifecycle itself is covered by `ViewportLifecycle.test.tsx` and `ViewportLifecycle.perf-test.tsx`.

```tsx
jest.mock('../../../ViewportLifecycle', () => ({
  ...jest.requireActual('../../../ViewportLifecycle'),
  ViewportLifecycle: ({ children }: { children: React.ReactNode }) => children,
}));
```
