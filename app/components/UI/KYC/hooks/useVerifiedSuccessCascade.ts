import { useCallback, useEffect, useState } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import { useReduceMotionState } from '../../Money/hooks/useReduceMotion';

/**
 * Shared entrance for KYC / Card-style verified success screens.
 * Once the tick starts drawing, the title, description and button each fade
 * in and rise into place, one after another. Under Reduce Motion they show
 * at once.
 */

/** How far each item rises into place. */
export const VERIFIED_SUCCESS_CASCADE_RISE_PX = 10;
/** Delay after the tick starts before the title enters, so it lands mid-draw. */
export const VERIFIED_SUCCESS_CASCADE_LEAD_MS = AnimationDuration.Regularly;
/** Gap between each item starting. */
export const VERIFIED_SUCCESS_CASCADE_STAGGER_MS = 80;
/** How long each item takes to enter. */
export const VERIFIED_SUCCESS_CASCADE_DURATION_MS = AnimationDuration.Regularly;
/**
 * Cap on waiting for the tick to start. The Rive file load and the native
 * view-ready handshake are both unbounded, and the copy must never wait on them.
 */
export const VERIFIED_SUCCESS_ENTRANCE_START_TIMEOUT_MS = 2000;

export type CascadeState = 'pending' | 'play' | 'static';
export type VerifiedCheckMode = 'pending' | 'animate' | 'static';

const useCascadeStyle = (step: number, state: CascadeState) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (state === 'static') {
      progress.value = 1;
      return;
    }
    if (state === 'play') {
      progress.value = withDelay(
        VERIFIED_SUCCESS_CASCADE_LEAD_MS +
          step * VERIFIED_SUCCESS_CASCADE_STAGGER_MS,
        withTiming(1, {
          duration: VERIFIED_SUCCESS_CASCADE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [progress, state, step]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: (1 - progress.value) * VERIFIED_SUCCESS_CASCADE_RISE_PX,
      },
    ],
  }));
};

/**
 * Entrance cascade and Reduce Motion timing for a verified success screen.
 * The button only becomes pressable once its fade-in starts (straight away
 * under Reduce Motion), because a view at zero opacity still takes taps.
 */
const useVerifiedSuccessCascade = () => {
  // `null` while the Reduce Motion check is in flight; nothing animates or
  // shows until it resolves, so the first paint never flashes.
  const reduceMotion = useReduceMotionState();
  const [hasEntranceStarted, setHasEntranceStarted] = useState(false);
  const startEntrance = useCallback(() => setHasEntranceStarted(true), []);

  let cascadeState: CascadeState = 'pending';
  if (reduceMotion === true) {
    cascadeState = 'static';
  } else if (reduceMotion === false && hasEntranceStarted) {
    cascadeState = 'play';
  }

  const titleStyle = useCascadeStyle(0, cascadeState);
  const descriptionStyle = useCascadeStyle(1, cascadeState);
  const buttonStyle = useCascadeStyle(2, cascadeState);

  const [isButtonInteractive, setIsButtonInteractive] = useState(false);
  useEffect(() => {
    if (cascadeState === 'static') {
      setIsButtonInteractive(true);
      return undefined;
    }
    if (cascadeState !== 'play') {
      return undefined;
    }
    const timeout = setTimeout(
      () => setIsButtonInteractive(true),
      VERIFIED_SUCCESS_CASCADE_LEAD_MS +
        2 * VERIFIED_SUCCESS_CASCADE_STAGGER_MS,
    );
    return () => clearTimeout(timeout);
  }, [cascadeState]);

  let checkMode: VerifiedCheckMode = 'pending';
  if (reduceMotion === true) {
    checkMode = 'static';
  } else if (reduceMotion === false) {
    checkMode = 'animate';
  }

  useEffect(() => {
    if (reduceMotion !== false || hasEntranceStarted) {
      return undefined;
    }
    const timeout = setTimeout(
      startEntrance,
      VERIFIED_SUCCESS_ENTRANCE_START_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [reduceMotion, hasEntranceStarted, startEntrance]);

  return {
    titleStyle,
    descriptionStyle,
    buttonStyle,
    isButtonInteractive,
    checkMode,
    startEntrance,
  };
};

export default useVerifiedSuccessCascade;
