// Animation Timing Constants (easily adjustable for design iteration)
export const ANIMATION_TIMINGS = {
  // Card transition animations
  CARD_EXIT_DURATION: 300, // Current card exit animation
  CARD_ENTER_DELAY: 100, // Delay before next card enters (overlap)
  CARD_ENTER_DURATION: 250, // Next card enter animation

  // Empty state animations
  EMPTY_STATE_IDLE_TIME: 500, // How long "You're all caught up" stays visible (reduced to account for transition time)
  EMPTY_STATE_FADE_DURATION: 200, // Content fade out
  EMPTY_STATE_FOLD_DELAY: 50, // Delay before visual fold starts
  EMPTY_STATE_FOLD_DURATION: 200, // Visual fold animation
  EMPTY_STATE_HEIGHT_DURATION: 300, // Height collapse for content shifting
};
