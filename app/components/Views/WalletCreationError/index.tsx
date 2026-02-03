import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';

import SocialLoginErrorSheet from './SocialLoginErrorSheet';
import SRPErrorScreen from './SRPErrorScreen';

interface WalletCreationErrorParams {
  isSocialLogin: boolean;
  error: Error;
}

const WalletCreationError = () => {
  const route =
    useRoute<RouteProp<{ params: WalletCreationErrorParams }, 'params'>>();

  const { isSocialLogin, error } = route.params || {};

  // Render different UI based on login type
  if (isSocialLogin) {
    return <SocialLoginErrorSheet error={error} />;
  }

  return <SRPErrorScreen error={error} />;
};

export default WalletCreationError;
