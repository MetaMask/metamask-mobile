# DeferredRender

Opt-in gate for an expensive subtree. The subtree stays on a placeholder until
the screen's opening transition has finished and one animation frame has run.

`useScreenTransitionComplete` owns that transition: a non-closing
`transitionEnd` completes it, and a focused screen that never emits the event
opens after 450 ms. This module does not add another timer and does not use
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

## When to use

Defer only when that subtree's render competes with the push transition and
its data is already ready. Do not defer a network wait, a primary action, or
a cheap node. If the JS thread is already idle, deferral only adds latency.
