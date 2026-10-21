import React, { createContext, useContext, useRef } from 'react';

import { deferredRenderPlaceholderTestId } from './constants';
import { DeferredPlaceholder } from './DeferredPlaceholder';
import type {
  DeferredRenderHostProps,
  DeferredRenderProps,
  UseDeferredRenderResult,
} from './types';
import { useDeferredRender } from './useDeferredRender';

const DeferredRenderContext = createContext<UseDeferredRenderResult | null>(
  null,
);

/**
 * Owns one deferred-render visit for a screen. Mount this with the screen
 * and leave it mounted across scroll, so slots that unmount below the fold
 * come back already released.
 */
export function DeferredRenderHost({
  children,
  ...options
}: DeferredRenderHostProps) {
  const value = useDeferredRender(options);
  return (
    <DeferredRenderContext.Provider value={value}>
      {children}
    </DeferredRenderContext.Provider>
  );
}

interface DeferredRenderSlotProps {
  stage: number;
  estimatedHeight: number;
  testID?: string;
  children: DeferredRenderProps['children'];
}

/** Rendered by `DeferredRender`. Exported so the missing-host guard can be tested. */
export function DeferredRenderSlot({
  stage,
  estimatedHeight,
  testID,
  children,
}: DeferredRenderSlotProps) {
  const host = useContext(DeferredRenderContext);
  if (!host) {
    throw new Error('DeferredRender slot rendered outside DeferredRenderHost');
  }

  if (host.isStageReady(stage)) {
    return <>{children}</>;
  }

  return (
    <DeferredPlaceholder
      height={estimatedHeight}
      testID={testID ?? deferredRenderPlaceholderTestId(stage)}
    />
  );
}

/**
 * Renders `children` after the screen visit releases `stage`.
 *
 * Outside a host, this creates a single-stage visit and `screenId` is
 * required. Inside a host, `stage` selects which frame reveals the children
 * and the host owns the callback and the marks.
 */
export function DeferredRender({
  stage = 0,
  estimatedHeight,
  children,
  testID,
  screenId,
  enabled,
  frameTimeoutMs,
  onDeferredComplete,
}: DeferredRenderProps) {
  const host = useContext(DeferredRenderContext);
  const warnedIgnoredHostPropsRef = useRef(false);

  if (
    __DEV__ &&
    host &&
    !warnedIgnoredHostPropsRef.current &&
    (screenId !== undefined ||
      enabled !== undefined ||
      frameTimeoutMs !== undefined ||
      onDeferredComplete !== undefined)
  ) {
    warnedIgnoredHostPropsRef.current = true;
    console.warn(
      'DeferredRender ignores screenId, enabled, and onDeferredComplete inside DeferredRenderHost. Pass them to the host.',
    );
  }

  if (!host) {
    if (!screenId) {
      throw new Error(
        'DeferredRender requires screenId when rendered outside DeferredRenderHost',
      );
    }

    return (
      <DeferredRenderHost
        screenId={screenId}
        enabled={enabled}
        frameTimeoutMs={frameTimeoutMs}
        onDeferredComplete={onDeferredComplete}
      >
        <DeferredRenderSlot
          stage={0}
          estimatedHeight={estimatedHeight}
          testID={testID}
        >
          {children}
        </DeferredRenderSlot>
      </DeferredRenderHost>
    );
  }

  return (
    <DeferredRenderSlot
      stage={stage}
      estimatedHeight={estimatedHeight}
      testID={testID}
    >
      {children}
    </DeferredRenderSlot>
  );
}
