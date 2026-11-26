import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryLoadingProps {
  /**
   * Optional explanation under the spinner (e.g. Forgot password escrow
   * passkey before Create password).
   */
  message?: string | null;
}

/**
 * Hold while MFA / prefetch runs — avoids flashing the password step before
 * the system passkey sheet. When `message` is set, users understand why they
 * are waiting for a passkey prompt.
 */
const WalletRecoveryLoading = ({
  message = null,
}: WalletRecoveryLoadingProps) => (
  <Box
    className="flex-1 bg-default items-center justify-center px-6"
    testID={WalletRecoverySelectorsIDs.LOADING_SCREEN}
  >
    <ActivityIndicator size="large" />
    {!!message && (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        className="mt-4 text-center"
        testID={WalletRecoverySelectorsIDs.LOADING_MESSAGE}
      >
        {message}
      </Text>
    )}
  </Box>
);

export default WalletRecoveryLoading;
