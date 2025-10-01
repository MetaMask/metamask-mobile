import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Text, TextVariant } from '@metamask/design-system-react-native';

interface RewardPointsAnimationProps {
  value: number;
  duration?: number;
  variant?: TextVariant;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const RewardPointsAnimation: React.FC<RewardPointsAnimationProps> = ({
  value,
  duration = 1000,
  variant,
}) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    animatedValue.value = withTiming(
      value,
      {
        duration,
      },
      () => {
        runOnJS(setIsAnimating)(false);
      },
    );
  }, [value, duration, animatedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentValue = Math.round(animatedValue.value);

    // Add a slight bounce effect during animation
    const bounce = isAnimating ? 1.05 : 1;

    runOnJS(setDisplayValue)(currentValue);

    return {
      opacity: 1,
      transform: [
        {
          scale: withTiming(bounce, { duration: 200 }),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Text variant={variant} style={styles.counterText}>
          {displayValue.toLocaleString()}
        </Text>
      </Animated.View>
    </View>
  );
};

export default RewardPointsAnimation;
