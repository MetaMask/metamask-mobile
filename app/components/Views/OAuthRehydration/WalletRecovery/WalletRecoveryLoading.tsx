import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryLoadingProps {
  onBack: () => void;
}

/**
 * Blank hold while pre-unlock MFA factors are listed — avoids flashing the
 * password step before Verify it's you.
 */
const WalletRecoveryLoading = ({ onBack }: WalletRecoveryLoadingProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={WalletRecoverySelectorsIDs.LOADING_SCREEN}
    >
      <HeaderStandard
        title={strings('wallet_recovery_mfa.header')}
        onBack={onBack}
        includesTopInset
      />

      <Box twClassName="flex-1 items-center justify-center px-4">
        <ActivityIndicator size="large" />
      </Box>
    </Box>
  );
};

export default WalletRecoveryLoading;
