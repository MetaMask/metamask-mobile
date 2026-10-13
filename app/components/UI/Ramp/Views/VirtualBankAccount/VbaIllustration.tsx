import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import vbaScanner from './assets/vba-scanner.png';

export const VbaIllustrationSource = {
  scanner: vbaScanner,
} as const;

/**
 * VBA header graphic. The default size is the 1x export (127 by 88).
 * Density variants (`@2x`, `@3x`) resolve from the base filename.
 */
const VbaIllustration = ({
  source,
  width = 127,
  height = 88,
}: {
  source: ImageSourcePropType;
  width?: number;
  height?: number;
}) => {
  const tw = useTailwind();

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={tw.style({ width, height })}
    />
  );
};

export default VbaIllustration;
