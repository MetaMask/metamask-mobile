import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { useReduceMotionState } from '../../Money/hooks/useReduceMotion';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';

const RISE_PX = 10;
/** Lets the title land mid-draw of the tick. */
const LEAD_MS = AnimationDuration.Regularly;
const STAGGER_MS = 80;
const DURATION_MS = AnimationDuration.Regularly;
/** The Rive load is unbounded, so the copy never waits longer than this. */
export const VERIFIED_SUCCESS_ENTRANCE_TIMEOUT_MS = 2000;

/** `pending` until Reduce Motion resolves, so the first paint never flashes. */
export type VerifiedSuccessMode = 'pending' | 'animate' | 'static';

const useEntranceStyle = (step: number, isShown: boolean, animate: boolean) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!isShown) {
      return;
    }
    progress.value = animate
      ? withDelay(
          LEAD_MS + step * STAGGER_MS,
          withTiming(1, {
            duration: DURATION_MS,
            easing: Easing.out(Easing.cubic),
          }),
        )
      : 1;
  }, [animate, isShown, progress, step]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_PX }],
  }));
};

/**
 * Verified success entrance: once the tick starts, the title, description and
 * button fade and rise in one after another. Everything shows at once under
 * Reduce Motion, with no network, or on a low-end phone on slow cellular.
 */
const useVerifiedSuccessCascade = () => {
  const reduceMotion = useReduceMotionState();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const [hasEntranceStarted, setHasEntranceStarted] = useState(false);
  const [isButtonReady, setIsButtonReady] = useState(false);
  const startEntrance = useCallback(() => setHasEntranceStarted(true), []);

  let mode: VerifiedSuccessMode = 'animate';
  if (reduceMotion === null) {
    mode = 'pending';
  } else if (
    reduceMotion ||
    networkTier === 'NONE' ||
    (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR')
  ) {
    mode = 'static';
  }

  // A screen that already showed the static layout stays that way if the
  // network comes back. Otherwise Continue is visible and not tappable.
  const showedStatic = useRef(false);
  if (mode === 'static') {
    showedStatic.current = true;
  }
  const playCascade = mode === 'animate' && !showedStatic.current;
  const isShown =
    mode === 'static' || showedStatic.current || hasEntranceStarted;
  const titleStyle = useEntranceStyle(0, isShown, playCascade);
  const descriptionStyle = useEntranceStyle(1, isShown, playCascade);
  const buttonStyle = useEntranceStyle(2, isShown, playCascade);

  // A view at zero opacity still takes taps, so the button waits for its fade.
  useEffect(() => {
    if (!playCascade) {
      return undefined;
    }
    const timeout = hasEntranceStarted
      ? setTimeout(() => setIsButtonReady(true), LEAD_MS + 2 * STAGGER_MS)
      : setTimeout(startEntrance, VERIFIED_SUCCESS_ENTRANCE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [playCascade, hasEntranceStarted, startEntrance]);

  return {
    mode,
    startEntrance,
    titleStyle,
    descriptionStyle,
    buttonStyle,
    isButtonInteractive:
      mode === 'static' || showedStatic.current || isButtonReady,
  };
};

export default useVerifiedSuccessCascade;
