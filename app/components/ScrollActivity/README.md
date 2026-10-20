# Scroll activity

Wrap heavy sections of a screen `ScrollView` so each one is `active` in the viewport, `paused` in a nearby margin, or `dormant` beyond that margin. Dormant sections unmount and keep a height placeholder. Declared UI state survives that unmount.

Long homogeneous lists stay on `FlashList`. Do not replace them with activity slots.

## Adoption

1. Use `ActivityScrollView` as the screen scroll container. It forwards `ScrollView` props, composes `onScroll`, and defaults `scrollEventThrottle` to `16` when the caller omits it.
2. Put an `ActivitySlot` with a stable `id` around each heavy section. Each slot is one direct child of the scroll content.
3. Pass `estimatedHeight` for every below-fold slot. A valid estimate keeps those children from mounting on the first render.
4. Gate polling, chart updates, animations, and other continuous work with `phase === 'active'`.
5. Store UI state that must survive dormancy in `useActivityState`.
6. Leave sticky headers outside slots.

```tsx
<ActivityScrollView>
  <ActivitySlot id="chart" estimatedHeight={280}>
    {({ phase }) => <Chart active={phase === 'active'} />}
  </ActivitySlot>
</ActivityScrollView>
```

`useActivityPhase()` returns the same phase from a child that is not the slot's render function.

A screen that already uses an animated `ScrollView` keeps that container. Call `useActivityScrollHost()`, wrap the scroll content in `ActivityScrollProvider`, set `innerViewRef` to the host content ref, and report each scroll offset with `reportScroll`. Gate the heavy child with `phase === 'active'`.

## Phases

| Phase     | Meaning                                                          | What stays mounted                                                               |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `active`  | The slot intersects the viewport.                                | Children. Continuous work may run.                                               |
| `paused`  | The slot is outside the viewport and inside the hardware margin. | Children. Continuous work stops only when the child checks `phase === 'active'`. |
| `dormant` | The slot is outside that margin.                                 | A plain `View` placeholder. Children unmount.                                    |

The placeholder height is the last measured height, or `estimatedHeight` before the first measurement.

Position before measurement is the sum of the slots above. Use a measured height when one exists, otherwise that slot's `estimatedHeight`. A slot can start dormant from that estimate only when every slot above it has a measured height or an `estimatedHeight`. Otherwise it stays mounted until the missing height exists. A slot with no `estimatedHeight` stays mounted until its own first measurement. Until the scroll view reports a viewport height, a slot with a valid estimate and a top greater than 0 starts dormant. The viewport measurement then applies the phase rules.

Leaving a phase requires the slot to pass that boundary by 32dp. Re-entering uses the raw boundary.

Layout is measured when the slot lays out, not on every scroll frame. A failed measurement keeps the last height. A scroll event updates a slot only when its phase or placeholder height changes.

## Hardware margins

`ActivityScrollView` reads `getHardwareTier()` once when it mounts.

| Tier             | Margin          |
| ---------------- | --------------- |
| `LOW`            | `0`             |
| `MID` and `null` | half a viewport |
| `HIGH`           | one viewport    |

`null` is unknown hardware, not `LOW`. The network tier does not change the phase. Keep using `useNetworkTier()` for fetch and prefetch decisions. Do not infer a tier from iOS simulator RAM.

## Sticky headers

Sticky headers stay outside slots. In development, a slot whose index is listed in `stickyHeaderIndices` logs a warning and stays mounted.

A duplicate `id` logs a development warning. The first registration wins. The duplicate stays mounted and does not join the registry.

## Persistence

`useActivityState(key, initialValue)` stores JSON-serializable UI state for the screen lifetime. Examples: selected period, tab, expansion flag, inner scroll offset. The registry is process memory. It is not Redux state. It is discarded when `ActivityScrollView` unmounts.

The store replaces the value for that key. It does not deep-merge.

Do not put secrets, keys, credentials, or remote payloads in it. Remote data stays in React Query, controllers, or Redux. Undeclared `useState` is lost when a dormant slot unmounts its children.

`useActivityPhase` and `useActivityState` throw when there is no `ActivityScrollView` or no `ActivitySlot`.

## FlashList

Use `FlashList` for a long homogeneous list. Use activity slots for a short sequence of large, different sections. A `FlashList` rendered inside a slot unmounts with that slot.

## Screen focus

This primitive does not pause a screen that is blurred but still mounted. Keep the screen's existing focus hooks.
