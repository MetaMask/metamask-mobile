import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

export interface ScrollEdgeFadeProps {
  testID?: string;
}

const FADE_TAIL_HEIGHT = 16;
const FADE_OPACITIES = [1, 0.7, 0.35, 0];
const FADE_LOCATIONS = [0, 0.3, 0.7, 1];

/**
 * Emulates the iOS 26 soft scroll edge behind a floating header where the
 * native bar isn't available. Fills its parent and fades out just below it.
 */
const ScrollEdgeFade = ({ testID }: ScrollEdgeFadeProps) => {
  const { colors } = useTheme();
  const fadeColors = useMemo(
    () =>
      FADE_OPACITIES.map((opacity) =>
        colorWithOpacity(colors.background.default, opacity),
      ),
    [colors.background.default],
  );

  return (
    <LinearGradient
      pointerEvents="none"
      colors={fadeColors}
      locations={FADE_LOCATIONS}
      style={[StyleSheet.absoluteFill, { bottom: -FADE_TAIL_HEIGHT }]}
      testID={testID}
    />
  );
};

export default ScrollEdgeFade;
