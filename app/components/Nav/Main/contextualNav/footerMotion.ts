import {
  Easing,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';

export type FooterMotion = 'morph' | 'crossfade';

/**
 * Width morph versus a quick crossfade.
 *
 * Reduce Motion always crossfades. LOW hardware crossfades on a known
 * network. `null` network is not treated as offline, so LOW + unknown
 * network keeps the morph (the matrix's product-default cell). `null`
 * hardware and `null` reduce-motion keep the morph.
 */
export const getFooterMotion = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
  reduceMotion: boolean | null,
): FooterMotion => {
  if (reduceMotion === true) {
    return 'crossfade';
  }
  if (hardware === 'LOW' && network !== null) {
    return 'crossfade';
  }
  return 'morph';
};

export const FOOTER_COLLAPSE_MS = 260;
export const FOOTER_EXPAND_MS = 320;
export const FOOTER_CROSSFADE_MS = 140;
export const FOOTER_REST_TRANSLATE = -8;

/**
 * Identity of the footer set. Explore, Swap, Perps, and Predictions share
 * the trade footer, so selecting them does not change this. It changes
 * only when the set itself changes.
 */
export const getFooterTransitionId = (
  section: string | null,
  _tab?: string | null,
): string => {
  if (section === 'trading') {
    return 'trade';
  }
  if (section === 'collectibles') {
    return 'collectibles';
  }
  if (section === 'money') {
    return 'money';
  }
  return 'default';
};

const EASE_IN_OUT = Easing.inOut(Easing.cubic);

/**
 * One continuous width change: collapse the pill, then expand, with no
 * wait between the two. The collapsed width is the caller's anchor slot.
 * Reduce Motion only fades the other items and leaves the width alone.
 */
export const animateFooterTransition = (
  clipWidth: SharedValue<number>,
  restOpacity: SharedValue<number>,
  restTranslateX: SharedValue<number>,
  swapClock: SharedValue<number>,
  fullWidth: number,
  homeWidth: number,
  motion: FooterMotion,
  onMidpoint: () => void,
): void => {
  if (motion === 'crossfade') {
    clipWidth.value = fullWidth;
    restTranslateX.value = 0;
    swapClock.value = 0;
    restOpacity.value = withTiming(
      0,
      { duration: FOOTER_CROSSFADE_MS, easing: EASE_IN_OUT },
      (finished) => {
        if (finished) {
          scheduleOnRN(onMidpoint);
        }
      },
    );
    return;
  }

  restOpacity.value = withSequence(
    withTiming(0, { duration: FOOTER_COLLAPSE_MS, easing: EASE_IN_OUT }),
    withTiming(1, { duration: FOOTER_EXPAND_MS, easing: EASE_IN_OUT }),
  );
  restTranslateX.value = withSequence(
    withTiming(FOOTER_REST_TRANSLATE, {
      duration: FOOTER_COLLAPSE_MS,
      easing: EASE_IN_OUT,
    }),
    withTiming(0, { duration: FOOTER_EXPAND_MS, easing: EASE_IN_OUT }),
  );
  // Collapse and expand are one sequenced animation, so the width never
  // waits on a React render between the two.
  clipWidth.value = withSequence(
    withTiming(homeWidth, {
      duration: FOOTER_COLLAPSE_MS,
      easing: EASE_IN_OUT,
    }),
    withTiming(fullWidth, { duration: FOOTER_EXPAND_MS, easing: EASE_IN_OUT }),
  );
  // Assigned shared value: a bare withTiming call does not run. This clock
  // swaps the non-Home items as the width turns around.
  swapClock.value = 0;
  swapClock.value = withTiming(
    1,
    { duration: FOOTER_COLLAPSE_MS, easing: EASE_IN_OUT },
    (finished) => {
      if (finished) {
        scheduleOnRN(onMidpoint);
      }
    },
  );
};

/** Live object so tests can spy on the transition without a namespace import. */
export const footerAnimator = {
  getMotion: getFooterMotion,
  animate: animateFooterTransition,
};
