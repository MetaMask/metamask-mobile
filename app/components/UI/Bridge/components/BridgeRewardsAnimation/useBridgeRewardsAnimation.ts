import { useRef, useEffect, useState, useCallback } from 'react';
import { RiveRef } from 'rive-react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  AnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { BridgeRewardAnimationState } from './types';

// Rive animation constants
const STATE_MACHINE_NAME = 'Rewards_Icon';
const ANIMATION_DURATION = 200;

enum RewardsIconTriggers {
  RefreshLeft = 'Refresh_left',
  DisableRight = 'Disable_right',
}

interface UseBridgeRewardsAnimationParams {
  value: number;
  state?: BridgeRewardAnimationState;
}

interface UseBridgeRewardsAnimationResult {
  riveRef: React.RefObject<RiveRef>;
  animatedStyle: AnimatedStyle;
  iconPosition: number; // Direct value instead of animated style
  displayValue: number;
  displayText: string | null;
  hideValue: boolean;
}

/**
 * Simplified rewards animation hook for Bridge
 * Only handles Loading, ErrorState, and Idle states
 */
export const useBridgeRewardsAnimation = ({
  value,
  state = BridgeRewardAnimationState.Idle,
}: UseBridgeRewardsAnimationParams): UseBridgeRewardsAnimationResult => {
  const riveRef = useRef<RiveRef>(null);
  const animatedValue = useSharedValue(0);
  const animatedIconPosition = useSharedValue(-20); // Start at idle position
  const isAnimating = useSharedValue(false);

  const [displayValue, setDisplayValue] = useState(0);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [hideValue, setHideValue] = useState(false);
  const [iconPosition, setIconPosition] = useState(-20);

  // Note: We DON'T auto-animate value changes here
  // Animation is controlled explicitly in the state machine below

  // Sync iconPosition state when animated position changes (for style calculation)
  useAnimatedReaction(
    () => Math.round(animatedIconPosition.value),
    (currentPos, previousPos) => {
      if (currentPos !== previousPos) {
        runOnJS(setIconPosition)(currentPos);
      }
    },
    [animatedIconPosition],
  );

  const triggerRiveAnimation = useCallback((trigger: RewardsIconTriggers) => {
    try {
      riveRef.current?.fireState(STATE_MACHINE_NAME, trigger);
    } catch (error) {
      console.warn(`Error triggering Rive animation (${trigger}):`, error);
    }
  }, []);

  // Handle state changes with proper sequencing
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    const addTimeout = (callback: () => void, delay: number) => {
      const timeout = setTimeout(callback, delay);
      timeouts.push(timeout);
      return timeout;
    };

    // Ensure Rive component is loaded
    addTimeout(() => {
      if (!riveRef.current) return;

      switch (state) {
        case BridgeRewardAnimationState.Loading:
          // Immediately freeze the value at 0 (stop any ongoing animation)
          animatedValue.value = 0;
          setDisplayValue(0);

          // Step 1: Wait 50ms
          addTimeout(() => {
            // Step 2: Hide text and animate icon to right (smoother)
            setHideValue(true);
            setDisplayText(null);
            animatedIconPosition.value = withTiming(0, {
              duration: ANIMATION_DURATION,
            });
            triggerRiveAnimation(RewardsIconTriggers.DisableRight);
          }, 50);
          break;

        case BridgeRewardAnimationState.ErrorState:
          animatedIconPosition.value = withTiming(-20, {
            duration: ANIMATION_DURATION,
          });
          setHideValue(false);
          setDisplayText(strings('rewards.animation.could_not_load'));
          triggerRiveAnimation(RewardsIconTriggers.DisableRight);
          break;

        case BridgeRewardAnimationState.Idle:
        default:
          // Step 1: Animate icon left immediately (smoother)
          animatedIconPosition.value = withTiming(-20, {
            duration: ANIMATION_DURATION,
          });
          triggerRiveAnimation(
            value > 0
              ? RewardsIconTriggers.RefreshLeft
              : RewardsIconTriggers.DisableRight,
          );

          // Step 2: Wait 50ms, then show text and start countdown
          addTimeout(() => {
            setHideValue(false);
            setDisplayText(null);
            // Start counting from 0 to target value
            isAnimating.value = true;
            animatedValue.value = 0;
            animatedValue.value = withTiming(
              value,
              {
                duration: ANIMATION_DURATION * 4, // Slower, smoother countdown (800ms)
              },
              () => {
                isAnimating.value = false;
              },
            );
          }, 50);
          break;
      }
    }, 100);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [
    state,
    value,
    animatedValue,
    animatedIconPosition,
    isAnimating,
    triggerRiveAnimation,
  ]);

  // Derive rounded value on UI thread (more efficient)
  const roundedValue = useDerivedValue(
    () => Math.round(animatedValue.value),
    [animatedValue],
  );

  // Only update display value when rounded value changes (reduces re-renders)
  const updateDisplayValue = useCallback((newValue: number) => {
    setDisplayValue(newValue);
  }, []);

  useAnimatedReaction(
    () => roundedValue.value,
    (currentValue, previousValue) => {
      // Only update if value actually changed (prevents unnecessary re-renders)
      if (currentValue !== previousValue) {
        runOnJS(updateDisplayValue)(currentValue);
      }
    },
    [roundedValue],
  );

  // Animated style for number text with subtle bounce effect
  const animatedStyle = useAnimatedStyle(() => {
    const bounce = isAnimating.value ? 1.02 : 1; // Reduced bounce for smoothness
    return {
      opacity: 1,
      transform: [
        { scale: withTiming(bounce, { duration: ANIMATION_DURATION }) },
      ],
    };
  });

  return {
    riveRef,
    animatedStyle,
    iconPosition,
    displayValue,
    displayText,
    hideValue,
  };
};
