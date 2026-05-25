import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';

import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import SRPErrorScreen from './SRPErrorScreen';
import { AccountType } from '../../../constants/onboarding';

interface WalletCreationErrorParams {
  metricsEnabled: boolean;
  error: Error;
  accountType?: AccountType;
}

const WalletCreationError = () => {
  const route =
    useRoute<RouteProp<{ params: WalletCreationErrorParams }, 'params'>>();

  const { metricsEnabled, error, accountType } = route.params || {};

  // Render different UI based on metrics consent status
  if (metricsEnabled) {
    return (
      <SocialLoginErrorSheet
        error={error}
        accountType={accountType ?? AccountType.Metamask}
      />
    );
  }

  return (
    <SRPErrorScreen
      error={error}
      accountType={accountType ?? AccountType.Metamask}
    />
  );
};

export default WalletCreationError;
