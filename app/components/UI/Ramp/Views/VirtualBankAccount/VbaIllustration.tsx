import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import vbaCheck from './assets/vba-check.png';
import vbaEmail from './assets/vba-email.png';
import vbaFailure from './assets/vba-failure.png';
import vbaHazard from './assets/vba-hazard.png';
import vbaMoneyAccount from './assets/vba-money-account.png';
import vbaScanner from './assets/vba-scanner.png';
import vbaShield from './assets/vba-shield.png';
import vbaVerification from './assets/vba-verification.png';

export const VbaIllustrationSource = {
  check: vbaCheck,
  email: vbaEmail,
  failure: vbaFailure,
  hazard: vbaHazard,
  moneyAccount: vbaMoneyAccount,
  scanner: vbaScanner,
  shield: vbaShield,
  verification: vbaVerification,
} as const;

/**
 * VBA header graphic. Density variants (`@2x`, `@3x`) resolve from the
 * base filename. Swap the node for a Rive animation when one is ready.
 */
const VbaIllustration = ({ source }: { source: ImageSourcePropType }) => {
  const tw = useTailwind();

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      // Figma frames the header graphic at 64pt (h-16).
      style={tw.style('h-16 w-full')}
    />
  );
};

export default VbaIllustration;
