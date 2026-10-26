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
 * Marks its subtree through {@link DeferredRenderContext} so a second gate or
 * a bare `useDeferredRender` below it can warn in development.
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

  return (
    <DeferredRenderContext.Provider value>
      {isReady ? children : placeholder}
    </DeferredRenderContext.Provider>
  );
}
