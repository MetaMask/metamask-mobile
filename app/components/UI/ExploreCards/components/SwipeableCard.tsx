import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import {
  DECK_SPRING_CONFIG,
  MAX_ROTATION_DEG,
  SWIPE_COMMIT_DISTANCE_RATIO,
  SWIPE_COMMIT_VELOCITY,
  SWIPE_OFF_DURATION_MS,
} from '../constants';

// POC: reuse an existing catalog moment for the swipe-commit haptic.
// TODO: add a dedicated `ExploreCardSwipe` ImpactMoment with design sign-off
// before productionizing.
const playSwipeCommitHaptic = (): void => {
  void playImpact(ImpactMoment.PageNavigation);
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export interface SwipeableCardProps {
  /** Width of the card (drives commit thresholds and rotation). */
  width: number;
  /**
   * This card's deck index. The shared `progress` value rests here while the
   * card is idle and reaches `baseProgress + 1` exactly when the fly-off
   * completes.
   */
  baseProgress: number;
  /**
   * Cumulative deck progress (never resets), shared with the layers behind
   * so they promote continuously — resetting a 0→1 value from the JS thread
   * raced the React commit and made the stack visibly pop between frames.
   */
  progress: SharedValue<number>;
  /** Fired (on the JS thread) after the fly-off animation completes. */
  onSwiped: () => void;
  children: React.ReactNode;
}

/**
 * Gesture + transform wrapper for the top card of the deck. Tinder physics:
 * 1:1 finger tracking with interpolated rotation, distance/velocity commit,
 * spring snap-back on cancel.
 */
const SwipeableCard: React.FC<SwipeableCardProps> = ({
  width,
  baseProgress,
  progress,
  onSwiped,
  children,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isCommitting = useSharedValue(false);

  const pan = Gesture.Pan()
    .minDistance(8)
    .onUpdate((event) => {
      if (isCommitting.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.6;
      progress.value =
        baseProgress + Math.min(1, Math.abs(event.translationX) / width);
    })
    .onEnd((event) => {
      if (isCommitting.value) return;
      const passedDistance =
        Math.abs(translateX.value) > SWIPE_COMMIT_DISTANCE_RATIO * width;
      const passedVelocity = Math.abs(event.velocityX) > SWIPE_COMMIT_VELOCITY;

      if (passedDistance || passedVelocity) {
        isCommitting.value = true;
        const direction =
          Math.sign(translateX.value) || Math.sign(event.velocityX) || 1;
        runOnJS(playSwipeCommitHaptic)();
        progress.value = withTiming(baseProgress + 1, {
          duration: SWIPE_OFF_DURATION_MS,
        });
        translateY.value = withTiming(translateY.value + 40, {
          duration: SWIPE_OFF_DURATION_MS,
        });
        translateX.value = withTiming(
          direction * width * 1.5,
          {
            duration: SWIPE_OFF_DURATION_MS,
            easing: Easing.out(Easing.quad),
          },
          (finished) => {
            if (finished) {
              runOnJS(onSwiped)();
            }
          },
        );
      } else {
        translateX.value = withSpring(0, DECK_SPRING_CONFIG);
        translateY.value = withSpring(0, DECK_SPRING_CONFIG);
        progress.value = withSpring(baseProgress, DECK_SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-width, 0, width],
      [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG],
    );
    // Fade only over the last ~30% of the fly-off travel.
    const opacity = interpolate(
      Math.abs(translateX.value),
      [width * 1.05, width * 1.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export default SwipeableCard;
