import { useCallback, useLayoutEffect, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useDerivedValue,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import {
  DEFAULT_GESTURE_CONFIG,
  DIMENSIONS,
  CARD_ANIMATION,
} from '../PredictSwipeGame.constants';
import type { SwipeGestureConfig, SwipeDirection } from '../PredictSwipeGame.types';

const { SCREEN_WIDTH, SCREEN_HEIGHT } = DIMENSIONS;
const { MAX_ROTATION_DEGREES, MIN_SCALE } = CARD_ANIMATION;

interface UseSwipeGestureOptions {
  onSwipeRight: () => void; // YES bet
  onSwipeLeft: () => void; // NO bet
  onSwipeDown: () => void; // Skip (also triggered by swipe up)
  config?: Partial<SwipeGestureConfig>;
  enabled?: boolean;
  cardKey?: string | number; // Key to detect card changes and reset
}

interface UseSwipeGestureReturn {
  gesture: ReturnType<typeof Gesture.Pan>;
  cardAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  translateX: { value: number }; // Current X position
  translateY: { value: number }; // Current Y position
  isSwipingRight: { value: boolean }; // Towards YES
  isSwipingLeft: { value: boolean }; // Towards NO
  isSwipingDown: { value: boolean }; // Towards Skip (down)
  isSwipingUp: { value: boolean }; // Towards Skip (up)
  isSkipping: { value: boolean }; // Either up or down
  resetCard: () => void;
  resetCardImmediate: () => void;
  swipeDirection: { value: SwipeDirection };
  swipeProgress: { value: number }; // 0-1 progress towards threshold
}

/**
 * Hook for handling swipe gestures on cards
 *
 * - Swipe RIGHT → YES bet (positive action)
 * - Swipe LEFT → NO bet (negative action)
 * - Swipe UP or DOWN → Skip
 */
export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  onSwipeDown,
  config: customConfig,
  enabled = true,
  cardKey,
}: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const config = { ...DEFAULT_GESTURE_CONFIG, ...customConfig };

  // Animated values for card position
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Track previous cardKey to detect changes
  const prevCardKeyRef = useRef(cardKey);

  // Reset values BEFORE paint when cardKey changes (useLayoutEffect)
  useLayoutEffect(() => {
    if (prevCardKeyRef.current !== cardKey && cardKey !== undefined) {
      // Card changed - reset all animated values immediately
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(opacity);
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      scale.value = 1;
      opacity.value = 1;
    }
    prevCardKeyRef.current = cardKey;
  }, [cardKey, translateX, translateY, rotation, scale, opacity]);

  // Threshold for highlighting indicators (smaller than action threshold)
  const highlightThreshold = 30;

  // Derived values for indicator highlighting
  const isSwipingRight = useDerivedValue(() => translateX.value > highlightThreshold);
  const isSwipingLeft = useDerivedValue(() => translateX.value < -highlightThreshold);
  const isSwipingDown = useDerivedValue(
    () => translateY.value > highlightThreshold && Math.abs(translateX.value) < 50,
  );
  const isSwipingUp = useDerivedValue(
    () => translateY.value < -highlightThreshold && Math.abs(translateX.value) < 50,
  );
  const isSkipping = useDerivedValue(() => isSwipingDown.value || isSwipingUp.value);

  // Swipe progress (0-1) for visual feedback
  const swipeProgress = useDerivedValue(() => {
    const horizontalProgress = Math.abs(translateX.value) / config.horizontalThreshold;
    const verticalProgress = Math.abs(translateY.value) / config.verticalThreshold;
    return Math.min(1, Math.max(horizontalProgress, verticalProgress));
  });

  // Current swipe direction
  const swipeDirection = useDerivedValue<SwipeDirection>(() => {
    if (isSwipingRight.value) return 'right';
    if (isSwipingLeft.value) return 'left';
    if (isSwipingDown.value || isSwipingUp.value) return 'down'; // Both up and down = skip
    return 'none';
  });

  // Reset card to center position with animation
  const resetCard = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    opacity.value = 1;
  }, [translateX, translateY, rotation, scale, opacity]);

  // Reset card immediately (no animation) - for new cards
  const resetCardImmediate = useCallback(() => {
    'worklet';
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(rotation);
    cancelAnimation(scale);
    cancelAnimation(opacity);
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    scale.value = 1;
    opacity.value = 1;
  }, [translateX, translateY, rotation, scale, opacity]);

  // Pan gesture handler
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      // Allow both up and down movement for skip
      translateY.value = event.translationY;

      // Rotate slightly based on horizontal movement
      rotation.value = (event.translationX / SCREEN_WIDTH) * MAX_ROTATION_DEGREES;

      // Scale down slightly when swiping horizontally
      const scaleDecrease = Math.min(Math.abs(event.translationX) / SCREEN_WIDTH, 1 - MIN_SCALE);
      scale.value = 1 - scaleDecrease;
    })
    .onEnd((event) => {
      'worklet';
      const { translationX, translationY, velocityX, velocityY } = event;

      // Check for swipe RIGHT (YES bet) ✅
      if (
        translationX > config.horizontalThreshold ||
        velocityX > config.velocityThreshold
      ) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, {
          duration: config.exitDuration,
        });
        rotation.value = withTiming(MAX_ROTATION_DEGREES, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration }, (finished) => {
          'worklet';
          if (finished) {
            // Just call the callback - useLayoutEffect will reset values on card change
            runOnJS(onSwipeRight)();
          }
        });
        return;
      }

      // Check for swipe LEFT (NO bet) ❌
      if (
        translationX < -config.horizontalThreshold ||
        velocityX < -config.velocityThreshold
      ) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, {
          duration: config.exitDuration,
        });
        rotation.value = withTiming(-MAX_ROTATION_DEGREES, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration }, (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onSwipeLeft)();
          }
        });
        return;
      }

      // Check for swipe DOWN (Skip) ⏭️
      if (
        translationY > config.verticalThreshold &&
        Math.abs(translationX) < 50
      ) {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration }, (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onSwipeDown)();
          }
        });
        return;
      }

      // Check for swipe UP (Skip) ⏭️ - Alternative skip direction
      if (
        translationY < -config.verticalThreshold &&
        Math.abs(translationX) < 50
      ) {
        translateY.value = withTiming(-SCREEN_HEIGHT, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration }, (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onSwipeDown)();
          }
        });
        return;
      }

      // Snap back to center if thresholds not met
      resetCard();
    });

  // Animated style for the card
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return {
    gesture,
    cardAnimatedStyle,
    translateX,
    translateY,
    isSwipingRight,
    isSwipingLeft,
    isSwipingDown,
    isSwipingUp,
    isSkipping,
    resetCard,
    resetCardImmediate,
    swipeDirection,
    swipeProgress,
  };
}

