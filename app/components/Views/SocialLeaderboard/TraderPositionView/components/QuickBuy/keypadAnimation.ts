import { AnimationDuration } from '@metamask/design-tokens';
import { Easing } from 'react-native-reanimated';

/** Shared duration for keypad reveal and footer collapse on the amount screen. */
export const KEYPAD_ANIM_DURATION = AnimationDuration.Fast;

export const KEYPAD_REVEAL_TIMING = {
  duration: KEYPAD_ANIM_DURATION,
  easing: Easing.out(Easing.cubic),
} as const;
