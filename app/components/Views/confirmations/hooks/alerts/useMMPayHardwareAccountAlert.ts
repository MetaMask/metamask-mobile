import { useMemo } from 'react';
import { hasTransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useIsMMPayHardwareEnabled } from '../pay/useIsMMPayHardwareEnabled';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { PAY_TRANSACTION_TYPES } from '../../constants/confirmations';

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const payingAccount = useTransactionPayingAccount();
  const fiatPayment = useTransactionPayFiatPayment();
  const isHardwarePayEnabled = useIsMMPayHardwareEnabled();

  const isPayTransaction = hasTransactionType(
    transactionMeta,
    PAY_TRANSACTION_TYPES,
  );

  const isHardwareWallet = isHardwareAccount(payingAccount ?? '');
  const isQRWallet = isQRHardwareAccount(payingAccount ?? '');

  // Fiat payments are bought directly to the destination, so the paying
  // account never signs.
  const isFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return useMemo(() => {
    if (!isPayTransaction || !isHardwareWallet || isFiatPayment) {
      return [];
    }

    // QR wallets stay blocked: relay funding transactions are submitted in the
    // background and cannot drive the interactive scan loop.
    if (isHardwarePayEnabled && !isQRWallet) {
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
  }, [
    isFiatPayment,
    isHardwareWallet,
    isHardwarePayEnabled,
    isPayTransaction,
    isQRWallet,
  ]);
}
