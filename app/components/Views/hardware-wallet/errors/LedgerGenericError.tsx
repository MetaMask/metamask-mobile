import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import LedgerDeviceIllustration from '../components/LedgerDeviceIllustration';
import ErrorState from './ErrorState';

type LedgerGenericErrorProps = {
  description: string;
  isBusy?: boolean;
  onRetry: () => void;
  onContinue: () => void;
};

const LedgerGenericError = ({
  description,
  isBusy,
  onRetry,
  onContinue,
}: LedgerGenericErrorProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_GENERIC}
    title={strings('hardware_wallet.error.something_went_wrong')}
    description={description}
    isBusy={isBusy}
    illustration={<LedgerDeviceIllustration state="not-found" />}
    primaryAction={{
      label: strings('hardware_wallet.common.continue'),
      onPress: onContinue,
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

export default LedgerGenericError;
