import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';

interface AnimatedPulseProps extends ViewProps {
  children: React.ReactNode;
  isPulsing?: boolean;
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
  ...props
}: AnimatedPulseProps) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isPulsing) {
      const pulse = Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(pulse).start();

      return () => opacity.stopAnimation();
    }
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

  }, [isPulsing, opacity]);

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
