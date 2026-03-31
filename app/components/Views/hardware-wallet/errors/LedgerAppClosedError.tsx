import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import ledgerAppClosedImage from '../../../../images/hardware-ledger-app-closed.png';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import ErrorState from './ErrorState';
import type { ErrorComponentProps } from './types';

const LedgerAppClosedError = ({ isBusy, onContinue }: ErrorComponentProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_APP_NOT_OPEN}
    title={strings('hardware_wallet.error.app_not_open')}
    description={strings('hardware_wallet.errors.app_not_open')}
    isBusy={isBusy}
    imageSource={ledgerAppClosedImage}
    imageClassName="h-[280px] w-[320px]"
    primaryAction={{
      label: strings('hardware_wallet.common.continue'),
      onPress: onContinue,
      testID: HardwareWalletTestIds.CONTINUE_BUTTON,
      variant: ButtonVariant.Primary,
    }}
  />
);

export default LedgerAppClosedError;
