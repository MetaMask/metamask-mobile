import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import LedgerFailed from '../../../../images/ledger-failed.svg';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import ErrorState from './ErrorState';
import type { ErrorComponentProps } from './types';

const LedgerBlindSigningDisabledError = ({
  isBusy,
  onRetry,
}: ErrorComponentProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_BLIND_SIGNING_DISABLED}
    title={strings('hardware_wallet.error.blind_signing_disabled')}
    description={strings('hardware_wallet.errors.blind_signing')}
    isBusy={isBusy}
    illustration={<LedgerFailed width={280} height={260} />}
    primaryAction={{
      label: strings('hardware_wallet.error.retry'),
      onPress: onRetry,
      testID: HardwareWalletTestIds.RETRY_BUTTON,
      variant: ButtonVariant.Primary,
    }}
  />
);

export default LedgerBlindSigningDisabledError;
