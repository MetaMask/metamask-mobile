import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';

const LIVE_DOT_SIZE = 6;
const LIVE_DOT_RIPPLE_SIZE = 12;

const styles = StyleSheet.create({
  liveDotContainer: {
    alignItems: 'center',
    height: LIVE_DOT_RIPPLE_SIZE,
    justifyContent: 'center',
    width: LIVE_DOT_RIPPLE_SIZE,
  },
  liveDot: {
    borderRadius: LIVE_DOT_SIZE / 2,
    height: LIVE_DOT_SIZE,
    shadowOpacity: 0.84,
    shadowRadius: 6,
    width: LIVE_DOT_SIZE,
  },
  liveDotRipple: {
    borderRadius: LIVE_DOT_RIPPLE_SIZE / 2,
    height: LIVE_DOT_RIPPLE_SIZE,
    position: 'absolute',
    width: LIVE_DOT_RIPPLE_SIZE,
  },
});

interface PulsingLiveDotProps {
  color?: string;
}

const PulsingLiveDot = ({ color }: PulsingLiveDotProps) => {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.success.default;
  const rippleScale = useRef(new Animated.Value(0.35)).current;
  const rippleOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [rippleOpacity, rippleScale]);

  const rippleStyle = useMemo(
    () => [
      styles.liveDotRipple,
      {
        backgroundColor: resolvedColor,
        opacity: rippleOpacity,
        transform: [{ scale: rippleScale }],
      },
    ],
    [resolvedColor, rippleOpacity, rippleScale],
  );

  const dotStyle = useMemo(
    () => [
      styles.liveDot,
      {
        backgroundColor: resolvedColor,
        shadowColor: resolvedColor,
      },
    ],
    [resolvedColor],
  );

  return (
    <Animated.View style={styles.liveDotContainer}>
      <Animated.View style={rippleStyle} />
      <Animated.View style={dotStyle} />
    </Animated.View>
  );
};

export default PulsingLiveDot;
