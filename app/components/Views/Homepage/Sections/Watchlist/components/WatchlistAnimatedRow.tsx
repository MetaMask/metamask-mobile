import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

export const WATCHLIST_ROW_ANIMATION_DURATION_MS = 250;

interface WatchlistAnimatedRowProps {
  children: React.ReactNode;
}

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
