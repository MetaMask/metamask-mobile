import React from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
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
      variant={ButtonVariants.Secondary}
      size={ButtonSize.Md}
      width={ButtonWidthTypes.Full}
      label={strings('perps.developer_options.simulate_connection_error')}
      onPress={handleSimulateError}
    />
  );
};
