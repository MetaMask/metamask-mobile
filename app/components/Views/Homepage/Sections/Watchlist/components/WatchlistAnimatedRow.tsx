import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
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
  const reduceMotion = useReducedMotion() || !enableMotion;

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeIn.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)
      }
      exiting={
        reduceMotion
          ? undefined
          : FadeOut.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)
      }
    >
      {children}
    </Animated.View>
  );
};

export default WatchlistAnimatedRow;
