import React from 'react';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsConnectionManager } from '../../services/PerpsConnectionManager';

export const PerpsConnectionErrorButton = () => {
  const handleSimulateError = () => {
    PerpsConnectionManager.forceError('Simulated connection failure');
  };

  // Only show in development builds
  if (!__DEV__) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      isFullWidth
      onPress={handleSimulateError}
    >
      {strings('perps.developer_options.simulate_connection_error')}
    </Button>
  );
};
