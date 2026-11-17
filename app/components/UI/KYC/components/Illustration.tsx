import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import kycCheckmark from './assets/kyc-identity-verified-art.png';
import kycScanner from './assets/kyc-scanner.png';

export const KycIllustrationSource = {
  checkmark: kycCheckmark,
  scanner: kycScanner,
} as const;

/**
 * KYC header graphic at the 1x size of the exported PNG.
 * Density variants (`@2x`, `@3x`) resolve from the base filename.
 */
const KycIllustration = ({
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

export default KycIllustration;
