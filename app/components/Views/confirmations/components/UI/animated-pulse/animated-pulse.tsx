import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, View, ViewProps } from 'react-native';
import { isE2E } from '../../../../../../util/test/utils';

interface AnimatedPulseProps extends ViewProps {
  children: React.ReactNode;
  isPulsing?: boolean;
  minCycles?: number;
  preventPulse?: boolean;
}

const DURATION = {
  fadeIn: 750,
  fadeOut: 750,
  fadeInFinal: 750,
} as const;

const AnimatedPulse = ({
  children,
  isPulsing = true,
  minCycles = 2, // Default to 2 cycles minimum for a better visual effect
  preventPulse = false,
  ...props
}: AnimatedPulseProps) => {
  const opacity = useRef(new Animated.Value(isE2E ? 1 : 0.3)).current;
  const currentAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isCurrentlyPulsingRef = useRef(isPulsing);
  const cyclesNeededRef = useRef(isPulsing ? minCycles : 0);
  const cyclesCompletedRef = useRef(0);

  const cleanup = useCallback(() => {
    if (currentAnimationRef.current) {
      currentAnimationRef.current.stop();
      currentAnimationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isCurrentlyPulsingRef.current && !isPulsing) {
      // Set the number of cycles we need to complete
      cyclesNeededRef.current = Math.max(
        minCycles,
        cyclesCompletedRef.current + 1,
      );
    } else if (!isCurrentlyPulsingRef.current && isPulsing) {
      // Reset cycle count when starting to pulse again
      cyclesCompletedRef.current = 0;
    }
    isCurrentlyPulsingRef.current = isPulsing;
  }, [isPulsing, minCycles]);

  // Start a single pulse cycle and decide what to do next
  const runSinglePulseCycle = useCallback(() => {
    // Create and store the new animation
    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION.fadeIn,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: DURATION.fadeOut,
        useNativeDriver: true,
      }),
    ]);

    currentAnimationRef.current = sequence;

    // Start the animation
    sequence.start(({ finished }) => {
      if (finished) {
        // Increment completed cycles
        cyclesCompletedRef.current += 1;

        // Continue pulsing if:
        // 1. isPulsing is true, OR
        // 2. We haven't completed the minimum required cycles
        if (
          isCurrentlyPulsingRef.current ||
          cyclesCompletedRef.current < cyclesNeededRef.current
        ) {
          // Schedule the next cycle
          runSinglePulseCycle();
        } else {
          // We're done pulsing and have completed required cycles
          // Fade to full opacity
          Animated.timing(opacity, {
            toValue: 1,
            duration: DURATION.fadeInFinal,
            useNativeDriver: true,
          }).start();

          // Clear animation ref
          currentAnimationRef.current = null;
        }
      }
    });
  }, [opacity]);

  // Handle animation lifecycle
  useEffect(() => {
    if (isE2E) {
      return;
    }

    // Only start animation if:
    // 1. We should be pulsing, OR
    // 2. We just stopped pulsing but need to complete cycles
    const shouldAnimate =
      isPulsing ||
      (!isPulsing && cyclesCompletedRef.current < cyclesNeededRef.current);

    if (shouldAnimate && !currentAnimationRef.current) {
      runSinglePulseCycle();
    } else if (!shouldAnimate && !currentAnimationRef.current) {
      // No animation needed, just ensure full opacity
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION.fadeInFinal,
        useNativeDriver: true,
      }).start();
    }

    // Cleanup
    return cleanup;
  }, [cleanup, isPulsing, opacity, runSinglePulseCycle]);

  if (preventPulse || isE2E) {
    return <View testID={props.testID}>{children}</View>;
  }

  return (
    <Animated.View style={{ opacity }} {...props}>
      {children}
    </Animated.View>
  );
};

export default AnimatedPulse;
