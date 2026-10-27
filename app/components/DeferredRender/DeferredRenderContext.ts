import { createContext } from 'react';

/**
 * `true` inside an enabled {@link DeferredRender} subtree. One gate per screen
 * is the rule, because a second gate below the first mounts after the outer
 * release, misses `transitionEnd` and waits for its own 450 ms fallback; the
 * hook warns in development when it sees this set.
 *
 * Lives in its own module so the hook and the wrapper can both read it without
 * importing each other.
 */
export const DeferredRenderContext = createContext(false);
