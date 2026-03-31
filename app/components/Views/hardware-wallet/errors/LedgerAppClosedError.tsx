import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import LedgerFailed from '../../../../images/ledger-failed.svg';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import ErrorState from './ErrorState';
import type { ErrorComponentProps } from './types';

const LedgerAppClosedError = ({ isBusy, onRetry }: ErrorComponentProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_APP_NOT_OPEN}
    title={strings('hardware_wallet.error.app_not_open')}
    description={strings('hardware_wallet.errors.app_not_open')}
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

export default LedgerAppClosedError;
