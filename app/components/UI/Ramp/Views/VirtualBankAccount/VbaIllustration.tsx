import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import vbaHazard from './assets/vba-hazard.png';
import vbaScanner from './assets/vba-scanner.png';

export const VbaIllustrationSource = {
  hazard: vbaHazard,
  scanner: vbaScanner,
} as const;

/**
 * VBA header graphic at the 1x size of the exported PNG.
 * Density variants (`@2x`, `@3x`) resolve from the base filename.
 */
const VbaIllustration = ({
  source,
  twClassName = 'h-[88px] w-[127px]',
}: {
  source: ImageSourcePropType;
  twClassName?: string;
}) => {
  const tw = useTailwind();

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={tw.style(twClassName)}
    />
  );
};

export default VbaIllustration;
