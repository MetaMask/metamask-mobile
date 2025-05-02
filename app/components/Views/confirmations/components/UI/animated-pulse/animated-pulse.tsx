import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';

interface AnimatedPulseProps extends ViewProps {
  children: React.ReactNode;
  isPulsing?: boolean;
  minCycles?: number;
}

/**
 * @todo move to components-temp
 * @see {@link https://github.com/MetaMask/metamask-mobile/issues/13117}
 *
 * AnimatedPulse component
 * @param {AnimatedPulseProps} props - The props for the AnimatedPulse component
 * @returns {React.ReactNode} The AnimatedPulse component
 */
const AnimatedPulse = ({
  children,
  isPulsing = true,
  minCycles = 2, // Default to 2 cycles minimum for a better visual effect
  ...props
}: AnimatedPulseProps) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const currentAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isCurrentlyPulsingRef = useRef(isPulsing);
  const cyclesNeededRef = useRef(0);
  const cyclesCompletedRef = useRef(0);

  const durationFadeIn = 750;
  const durationFadeOut = 750;
  const durationFadeInFinal = 300;

  useEffect(() => {
    if (isCurrentlyPulsingRef.current && !isPulsing) {
      // Set the number of cycles we need to complete
      cyclesNeededRef.current = Math.max(minCycles, cyclesCompletedRef.current + 1);
    } else if (!isCurrentlyPulsingRef.current && isPulsing) {
      // Reset cycle count when starting to pulse again
      cyclesCompletedRef.current = 0;
    }
    isCurrentlyPulsingRef.current = isPulsing;
  }, [isPulsing, minCycles]);

  // Start a single pulse cycle and decide what to do next
  const runSinglePulseCycle = () => {
    // Create and store the new animation
    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: durationFadeIn,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: durationFadeOut,
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
        if (isCurrentlyPulsingRef.current || cyclesCompletedRef.current < cyclesNeededRef.current) {
          // Schedule the next cycle
          runSinglePulseCycle();
        } else {
          // We're done pulsing and have completed required cycles
          // Fade to full opacity
          Animated.timing(opacity, {
            toValue: 1,
            duration: durationFadeInFinal,
            useNativeDriver: true,
          }).start();

          // Clear animation ref
          currentAnimationRef.current = null;
        }
      }
    });
  };

  // Handle animation lifecycle
  useEffect(() => {
    // Only start animation if:
    // 1. We should be pulsing, OR
    // 2. We just stopped pulsing but need to complete cycles
    const shouldAnimate = isPulsing || (!isPulsing && cyclesCompletedRef.current < cyclesNeededRef.current);

    if (shouldAnimate && !currentAnimationRef.current) {
      runSinglePulseCycle();
    } else if (!shouldAnimate && !currentAnimationRef.current) {
      // No animation needed, just ensure full opacity
      Animated.timing(opacity, {
        toValue: 1,
        duration: durationFadeInFinal,
        useNativeDriver: true,
      }).start();
    }

    // Cleanup
    return () => {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.stop();
        currentAnimationRef.current = null;
      }
    };
  }, [isPulsing]);

  return (
    <Animated.View
      style={{ opacity }}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedPulse;
