import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useAppThemeFromContext } from '../../../../../util/theme';
import TokenIcon from '../../../../Base/TokenIcon';
import {
  RING_SIZE,
  RING_STROKE_WIDTH,
  SPINNER_DURATION_MS,
  SPINNER_SEGMENTS,
} from './TokenIconWithSpinner.constants';
import styles from './TokenIconWithSpinner.styles';

interface GradientSpinnerProps {
  color: string;
}

/**
 * Reusable gradient spinner component
 * Renders a circular arc with gradient opacity that rotates continuously
 */
export const GradientSpinner: React.FC<GradientSpinnerProps> = ({ color }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: SPINNER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const segments = useMemo(
    () =>
      SPINNER_SEGMENTS.map(({ path, opacity }, i) => (
        <Path
          key={i}
          d={path}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={RING_STROKE_WIDTH}
          strokeLinecap="butt"
          fill="transparent"
        />
      )),
    [color],
  );

  return (
    <Animated.View style={[styles.spinningRingWrapper, animatedStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {segments}
      </Svg>
    </Animated.View>
  );
};

export interface TokenIconWithSpinnerProps {
  tokenSymbol: string;
  tokenIcon?: string;
}

/**
 * Token icon with a spinning gradient ring around it
 */
export const TokenIconWithSpinner: React.FC<TokenIconWithSpinnerProps> = ({
  tokenSymbol,
  tokenIcon,
}) => {
  const { colors } = useAppThemeFromContext();

  return (
    <View style={styles.tokenIconWithRingContainer}>
      <GradientSpinner color={colors.primary.default} />
      <View style={styles.tokenIconWrapper}>
        <TokenIcon
          symbol={tokenSymbol}
          icon={tokenIcon}
          style={styles.tokenIcon}
        />
      </View>
    </View>
  );
};
