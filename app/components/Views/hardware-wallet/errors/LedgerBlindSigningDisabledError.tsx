import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import ledgerBlindSigningImage from '../../../../images/hardware-ledger-blind-signing.png';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import ErrorState from './ErrorState';
import type { ErrorComponentProps } from './types';

const LedgerBlindSigningDisabledError = ({
  isBusy,
  onContinue,
}: ErrorComponentProps) => (
  <ErrorState
    testID={HardwareWalletTestIds.ERROR_BLIND_SIGNING_DISABLED}
    title={strings('hardware_wallet.error.blind_signing_disabled')}
    description={strings('hardware_wallet.errors.blind_signing')}
    isBusy={isBusy}
    imageSource={ledgerBlindSigningImage}
    imageClassName="h-[260px] w-[300px]"
    primaryAction={{
      label: strings('hardware_wallet.common.continue'),
      onPress: onContinue,
      testID: HardwareWalletTestIds.CONTINUE_BUTTON,
      variant: ButtonVariant.Primary,
    }}
  />
);

export default LedgerBlindSigningDisabledError;
