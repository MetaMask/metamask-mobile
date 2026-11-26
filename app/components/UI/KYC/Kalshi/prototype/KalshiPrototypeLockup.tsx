// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PROTOTYPE_COPY } from './prototypeConstants';

/**
 * The MetaMask x Kalshi co-brand, as the partner code screen shows it above
 * its title. A text stand-in: the designed lockup needs its own assets.
 *
 * @returns The lockup.
 */
const KalshiPrototypeLockup = () => (
  <Box
    twClassName="self-center rounded-full bg-muted px-3 py-1"
    accessibilityLabel={PROTOTYPE_COPY.lockup}
  >
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {PROTOTYPE_COPY.lockup}
    </Text>
  </Box>
);

export default KalshiPrototypeLockup;
