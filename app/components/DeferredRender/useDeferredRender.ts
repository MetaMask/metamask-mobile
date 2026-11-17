import { useNavigation } from '@react-navigation/native';
import {
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { AppStackNavigationProp } from '../../core/NavigationService/types';
import { endTrace, TraceName, TraceOperation, trace } from '../../util/trace';
import { subscribeScreenTransition } from '../hooks/subscribeScreenTransition';
import { DeferredRenderContext } from './DeferredRenderContext';

/**
 * Which signal releases the deferred subtree.
 *
 * - `transition` waits for the screen's opening animation (pushed screens).
 * - `paint` releases one frame after mount. Use it where there is no entering
 *   transition to protect: tab switches, modals, and screens pushed with
 *   `animation: 'none'`.
 */
export type DeferredRenderMode = 'transition' | 'paint';

/** Options for {@link useDeferredRender}. */
export interface UseDeferredRenderOptions {
  /**
   * When `false`, return `true` immediately and schedule nothing.
   * @default true
   */
  enabled?: boolean;
  /** @default 'transition' */
  mode?: DeferredRenderMode;
  /**
   * Override the `transition` mode safety net. Ignored by `paint`.
   * @default 450
   */
  fallbackMs?: number;
  /** Sentry tag on the release span. Pass the route name. */
  screenId?: string;
}

/**
 * Returns `true` once the gate releases: one `requestAnimationFrame` after the
 * screen's enter transition (`mode: 'transition'`), or one frame after mount
 * (`mode: 'paint'`). The released value is the hook's only state, so a gated
 * subtree costs exactly one extra commit. Adds no timer of its own and does not
 * use `InteractionManager`.
 *
 * The release runs inside `startTransition`, so the deferred mount is
 * interruptible and cannot block a tap that lands while it renders.
 *
 * Once this hook has returned `true`, it keeps returning `true` for this
 * component's lifetime. `enabled` changing from `false` to `true` does not
 * drop back to `false` for a frame.
 *
 * @param options - Mode, `enabled`, fallback override, and `screenId`.
 * @returns Whether deferred content may render.
 */
export function useDeferredRender({
  enabled = true,
  mode = 'transition',
  fallbackMs,
  screenId,
}: UseDeferredRenderOptions = {}): boolean {
  const navigation = useNavigation<AppStackNavigationProp>();
  const [isReleased, setIsReleased] = useState(() => !enabled);
  const isNested = useContext(DeferredRenderContext);
  const warnedRef = useRef(false);
  const traceIdRef = useRef(uuidv4());
  const traceOpenRef = useRef(false);

  // Latch a gate that is disabled after mount, so flipping `enabled` back to
  // true cannot re-gate a subtree that is already mounted.
  useEffect(() => {
    if (!enabled) {
      setIsReleased(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!__DEV__ || !isNested || warnedRef.current) {
      return;
    }

    warnedRef.current = true;
    console.warn(
      'DeferredRender: a gate is already deferring this subtree. Use one gate per screen; a nested gate mounts after the outer release, misses transitionEnd and waits for the fallback.',
    );
  }, [isNested]);

  useLayoutEffect(() => {
    if (isReleased || !enabled) {
      return undefined;
    }

    let released = false;
    let frameId: number | undefined;

    const release = () => {
      if (released) {
        return;
      }
      released = true;
      frameId = requestAnimationFrame(() => {
        startTransition(() => {
          setIsReleased(true);
        });
      });
    };

    if (mode === 'paint') {
      release();
      return () => {
        if (frameId !== undefined) {
          cancelAnimationFrame(frameId);
        }
      };
    }

    const unsubscribe = subscribeScreenTransition(navigation, release, {
      fallbackMs,
    });

    return () => {
      unsubscribe();
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [enabled, fallbackMs, isReleased, mode, navigation]);

  // Release span: mount of the gate until the deferred children have committed.
  useEffect(() => {
    if (!enabled || traceOpenRef.current) {
      return;
    }

    traceIdRef.current = uuidv4();
    trace({
      name: TraceName.DeferredRenderRelease,
      op: TraceOperation.DeferredRender,
      id: traceIdRef.current,
      tags: {
        mode,
        ...(screenId === undefined ? {} : { screen_id: screenId }),
      },
    });
    traceOpenRef.current = true;
  }, [enabled, mode, screenId]);

  useEffect(() => {
    if (!enabled || !isReleased || !traceOpenRef.current) {
      return;
    }

    endTrace({
      name: TraceName.DeferredRenderRelease,
      id: traceIdRef.current,
      data: {
        success: true,
        mode,
        ...(screenId === undefined ? {} : { screen_id: screenId }),
      },
    });
    traceOpenRef.current = false;
  }, [enabled, isReleased, mode, screenId]);

  useEffect(
    () => () => {
      if (!traceOpenRef.current) {
        return;
      }

      endTrace({
        name: TraceName.DeferredRenderRelease,
        id: traceIdRef.current,
        data: { success: false, reason: 'unmounted' },
      });
      traceOpenRef.current = false;
    },
    [],
  );

  return isReleased || !enabled;
}
