import React from 'react';

import { assetByFoxiconVariant } from './Foxicon.assets';
import { FoxiconSelectorsIDs } from './Foxicon.testIds';
import { FoxiconProps } from './Foxicon.types';

/**
 * Renders a MetaMask fox illustration for the given variant at a square size.
 */
const Foxicon = ({
  variant,
  size,
  testID = FoxiconSelectorsIDs.CONTAINER,
}: FoxiconProps) => {
  const FoxSVG = assetByFoxiconVariant[variant];

  return <FoxSVG name={variant} width={size} height={size} testID={testID} />;
};

export default Foxicon;
