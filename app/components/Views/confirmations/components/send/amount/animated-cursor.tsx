import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../hooks/useStyles';

const { View: AnimatedView } = Animated;
const STYLE_VARS = {};

const styleSheet = (params: { theme: Theme; vars: Record<string, never> }) => {
  const { theme } = params;
  return StyleSheet.create({
    amountCursor: {
      backgroundColor: theme.colors.primary.default,
      height: 40,
      marginHorizontal: 5,
      width: 1,
    },
  });
};

export const AnimatedCursor = () => {
  const cursorOpacity = useRef(new Animated.Value(0.6)).current;

  const { styles } = useStyles(styleSheet, STYLE_VARS);

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: 800,
          easing: Easing.bounce,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          easing: Easing.bounce,
          duration: 800,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();
    return () => blinkAnimation.stop();
  }, [cursorOpacity]);

  return (
    <AnimatedView style={[styles.amountCursor, { opacity: cursorOpacity }]} />
  );
};
