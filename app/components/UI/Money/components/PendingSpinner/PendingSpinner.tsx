import React, { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

const DURATION_MS = 1000;

export interface PendingSpinnerProps {
  /** Icon size. Defaults to Sm (16px). */
  size?: IconSize;
  /** Icon colour. Defaults to the standard icon colour. */
  color?: string | IconColor;
  testID?: string;
}

/**
 * The in-flight indicator from the Money activity design
 */
const PendingSpinner = ({
  size = IconSize.Sm,
  color = IconColor.Default,
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
  const dimension = Number(size);
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
