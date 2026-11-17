import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { AppStackNavigationProp } from '../../core/NavigationService/types';
import { endTrace, TraceName, TraceOperation, trace } from '../../util/trace';
import { subscribeScreenTransition } from './subscribeScreenTransition';

/** Options for {@link useScreenTransitionMeasure}. */
export interface UseScreenTransitionMeasureOptions {
  /** Sentry tag for the screen. Pass the route name. */
  screenId: string;
  /**
   * Flips true once the screen's gated content has committed. Lets the span
   * record whether the content landed inside or after the opening transition.
   * @default true
   */
  contentReady?: boolean;
  /** @default true */
  enabled?: boolean;
}

/**
 * Records how long the screen's opening transition took and how much later its
 * content committed. Pair it with {@link useDeferredRender} to see the benefit
 * of deferring a subtree: `content_ready_before_transition_end` is `true` when
 * the content mounts eagerly, and `false` with a positive
 * `content_ready_after_transition_ms` when the gate moved the mount out of the
 * transition.
 *
 * Emits one `Screen Transition` span per mount, once both the transition has
 * ended and the content is ready. Reuses the same `transitionEnd`-or-fallback
 * subscription as the gate, so both agree on when the transition ended.
 *
 * @param options - Screen id, content readiness, and an enable switch.
 */
export function useScreenTransitionMeasure({
  screenId,
  contentReady = true,
  enabled = true,
}: UseScreenTransitionMeasureOptions): void {
  const navigation = useNavigation<AppStackNavigationProp>();
  const mountAtRef = useRef(Date.now());
  const transitionMsRef = useRef<number | undefined>(undefined);
  const contentReadyMsRef = useRef<number | undefined>(
    contentReady ? 0 : undefined,
  );
  const endedRef = useRef(false);
  const traceIdRef = useRef(uuidv4());

  const finishIfComplete = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    const transitionMs = transitionMsRef.current;
    const contentReadyMs = contentReadyMsRef.current;
    if (transitionMs === undefined || contentReadyMs === undefined) {
      return;
    }

    endedRef.current = true;
    endTrace({
      name: TraceName.ScreenTransition,
      id: traceIdRef.current,
      data: {
        screen_id: screenId,
        transition_ms: transitionMs,
        content_ready_ms: contentReadyMs,
        content_ready_before_transition_end: contentReadyMs <= transitionMs,
        content_ready_after_transition_ms: Math.max(
          0,
          contentReadyMs - transitionMs,
        ),
      },
    });
  }, [screenId]);

  useEffect(() => {
    if (!enabled || !contentReady || contentReadyMsRef.current !== undefined) {
      return;
    }

    contentReadyMsRef.current = Date.now() - mountAtRef.current;
    finishIfComplete();
  }, [contentReady, enabled, finishIfComplete]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    traceIdRef.current = uuidv4();
    endedRef.current = false;
    trace({
      name: TraceName.ScreenTransition,
      op: TraceOperation.ScreenTransition,
      id: traceIdRef.current,
      tags: { screen_id: screenId },
    });

    return subscribeScreenTransition(navigation, () => {
      if (transitionMsRef.current !== undefined) {
        return;
      }
      transitionMsRef.current = Date.now() - mountAtRef.current;
      finishIfComplete();
    });
  }, [enabled, finishIfComplete, navigation, screenId]);

  useEffect(
    () => () => {
      if (endedRef.current) {
        return;
      }
      endedRef.current = true;
      endTrace({
        name: TraceName.ScreenTransition,
        id: traceIdRef.current,
        data: { screen_id: screenId, success: false, reason: 'unmounted' },
      });
    },
    [screenId],
  );
}
