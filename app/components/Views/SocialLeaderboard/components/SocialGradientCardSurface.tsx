import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../../util/theme';
import { SocialGradientCardSurfaceSelectorsIDs } from './SocialGradientCardSurface.testIds';

export interface SocialGradientCardSurfaceProps {
  children: React.ReactNode;
  testID?: string;
  gradientTestID?: string;
  twClassName?: string;
}

/**
 * Neutral hairline card with the Live trades left-to-right section gradient.
 * Padding is left to the caller so leaderboard rows can keep list alignment.
 */
const SocialGradientCardSurface: React.FC<SocialGradientCardSurfaceProps> = ({
  children,
  testID = SocialGradientCardSurfaceSelectorsIDs.SURFACE,
  gradientTestID = SocialGradientCardSurfaceSelectorsIDs.GRADIENT,
  twClassName,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Box
      twClassName={`self-stretch overflow-hidden rounded-2xl border border-muted${
        twClassName ? ` ${twClassName}` : ''
      }`}
      testID={testID}
    >
      <LinearGradient
        colors={[colors.background.section, colors.background.alternative]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.3 }}
        pointerEvents="none"
        style={tw.style('absolute inset-0')}
        testID={gradientTestID}
      />
      {children}
    </Box>
  );
};

export default SocialGradientCardSurface;
