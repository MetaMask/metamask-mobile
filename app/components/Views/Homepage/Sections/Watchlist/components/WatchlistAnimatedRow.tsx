import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

export const WATCHLIST_ROW_ANIMATION_DURATION_MS = 250;

interface WatchlistAnimatedRowProps {
  children: React.ReactNode;
  enableMotion?: boolean;
}

const WatchlistAnimatedRow: React.FC<WatchlistAnimatedRowProps> = ({
  children,
  enableMotion = true,
}) => {
  const entering = enableMotion
    ? FadeIn.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)
    : undefined;
  const exiting = enableMotion
    ? FadeOut.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)
    : undefined;
  const layout = enableMotion
    ? LinearTransition.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)
    : undefined;

  return (
    <Animated.View entering={entering} exiting={exiting} layout={layout}>
      {children}
    </Animated.View>
  );
};

export default WatchlistAnimatedRow;
