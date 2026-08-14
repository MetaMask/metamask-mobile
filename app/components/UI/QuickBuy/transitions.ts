import { AnimationDuration } from '@metamask/design-tokens';
import {
  withTiming,
  type EntryExitAnimationFunction,
  type SharedValue,
} from 'react-native-reanimated';
import type { QuickBuyScreen } from './types';

/** Horizontal slide distance (px) for screen enter/exit. */
export const SCREEN_SLIDE_OFFSET = 24;

/** Navigation depth per screen; sign of the delta gives transition direction. */
export const SCREEN_DEPTH: Record<QuickBuyScreen, number> = {
  amount: 0,
  editQuickAmounts: 1,
  payWith: 1,
  quoteDetails: 1,
  selectQuote: 2,
  priceImpactConfirm: 1,
};

/** +1 = forward (deeper), -1 = back (shallower). */
export type ScreenDirection = 1 | -1;

const DURATION = AnimationDuration.Fast;

/**
 * Build direction-aware enter/exit animations bound to a shared direction value.
 *
 * Forward (dir=1): new screen enters from the right (+offset -> 0), old screen
 * exits to the left (0 -> -offset). Back (dir=-1): mirrored. Both fade.
 *
 * Direction is read from `directionSV` when the animation starts (the next UI
 * frame), so both the entering and exiting views see the up-to-date direction
 * computed at navigation time.
 */
export const makeScreenTransitions = (
  directionSV: SharedValue<ScreenDirection>,
) => {
  const entering: EntryExitAnimationFunction = () => {
    'worklet';
    const dir = directionSV.value;
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: dir * SCREEN_SLIDE_OFFSET }],
      },
      animations: {
        opacity: withTiming(1, { duration: DURATION }),
        transform: [{ translateX: withTiming(0, { duration: DURATION }) }],
      },
    };
  };

  const exiting: EntryExitAnimationFunction = () => {
    'worklet';
    const dir = directionSV.value;
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: DURATION }),
        transform: [
          {
            translateX: withTiming(-dir * SCREEN_SLIDE_OFFSET, {
              duration: DURATION,
            }),
          },
        ],
      },
    };
  };

  return { entering, exiting };
};
