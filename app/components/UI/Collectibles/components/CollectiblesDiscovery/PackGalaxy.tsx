import React, { useId } from 'react';
import { Box } from '@metamask/design-system-react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';
import { CollectiblesCarouselTestIds } from '../../Collectibles.testIds';

/** Replit PackGalaxy subtle halo: transparent edges blend into the scrolling page. */
export default function PackGalaxy({ color }: { color?: string }) {
  const { colors } = useTheme();
  const lightId = useId();
  return (
    <Box
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      twClassName="absolute inset-0"
      testID={CollectiblesCarouselTestIds.GALAXY}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={lightId} cx="50%" cy="36%" rx="65%" ry="48%">
            <Stop
              offset="0"
              stopColor={color ?? colors.primary.default}
              stopOpacity="0.16"
            />
            <Stop
              offset="0.30"
              stopColor={color ?? colors.primary.default}
              stopOpacity="0.16"
            />
            <Stop
              offset="0.85"
              stopColor={color ?? colors.primary.default}
              stopOpacity="0"
            />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${lightId})`} />
      </Svg>
    </Box>
  );
}
