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
 * The in-flight indicator from the Money activity design: the `Loading` icon
 * (an open ring) rotating continuously. Uses the shared icon library so the
 * glyph stays in sync with the design system, and a reanimated worklet for the
 * rotation — which runs on the UI thread, so it keeps spinning even while the
 * JS thread is busy (e.g. during initial data/balance load).
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

  // Explicit dimensions so the rotation pivots around the icon's centre rather
  // than a zero-size view's origin (the bug in the first reanimated attempt).
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
    <Animated.View style={[containerStyle, animatedStyle]} testID={testID}>
      <Icon name={IconName.Loading} size={size} color={color} />
    </Animated.View>
  );
};

export default PendingSpinner;
