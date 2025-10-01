import { useRef, useEffect, useState, useCallback } from 'react';
import { RiveRef } from 'rive-react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  AnimatedStyle,
} from 'react-native-reanimated';

// Rive animation constants - defined in rewards_icon_animations.riv
const STATE_MACHINE_NAME = 'State Machine 1';
const BASE_FOX_POSITION = -20;
const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 600,
} as const;

export enum RewardAnimationState {
  Loading = 'loading',
  ErrorState = 'error',
  Idle = 'idle',
}

enum RewardsIconTriggers {
  Disable = 'Disable',
  Start = 'Start',
  Refresh = 'Refresh',
}

interface UseRewardsAnimationParams {
  value: number;
  duration?: number;
  state?: RewardAnimationState;
}

interface UseRewardsAnimationResult {
  riveRef: React.RefObject<RiveRef>;
  animatedStyle: AnimatedStyle;
  rivePositionStyle: AnimatedStyle;
  displayValue: number;
  displayText: string | null;
  isAnimating: boolean;
  hideValue: boolean;
}

/**
 * Custom hook for rewards points animation with Rive fox mascot
 *
 * @param value - The target points value to animate to
 * @param duration - Animation duration in ms (default: 1000)
 * @param state - Current animation state (Loading | ErrorState | Idle)
 *
 * States:
 * - Loading: Fox on top of number, counts down to 0
 * - ErrorState: Shows "Couldn't Load" with fox on left
 * - Idle: Normal state with animated fox on left
 */

export const useRewardsAnimation = ({
  value,
  duration = 1000,
  state = RewardAnimationState.Idle,
}: UseRewardsAnimationParams): UseRewardsAnimationResult => {
  const riveRef = useRef<RiveRef>(null);
  const previousValueRef = useRef<number | null>(null);

  const animatedValue = useSharedValue(0);
  const rivePosition = useSharedValue(0);

  const [displayValue, setDisplayValue] = useState(0);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hideValue, setHideValue] = useState(false);

  // Animate number value changes
  useEffect(() => {
    setIsAnimating(true);
    animatedValue.value = withTiming(value, { duration }, () => {
      runOnJS(setIsAnimating)(false);
    });
  }, [value, duration, animatedValue]);

  const triggerRiveAnimation = useCallback((trigger: RewardsIconTriggers) => {
    try {
      riveRef.current?.fireState(STATE_MACHINE_NAME, trigger);
    } catch (error) {
      console.warn(`Error triggering Rive animation (${trigger}):`, error);
    }
  }, []);

  const handleLoadingState = useCallback(() => {
    if (!riveRef.current) return;

    setDisplayText(null);
    rivePosition.value = withTiming(0, { duration: ANIMATION_DURATION.NORMAL });

    setTimeout(() => setHideValue(true), ANIMATION_DURATION.SLOW);
    if (animatedValue.value > 0) {
      animatedValue.value = withTiming(0, {
        duration: ANIMATION_DURATION.SLOW,
      });
    }

    triggerRiveAnimation(RewardsIconTriggers.Disable);
  }, [animatedValue, rivePosition, triggerRiveAnimation]);

  const handleErrorState = useCallback(() => {
    if (!riveRef.current) return;
    setHideValue(false);
    setIsAnimating(true);
    setDisplayText("Couldn't Load");
    setTimeout(() => setIsAnimating(false), ANIMATION_DURATION.FAST);

    rivePosition.value = withTiming(BASE_FOX_POSITION, {
      duration: ANIMATION_DURATION.SLOW,
    });

    triggerRiveAnimation(RewardsIconTriggers.Disable);
  }, [rivePosition, triggerRiveAnimation]);

  const handleIdleState = useCallback(() => {
    if (!riveRef.current) return;
    setHideValue(false);
    const currentValue = value;
    const previousValue = previousValueRef.current;

    setDisplayText(null);

    // Always reposition fox on state transitions
    rivePosition.value = withTiming(BASE_FOX_POSITION, {
      duration: ANIMATION_DURATION.NORMAL,
    });

    // Only trigger Rive animation if value changed
    if (currentValue !== previousValue) {
      const trigger =
        currentValue > 0
          ? RewardsIconTriggers.Start
          : RewardsIconTriggers.Disable;
      triggerRiveAnimation(trigger);
      previousValueRef.current = currentValue;
    }
  }, [value, rivePosition, triggerRiveAnimation]);

  // State machine effect - triggers appropriate animation based on state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!riveRef.current) return;

      switch (state) {
        case RewardAnimationState.Loading:
          handleLoadingState();
          break;
        case RewardAnimationState.ErrorState:
          handleErrorState();
          break;
        case RewardAnimationState.Idle:
        default:
          handleIdleState();
          break;
      }
    }, 100); // Delay ensures Rive component is loaded

    return () => clearTimeout(timer);
  }, [state, value, handleLoadingState, handleErrorState, handleIdleState]);

  // Animated style for number text with bounce effect
  const animatedStyle = useAnimatedStyle(() => {
    const currentValue = Math.round(animatedValue.value);
    const bounce = isAnimating ? 1.05 : 1;

    runOnJS(setDisplayValue)(currentValue);

    return {
      opacity: 1,
      transform: [
        { scale: withTiming(bounce, { duration: ANIMATION_DURATION.FAST }) },
      ],
    };
  });

  // Animated style for fox horizontal movement
  const rivePositionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rivePosition.value }],
  }));

  return {
    riveRef,
    animatedStyle,
    rivePositionStyle,
    displayValue,
    displayText,
    isAnimating,
    hideValue,
  };
};
