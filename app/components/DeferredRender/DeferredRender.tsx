import React, { type ReactNode } from 'react';

import { DeferredRenderContext } from './DeferredRenderContext';
import {
  useDeferredRender,
  type UseDeferredRenderOptions,
} from './useDeferredRender';

/** Props for {@link DeferredRender}. */
export interface DeferredRenderProps extends UseDeferredRenderOptions {
  /** Shown until the children are released. */
  placeholder?: ReactNode;
  /** Shown after the transition and one animation frame. */
  children?: ReactNode;
}

/**
 * Renders `placeholder` until {@link useDeferredRender} releases `children`.
 * Passes `enabled` through to the hook.
 *
 * While it is enabled, marks the released children through
 * {@link DeferredRenderContext} so a second gate or a bare
 * `useDeferredRender` below them can warn in development. The placeholder
 * stays outside that provider: a gate there mounts with the screen and does
 * not miss `transitionEnd`.
 *
 * @param props - Placeholder, children, and `enabled`.
 * @returns The placeholder or the deferred children.
 */
export function DeferredRender({
  enabled,
  placeholder = null,
  children = null,
}: DeferredRenderProps) {
  const isReady = useDeferredRender({ enabled });

  if (!isReady) {
    return placeholder;
  }

  return (
    <DeferredRenderContext.Provider value={enabled !== false}>
      {children}
    </DeferredRenderContext.Provider>
  );
}
