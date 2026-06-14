import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { selectMetaMaskPayHardwareFlags } from '../../../../../selectors/featureFlagController/confirmations';

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabled: isHardwarePayEnabled } = useSelector(
    selectMetaMaskPayHardwareFlags,
  );

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const isMusdConversion = hasTransactionType(transactionMeta, [
    TransactionType.musdConversion,
  ]);

  const isHardwareWallet = isHardwareAccount(from ?? '');
  const isQRWallet = isQRHardwareAccount(from ?? '');

  return useMemo(() => {
    if (!isHardwareWallet) {
      return [];
    }

    if (isMusdConversion && isHardwarePayEnabled && !isQRWallet) {
      return [];
    }

    return [
      {
        key: AlertKeys.MMPayHardwareAccount,
        title: strings('alert_system.mmpay_hardware_account.title'),
        message: strings('alert_system.mmpay_hardware_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isHardwareWallet, isHardwarePayEnabled, isMusdConversion, isQRWallet]);
}
