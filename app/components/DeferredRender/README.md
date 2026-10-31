# DeferredRender

Opt-in gate for an expensive subtree. The subtree stays on a placeholder until
the screen's opening transition has finished and one animation frame has run.

`subscribeScreenTransition` owns that transition: a non-closing `transitionEnd`
completes it, and a focused screen that never emits the event opens after
450 ms. The release is a single state flip, so a gate costs exactly one extra
commit. This module does not add another timer and does not use
`InteractionManager`.

## Usage

```tsx
import {
  DeferredRender,
  useDeferredRender,
} from '../../components/DeferredRender';

<DeferredRender placeholder={<ChartSkeleton />}>
  <ExpensiveChart />
</DeferredRender>;

const isReady = useDeferredRender();
```

`enabled={false}` renders the children on the first commit and does not
schedule a frame. The wrapper passes `enabled` through to the hook.

## Rules

- **One gate per screen.** Every gated section releases on the same frame. A
  second gate below the first mounts only after the outer gate releases, so it
  is a late-mounting gate and pays the cost in the next rule. The hook
  `console.warn`s once in development when it mounts inside another gate.
- **The gate mounts unconditionally on the first commit.** Call the hook above
  any early return, and never render the gate behind a condition that flips
  later — a gate that mounts after the transition has already ended waits for
  its 450 ms fallback instead.
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
