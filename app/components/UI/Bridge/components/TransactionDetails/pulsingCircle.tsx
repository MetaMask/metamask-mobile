import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import HollowCircle from './hollowCircle';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../Box/Box';
import { useTheme } from '../../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      width: 12,
      height: 12,
    },
    pulsingAura: {
      position: 'absolute',
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      backgroundColor: colors.primary.muted,
      borderRadius: 8,
    },
    hollowCircleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

/**
 * Renders the steps in the Bridge Transaction Details page
 *
 * @param options
 * @param options.color - The color of the icon
 */
export default function PulsingCircle({
  color,
}: {
  color: IconColor;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Box style={styles.container}>
      <Animated.View
        style={[
          styles.pulsingAura,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Box style={styles.hollowCircleContainer}>
        <HollowCircle color={color} />
      </Box>
    </Box>
  );
}
