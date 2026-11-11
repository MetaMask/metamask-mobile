import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export const POST_ENTRANCE_DURATION_MS = 320;

export interface SocialFeedPostEntranceProps {
  /**
   * When false the child renders at its resting style with no animation, so
   * pre-existing feed cards never flicker on an unrelated re-render.
   */
  animate: boolean;
  children: React.ReactNode;
}

/**
 * Fades + slides a freshly committed composed post into the feed. Uses a
 * mount-driven shared value rather than Reanimated's `entering` prop: layout
 * entering animations run off the initial mount snapshot and left the card
 * permanently invisible when the list re-rendered mid-animation.
 */
const SocialFeedPostEntrance: React.FC<SocialFeedPostEntranceProps> = ({
  animate,
  children,
}) => {
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: POST_ENTRANCE_DURATION_MS });
  }, [animate, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default SocialFeedPostEntrance;
