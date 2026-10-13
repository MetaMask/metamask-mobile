import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import vbaScanner from './assets/vba-scanner.png';

export const VbaIllustrationSource = {
  scanner: vbaScanner,
} as const;

/**
 * VBA header graphic at the 1x size of the exported PNG (127×88).
 * Density variants (`@2x`, `@3x`) resolve from the base filename.
 */
const VbaIllustration = ({ source }: { source: ImageSourcePropType }) => {
  const tw = useTailwind();

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={tw.style('h-[88px] w-[127px]')}
    />
  );
};

export default VbaIllustration;
