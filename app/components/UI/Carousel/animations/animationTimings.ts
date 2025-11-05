import { AnimationDuration } from '../../../../component-library/constants/animation.constants';

// Animation Timing Constants (easily adjustable for design iteration)
export const ANIMATION_TIMINGS = {
  // Card transition animations
  CARD_EXIT_DURATION: AnimationDuration.Regularly, // Current card exit animation (300ms)
  CARD_ENTER_DELAY: AnimationDuration.Quickly, // Delay before next card enters (overlap) (100ms)
  CARD_ENTER_DURATION: AnimationDuration.Promptly, // Next card enter animation (200ms) - synchronized with exit

  // Empty state animations
  EMPTY_STATE_IDLE_TIME: 2000, // How long "You're all caught up" stays visible (reduced to account for transition time)
  EMPTY_STATE_FADE_DURATION: AnimationDuration.Promptly, // Content fade out (200ms)
  EMPTY_STATE_FOLD_DELAY: AnimationDuration.Immediately, // Delay before visual fold starts (50ms)
  EMPTY_STATE_FOLD_DURATION: AnimationDuration.Promptly, // Visual fold animation (200ms)
  EMPTY_STATE_HEIGHT_DURATION: AnimationDuration.Regularly, // Height collapse for content shifting (300ms)
};
