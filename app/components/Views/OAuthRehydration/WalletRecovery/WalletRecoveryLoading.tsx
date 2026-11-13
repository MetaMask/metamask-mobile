import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

/**
 * Blank hold while pre-unlock MFA factors are listed — avoids flashing the
 * password step before the system passkey sheet.
 */
const WalletRecoveryLoading = () => (
  <Box
    twClassName="flex-1 bg-default items-center justify-center"
    testID={WalletRecoverySelectorsIDs.LOADING_SCREEN}
  >
    <ActivityIndicator size="large" />
  </Box>
);

export default WalletRecoveryLoading;
