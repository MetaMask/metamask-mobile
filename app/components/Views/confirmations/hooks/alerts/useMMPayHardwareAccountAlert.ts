import { useMemo } from 'react';
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

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();

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

    // QR wallets (e.g. Keystone) do not support MMPay transactions
    // including mUSD conversion due to signing limitations.
    if (isMusdConversion && !isQRWallet) {
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
  }, [isHardwareWallet, isMusdConversion, isQRWallet]);
}
