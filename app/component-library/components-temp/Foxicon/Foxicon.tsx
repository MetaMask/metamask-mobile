import React from 'react';
import { Image } from 'react-native';

import { assetByFoxiconVariant } from './Foxicon.assets';
import {
  FOXICON_FALLBACK_VARIANT,
  FoxiconProps,
  FoxiconVariant,
} from './Foxicon.types';

/** True when `variant` has artwork in the current set. */
export const isFoxiconVariant = (
  variant: string | null | undefined,
): variant is FoxiconVariant =>
  Boolean(variant && Object.hasOwn(assetByFoxiconVariant, variant));

/**
 * Renders a MetaMask fox illustration for the given variant at a square size.
 */
const Foxicon = ({ variant, size, testID }: FoxiconProps) => {
  const resolvedVariant = isFoxiconVariant(variant)
    ? variant
    : FOXICON_FALLBACK_VARIANT;

  return (
    <Image
      source={assetByFoxiconVariant[resolvedVariant]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      testID={testID}
    />
  );
};

export default Foxicon;
