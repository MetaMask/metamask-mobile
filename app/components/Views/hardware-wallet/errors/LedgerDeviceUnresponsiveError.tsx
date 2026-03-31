import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import LedgerDeviceIllustration from '../components/LedgerDeviceIllustration';
import ErrorState from './ErrorState';

type LedgerDeviceUnresponsiveErrorProps = {
  isBusy?: boolean;
  onRetry: () => void;
};

const LedgerDeviceUnresponsiveError = ({
  isBusy,
  onRetry,
}: LedgerDeviceUnresponsiveErrorProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_DEVICE_UNRESPONSIVE}
    title={strings('hardware_wallet.error.connection_timeout')}
    description={strings('hardware_wallet.errors.connection_timeout')}
    isBusy={isBusy}
    illustration={<LedgerDeviceIllustration state="not-found" />}
    primaryAction={{
      label: strings('hardware_wallet.error.retry'),
      onPress: onRetry,
      testID: HardwareWalletTestIds.RETRY_BUTTON,
      variant: ButtonVariant.Primary,
    }}
  />
);

export default LedgerDeviceUnresponsiveError;
