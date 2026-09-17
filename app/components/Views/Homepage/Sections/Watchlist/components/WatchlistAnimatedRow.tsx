import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

/** Shared row animation timing for watchlist + suggested rows. */
export const WATCHLIST_ROW_ANIMATION_DURATION_MS = 250;

interface WatchlistAnimatedRowProps {
  children: React.ReactNode;
}

/**
 * Standard enter/exit/layout animation wrapper for homepage watchlist rows.
 * Lets a token starred from the suggested section appear to move fluidly
 * into the watchlist rows — it fades in as the suggested row fades out and
 * sibling rows shift smoothly into place.
 */
const WatchlistAnimatedRow: React.FC<WatchlistAnimatedRowProps> = ({
  children,
}) => (
  <Animated.View
    entering={FadeIn.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)}
    exiting={FadeOut.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)}
    layout={LinearTransition.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)}
  >
    {children}
  </Animated.View>
);

export default WatchlistAnimatedRow;
