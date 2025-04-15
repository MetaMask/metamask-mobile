import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../Box/Box';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../../../component-library/hooks';

const styleSheet = (params: { theme: Theme }) =>
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
      backgroundColor: params.theme.colors.primary.muted,
      borderRadius: 8,
    },
    hollowCircleContainer: {
      ...StyleSheet.absoluteFillObject,
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
export default function PulsingCircle({ color }: { color: IconColor }) {
  const { styles } = useStyles(styleSheet, {});
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
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <Box style={styles.container}>
      <Animated.View
        style={[styles.pulsingAura, { transform: [{ scale: pulseAnim }] }]}
      />
      <Box style={styles.hollowCircleContainer}>
        <Icon name={IconName.FullCircle} color={color} size={IconSize.Xs} />
      </Box>
    </Box>
  );
}
