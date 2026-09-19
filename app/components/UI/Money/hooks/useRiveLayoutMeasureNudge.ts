import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { RiveViewRef } from '@rive-app/react-native';
import Logger from '../../../../util/Logger';

/** Upper bound on measure nudges so a layout loop cannot run away. */
const MAX_MEASURE_NUDGES = 4;

/** Height held back, in dp, while a measure pass is pending. */
const MEASURE_OFFSET_DP = 1;

/**
 * Ceiling on the wait for the nudges to land. Settling depends on a layout
 * pass that follows the final nudge, so this keeps a callback that never
 * arrives from stranding callers that gate on `isLayoutSettled`.
 */
const SETTLE_TIMEOUT_MS = 2500;

interface UseRiveLayoutMeasureNudgeParams {
  /** Native view methods from `useRive()`; `current` is set synchronously. */
  riveRef: RefObject<RiveViewRef | null>;
  /**
   * Whether the state machine has advanced at least once. Any data-bound value
   * works, since a value can only arrive after the renderer has drawn.
   */
  hasDrawn: boolean;
  /** Delay covering the window and surface settling after the first draw. */
  settleDelayMs: number;
}

interface UseRiveLayoutMeasureNudgeResult {
  /** Subtract from the measured height while a measure pass is pending. */
  heightOffset: number;
  /** Whether the last nudge has been absorbed by a full-size layout pass. */
  isLayoutSettled: boolean;
  /** Pass to the `RiveView` `onLayout` prop. */
  onRiveLayout: (event?: LayoutChangeEvent) => Promise<void>;
}

/**
 * Forces the native measure passes that `Fit.Layout` depends on for sizing.
 *
 * On Android, `resizeArtboard()` sizes the artboard from the renderer's
 * surface, and it only runs on a draw where `requireArtboardResize` is set.
 * That flag is set in exactly one place, `RiveAnimationView.onMeasure()`,
 * which returns early while the renderer is still null — so a view whose only
 * measure pass precedes renderer creation never resizes its artboard, and
 * renders at the authored width with bars either side. Neither `setFit()`,
 * `setLayoutScaleFactor()` nor `play()` sets the flag or requests layout, and
 * the runtime's own `requestLayout()` calls are swallowed by React Native's
 * root view.
 *
 * The only lever left from JS is a real change to the view's layout size,
 * because `View.measure()` short-circuits when the measure specs are
 * unchanged. Holding 1dp back and then restoring it is that change; the
 * resulting layout callback issues the draw that consumes the flag.
 *
 * Readiness alone is not a late enough trigger: `awaitViewReady()` resolves
 * inside the view's `configure()`, which can land before the surface exists,
 * and `onSurfaceTextureSizeChanged` rebuilds the surface without re-flagging
 * the resize. So the nudge repeats once the state machine has provably drawn,
 * and once more after the window settles.
 */
export function useRiveLayoutMeasureNudge({
  riveRef,
  hasDrawn,
  settleDelayMs,
}: UseRiveLayoutMeasureNudgeParams): UseRiveLayoutMeasureNudgeResult {
  const [isMeasureOffsetApplied, setIsMeasureOffsetApplied] = useState(true);
  const [isLayoutSettled, setIsLayoutSettled] = useState(false);
  const isViewReadyRef = useRef(false);
  const nudgeCountRef = useRef(0);
  const hasNudgedAfterFirstDrawRef = useRef(false);
  const isFinalNudgeIssuedRef = useRef(false);

  const nudgeMeasure = useCallback(() => {
    if (nudgeCountRef.current >= MAX_MEASURE_NUDGES) {
      return;
    }

    nudgeCountRef.current += 1;
    setIsMeasureOffsetApplied(true);
  }, []);

  const onRiveLayout = useCallback(
    async (event?: LayoutChangeEvent) => {
      const riveView = riveRef.current;
      if (!riveView) {
        return;
      }

      if (__DEV__) {
        Logger.log('Rive layout pass', {
          layout: event?.nativeEvent?.layout,
          isMeasureOffsetApplied,
          nudgeCount: nudgeCountRef.current,
        });
      }

      if (!isViewReadyRef.current) {
        await riveView.awaitViewReady();
        isViewReadyRef.current = true;
      }

      if (isMeasureOffsetApplied) {
        setIsMeasureOffsetApplied(false);
        return;
      }

      // Full-size layout has landed, so this draw consumes the flagged resize.
      riveView.playIfNeeded();

      // No nudge is left to shrink the view again, so this is the final size.
      if (isFinalNudgeIssuedRef.current) {
        setIsLayoutSettled(true);
      }
    },
    [isMeasureOffsetApplied, riveRef],
  );

  useEffect(() => {
    if (!hasDrawn || hasNudgedAfterFirstDrawRef.current) {
      return undefined;
    }

    hasNudgedAfterFirstDrawRef.current = true;
    nudgeMeasure();
    const timeoutId = setTimeout(() => {
      isFinalNudgeIssuedRef.current = true;
      nudgeMeasure();
    }, settleDelayMs);

    return () => clearTimeout(timeoutId);
  }, [hasDrawn, nudgeMeasure, settleDelayMs]);

  useEffect(() => {
    if (isLayoutSettled) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      Logger.error(
        new Error(
          `useRiveLayoutMeasureNudge: measure nudges did not settle within ${SETTLE_TIMEOUT_MS}ms`,
        ),
      );
      setIsLayoutSettled(true);
    }, SETTLE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [isLayoutSettled]);

  return {
    heightOffset: isMeasureOffsetApplied ? MEASURE_OFFSET_DP : 0,
    isLayoutSettled,
    onRiveLayout,
  };
}
