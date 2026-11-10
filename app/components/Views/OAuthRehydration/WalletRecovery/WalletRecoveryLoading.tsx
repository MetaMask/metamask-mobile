import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryLoadingProps {
  /**
   * Kept for call-site compatibility; blank hold has no chrome / back control.
   */
  onBack?: () => void;
}

/**
 * Blank hold while pre-unlock MFA factors are listed — avoids flashing the
 * password step before the system passkey / MFA sheet.
 */
const WalletRecoveryLoading = (_props: WalletRecoveryLoadingProps) => (
  <Box
    twClassName="flex-1 bg-default items-center justify-center"
    testID={WalletRecoverySelectorsIDs.LOADING_SCREEN}
  >
    <ActivityIndicator size="large" />
  </Box>
);

export default WalletRecoveryLoading;
