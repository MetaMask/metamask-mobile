import React, { type ReactNode, useEffect, useRef } from 'react';

import { DeferredRenderContext } from './DeferredRenderContext';
import {
  useDeferredRender,
  type UseDeferredRenderOptions,
} from './useDeferredRender';

/** Props for {@link DeferredRender}. */
export interface DeferredRenderProps extends UseDeferredRenderOptions {
  /**
   * Shown until the children are released. Defaults to `null`, which leaves a
   * gap the released subtree fills. Pass a placeholder that matches the final
   * height to avoid a layout shift.
   */
  placeholder?: ReactNode;
  /** Shown after the transition and one animation frame. */
  children?: ReactNode;
}

/**
 * Renders `placeholder` until {@link useDeferredRender} releases `children`.
 * Passes `mode`, `enabled`, `fallbackMs` and `screenId` through to the hook.
 *
 * While it is enabled, marks the released children through
 * {@link DeferredRenderContext} so a second gate or a bare
 * `useDeferredRender` below them can warn in development. The placeholder
 * stays outside that provider: a gate there mounts with the screen and does
 * not miss `transitionEnd`.
 *
 * @param props - Placeholder, children, and the hook options.
 * @returns The placeholder or the deferred children.
 */
export function DeferredRender({
  enabled,
  mode,
  fallbackMs,
  screenId,
  placeholder = null,
  children = null,
}: DeferredRenderProps) {
  const isReady = useDeferredRender({ enabled, mode, fallbackMs, screenId });
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!__DEV__ || warnedRef.current) {
      return;
    }
    if (placeholder != null || children == null) {
      return;
    }

    warnedRef.current = true;
    console.warn(
      'DeferredRender: gated children have no placeholder. The released subtree will fill a gap and shift layout; pass a placeholder that matches the final height.',
    );
  }, [placeholder, children]);

  if (!isReady) {
    return placeholder;
  }

  return (
    <DeferredRenderContext.Provider value={enabled !== false}>
      {children}
    </DeferredRenderContext.Provider>
  );
}
