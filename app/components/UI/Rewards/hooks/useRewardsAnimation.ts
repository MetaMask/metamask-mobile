import { useRef, useEffect, useState, useCallback } from 'react';
import { RiveRef } from 'rive-react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  AnimatedStyle,
} from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';

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
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  const animatedValue = useSharedValue(0);
  const rivePosition = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const [displayValue, setDisplayValue] = useState(0);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [hideValue, setHideValue] = useState(false);

  // Animate number value changes
  useEffect(() => {
    isAnimating.value = true;
    animatedValue.value = withTiming(value, { duration }, () => {
      isAnimating.value = false;
    });
  }, [value, duration, animatedValue, isAnimating]);

  const triggerRiveAnimation = useCallback((trigger: RewardsIconTriggers) => {
    try {
      riveRef.current?.fireState(STATE_MACHINE_NAME, trigger);
    } catch (error) {
      console.warn(`Error triggering Rive animation (${trigger}):`, error);
    }
  }, []);

  // Helper function to manage timeouts and prevent memory leaks
  const createTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      // Remove timeout from refs when it completes
      timeoutRefs.current.delete(timeoutId);
      callback();
    }, delay);
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Helper function to clear all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutRefs.current.clear();
  }, []);

  // Clear all timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const handleLoadingState = useCallback(() => {
    if (!riveRef.current) return;

    // Clear any pending timeouts to prevent race conditions
    clearAllTimeouts();

    setDisplayText(null);
    rivePosition.value = withTiming(0, { duration: ANIMATION_DURATION.NORMAL });

    createTimeout(() => setHideValue(true), ANIMATION_DURATION.SLOW);
    if (animatedValue.value > 0) {
      animatedValue.value = withTiming(0, {
        duration: ANIMATION_DURATION.SLOW,
      });
    }

    triggerRiveAnimation(RewardsIconTriggers.Disable);
  }, [
    animatedValue,
    rivePosition,
    triggerRiveAnimation,
    createTimeout,
    clearAllTimeouts,
  ]);

  const handleErrorState = useCallback(() => {
    if (!riveRef.current) return;

    // Clear any pending timeouts to prevent race conditions
    clearAllTimeouts();

    setHideValue(false);
    isAnimating.value = true;
    setDisplayText(strings('rewards.animation.could_not_load'));
    createTimeout(() => {
      isAnimating.value = false;
    }, ANIMATION_DURATION.FAST);

    rivePosition.value = withTiming(BASE_FOX_POSITION, {
      duration: ANIMATION_DURATION.SLOW,
    });

    triggerRiveAnimation(RewardsIconTriggers.Disable);
  }, [
    rivePosition,
    triggerRiveAnimation,
    createTimeout,
    isAnimating,
    clearAllTimeouts,
  ]);

  const handleIdleState = useCallback(() => {
    if (!riveRef.current) return;

    // Clear any pending timeouts to prevent race conditions
    clearAllTimeouts();

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
  }, [value, rivePosition, triggerRiveAnimation, clearAllTimeouts]);

  // State machine effect - triggers appropriate animation based on state
  useEffect(() => {
    const timeouts = timeoutRefs.current;
    const timer = createTimeout(() => {
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

    return () => {
      clearTimeout(timer);
      timeouts.delete(timer);
    };
  }, [
    state,
    value,
    handleLoadingState,
    handleErrorState,
    handleIdleState,
    createTimeout,
  ]);

  // Animated style for number text with bounce effect
  const animatedStyle = useAnimatedStyle(() => {
    const currentValue = Math.round(animatedValue.value);
    const bounce = isAnimating.value ? 1.05 : 1;

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
    hideValue,
  };
};
