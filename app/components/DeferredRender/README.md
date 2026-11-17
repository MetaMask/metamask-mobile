# DeferredRender

Opt-in gate for an expensive subtree. The subtree stays on a placeholder until
the gate releases, then mounts in a single commit.

Two scheduling modes:

- `transition` (default) — releases one animation frame after the screen's
  opening transition. Use it for pushed screens.
- `paint` — releases one animation frame after mount. Use it where there is no
  entering transition to protect: tab switches, modals, and screens pushed with
  `animation: 'none'`.

`subscribeScreenTransition` owns the transition: a non-closing `transitionEnd`
completes it, and a focused screen that never emits the event opens after
`fallbackMs` (450 ms by default). The release runs inside `startTransition`, so
the deferred mount is interruptible and cannot block a tap. The release is a
single state flip, so a gate costs exactly one extra commit. This module does
not add another timer and does not use `InteractionManager`.

## Usage

```tsx
import {
  DeferredRender,
  useDeferredRender,
} from '../../components/DeferredRender';

<DeferredRender placeholder={<ChartSkeleton />}>
  <ExpensiveChart />
</DeferredRender>;

// Tab, modal, or `animation: 'none'` screen:
<DeferredRender mode="paint" placeholder={<ChartSkeleton />}>
  <ExpensiveChart />
</DeferredRender>;

const isReady = useDeferredRender({ screenId: 'TokenDetails' });
```

`enabled={false}` renders the children on the first commit and does not
schedule a frame. `fallbackMs` overrides the safety net for `transition` mode.
`screenId` tags the release span.

## Release span

Each enabled gate emits one `Deferred Render Release` span, from the gate's
mount until the deferred children have committed. Filter by `screen_id` and
`mode` in Sentry to see how long the placeholder was visible and whether the
gate moved work off the push.

Pair it with `useScreenTransitionMeasure` (`app/components/hooks/`) to compare a
gated screen against the same screen mounted eagerly. That hook emits one
`Screen Transition` span per mount with `transition_ms`, `content_ready_ms` and
`content_ready_before_transition_end`, using the same subscription so both agree
on when the transition ended.

## Rules

- **One gate per screen.** Every gated section releases on the same frame. A
  second gate below the first mounts only after the outer gate releases, so it
  is a late-mounting gate and pays the cost in the next rule. The hook
  `console.warn`s once in development when it mounts inside another gate.
- **Always pass a placeholder.** A gate without one leaves a gap the released
  subtree fills, which shifts layout. The wrapper `console.warn`s once in
  development. Match the final height.
- **The gate mounts unconditionally on the first commit.** Call the hook above
  any early return, and never render the gate behind a condition that flips
  later — a gate that mounts after the transition has already ended waits for
  its fallback instead.
- **In hook form, gate data, not `loading`.** Swap the rows, the list data or
  the header for an empty constant while `isReady` is `false`, and leave the
  component's own `loading` prop alone: flipping `loading` makes the child tear
  down and rebuild the subtree it was supposed to keep.

## Known gaps

The nesting warning reads a React context, so it only sees a gate that sits
below another gate's subtree. It does not catch:

- a `<DeferredRender>` under a screen that is itself gated through the hook
  form, because the hook publishes no context;
- two sibling gates on the same screen, which is the common way the one-gate
  rule is broken.

## When to use

Defer only when that subtree's render competes with the push transition and
its data is already ready. Do not defer a network wait, a primary action, or
a cheap node. If the JS thread is already idle, deferral only adds latency.
