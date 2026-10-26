import { createContext } from 'react';

/**
 * `true` inside a {@link DeferredRender} subtree. One gate per screen is the
 * rule, so a second gate below the first only adds a frame; the hook warns in
 * development when it sees this set.
 *
 * Lives in its own module so the hook and the wrapper can both read it without
 * importing each other.
 */
export const DeferredRenderContext = createContext(false);
