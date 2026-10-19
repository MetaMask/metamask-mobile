import React, { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

const DURATION_MS = 1000;

// IconSize values are tailwind tokens rather than pixel values, so the pixel
// dimensions the rotation container needs are mapped explicitly.
const ICON_SIZE_PX: Record<IconSize, number> = {
  [IconSize.Xs]: 12,
  [IconSize.Sm]: 16,
  [IconSize.Md]: 20,
  [IconSize.Lg]: 24,
  [IconSize.Xl]: 32,
};

export interface PendingSpinnerProps {
  /** Icon size. Defaults to Sm (16px). */
  size?: IconSize;
  /** Icon colour. Defaults to the standard icon colour. */
  color?: IconColor;
  testID?: string;
}

/**
 * The in-flight indicator from the Money activity design
 */
const PendingSpinner = ({
  size = IconSize.Sm,
  color = IconColor.IconDefault,
  testID,
}: PendingSpinnerProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: DURATION_MS, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Explicit dimensions so the rotation pivots around the icon's centre
  const dimension = ICON_SIZE_PX[size];
  const containerStyle = useMemo(
    () => ({
      width: dimension,
      height: dimension,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [dimension],
  );

  return (
    // Decorative: the pending state is conveyed by the row's status label,
    // so hide the spinner from assistive technology on both platforms.
    <Animated.View
      style={[containerStyle, animatedStyle]}
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={IconName.Loading} size={size} color={color} />
    </Animated.View>
  );
};

export default PendingSpinner;
