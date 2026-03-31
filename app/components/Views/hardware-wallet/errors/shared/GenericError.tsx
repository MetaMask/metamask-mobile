import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';

import HardwareWalletTestIds from '../../hardwareWallet.testIds';
import ErrorState from '../ErrorState';
import type { ErrorComponentProps } from '../types';
import LedgerDeviceIllustration from '../../components/LedgerDeviceIllustration';

const GenericError = ({
  error,
  isBusy,
  onRetry,
  onExit,
}: ErrorComponentProps) => {
  const description =
    error?.userMessage ??
    strings('hardware_wallet.errors.unknown_error', {
      device: strings('hardware_wallet.device_names.ledger'),
    });

  return (
    <ErrorState
      testID={HardwareWalletTestIds.ERROR_GENERIC}
      title={strings('hardware_wallet.error.something_went_wrong')}
      description={description}
      isBusy={isBusy}
      illustration={<LedgerDeviceIllustration state="not-found" />}
      primaryAction={{
        label: strings('hardware_wallet.common.continue'),
        onPress: onExit,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Primary,
      }}
      secondaryAction={{
        label: strings('hardware_wallet.error.retry'),
        onPress: onRetry,
        testID: HardwareWalletTestIds.RETRY_BUTTON,
        variant: ButtonVariant.Secondary,
      }}
    />
  );
};

export default GenericError;
