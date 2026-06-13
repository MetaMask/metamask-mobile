# Performance anti-patterns

The high-impact patterns we see on MetaMask Mobile, at the conceptual level. Each entry is _what it is → why it matters → ✅/❌ → how to find it_. For the codebase-verified instances (with `file:line`) and fix recipes, use the `mms-performance` skill.

> **Severity is amplified by scale.** A pattern that's invisible with 2 accounts can stall the app with 30. Always re-test under the [power-user scenario](./measuring.md).

## Selector memoization

A `createSelector` whose result function returns a **new collection every call** — an identity passthrough, a `.sort()`/mutation, or `Object.values()/.map()/.filter()/new Set/?? {}` without a stable equality — hands a new reference to every consumer on every dispatch, cascading re-renders through dozens of components.

- ❌ `createSelector(s => s.x, x => x)` · `(items) => items.sort(...)` · `(s) => s.thing ?? {}`
- ✅ Add a real transformation; copy before sorting (`[...items].sort`); use `createDeepEqualSelector` (from `app/selectors/util.ts`) when inputs churn; a stable module-level constant for the empty case.
- **Find:** `rg "createSelector\(" app/selectors` then read each result function for new-collection/mutation/identity.

## Redux & `useSelector`

- **`useSelector(x, isEqual)` band-aid** — lodash deep-equality on every dispatch is the _symptom_ of a selector that returns new refs. Fix the selector, then drop `isEqual`.
- **Inline `useSelector(state => state.x.y)`** — no memoization, no reuse; use a named selector.
- **Real-time / high-frequency data in Redux** — every dispatch flows through the whole store. Keep transient/live data in local state (`useState`/`useRef`) or a stream manager; write to Redux only to persist. **Do not** add a new state library — Redux is the committed architecture.
- **Find:** `rg "useSelector.*(isEqual|\(state)" app`

## Context provider with an inline value

`<Ctx.Provider value={{ ... }}>` creates a new object every parent render → **every consumer re-renders** regardless of change.

- ✅ `const value = useMemo(() => ({ ... }), [deps])`; for animated values, prefer a Reanimated shared value over plumbing through Context.
- **Find:** `rg "Provider value=\{\{" app`

## Hook dependency arrays

`JSON.stringify(obj)` inside a `useEffect`/`useMemo`/`useCallback` dependency array runs an expensive serialize **every render** just to compute the key — and signals an unstable upstream reference.

- ✅ Stabilize the reference upstream with `useMemo`, then depend on it directly.
- Note: `react-hooks/exhaustive-deps` is **not** enabled in this repo — review deps by hand.
- **Find:** `rg "\[JSON\.stringify|, JSON\.stringify" app`

## Unstable hook return values

A custom hook that builds an array/object/function inline and returns it **without `useMemo`/`useCallback`** defeats every downstream memo — the non-Redux twin of a broken selector. Watch also for render-phase `setState`/side-effects and `reduce`-with-spread (O(n²)).

- ✅ `useMemo` the hook's computed return; `React.memo` the consuming rows with stable keys.
- **Find:** read each custom hook's `return` — is a non-primitive built inline and unwrapped?

## Lists

Use **FlashList v2** for anything that can grow; `ScrollView + .map()` renders everything at once.

- Stable `keyExtractor` (unique id, not index); `getItemType` for mixed item shapes; lightweight item components.
- ❌ flagging missing `estimatedItemSize` — it's **deprecated** in v2.
- **Find:** `rg "<ScrollView|<FlatList" app` then check growable lists.

## Layout animations on the JS thread

The legacy `Animated` API can't use the native driver for layout props (`width`/`height`/`flex`), forcing `useNativeDriver: false` → the animation runs on the JS thread and stutters when JS is busy.

- ✅ Reanimated **v3** (`useSharedValue` + `useAnimatedStyle`) animates layout on the UI thread; or animate a `transform` (`scaleX`) instead of `width`. See [animations.md](../readme/animations.md).
- **Find:** `rg "useNativeDriver:\s*false" app` → flag the ones animating layout props.

## Eager / redundant work on mount

The most common "opening a screen is slow" cause: pagers/tabs/carousels mounting **all** children, a fetch hook running for **all N** tabs when only one is visible, or a request waterfall — all on the mount tick.

- ✅ Gate offscreen fetches (`enabled: isActive || hasEverBeenActive`); lazy-mount pager pages; `Promise.all` independent fetches.
- ⚠️ A per-row hook backed by a **shared subscription** is fine — don't gate it (see streaming).
- **Find:** look for fetch hooks rendered per-tab/item and an `enabled` prop that exists but isn't wired.

## Real-time / streaming data

Cost lives in the subscription/stream layer, not the render code. Watch for: N per-subscriber subscriptions instead of one shared; a per-subscriber initial snapshot that copies the whole dataset; missing throttling; `key={filter}` remounting a list and tearing down all subscribers. "Slow to open" here is usually a **warm-vs-cold cache** lifecycle, not a render bug.

- ✅ One shared subscription + throttle + prewarm; seed only the requested keys; filter data instead of remounting the list.
- **Find:** trace each per-item subscription hook into its manager before flagging it.

## Bundle & app size

- **Barrel exports** (`export * from './index'`) aren't tree-shaken by Metro — importing one symbol evaluates the whole barrel at startup. Prefer direct imports.
- **lodash main-package imports** (`from 'lodash'`) ship more than needed — use `lodash/method` submodule paths or native equivalents.
- Avoid duplicate libraries (e.g. two date libs).
- **Find:** `rg "export \* from" app` · `rg "from 'lodash'" app`

## Memory leaks

Every `addEventListener`/`setInterval`/`subscribe`/`AppState.addEventListener` needs a matching cleanup (`return () => …`, `.remove()`, `clearInterval`, `unsubscribe`). Missing cleanup leaks listeners and fires work after unmount.

- **Find:** `rg "addEventListener|setInterval|\.subscribe\(" app` and confirm each has cleanup.

---

For fix recipes, verified instances, and Profiler-confirmation steps, see the `mms-performance` skill or [tools.md](./tools.md).
