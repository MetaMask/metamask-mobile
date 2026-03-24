import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';

import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import SRPErrorScreen from './SRPErrorScreen';

interface WalletCreationErrorParams {
  metricsEnabled: boolean;
  error: Error;
}

const WalletCreationError = () => {
  const route =
    useRoute<RouteProp<{ params: WalletCreationErrorParams }, 'params'>>();

  const { metricsEnabled, error } = route.params || {};

  // Render different UI based on metrics consent status
  if (metricsEnabled) {
    return <SocialLoginErrorSheet error={error} />;
  }

  return <SRPErrorScreen error={error} />;
};

export default WalletCreationError;
