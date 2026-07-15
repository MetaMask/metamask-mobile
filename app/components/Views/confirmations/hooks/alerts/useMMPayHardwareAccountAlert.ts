import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { selectMetaMaskPayHardwareFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { PAY_TRANSACTION_TYPES } from '../../constants/confirmations';

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();
  const fiatPayment = useTransactionPayFiatPayment();
  const { enabled: isHardwarePayEnabled } = useSelector(
    selectMetaMaskPayHardwareFlags,
  );

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const isPayTransaction = hasTransactionType(
    transactionMeta,
    PAY_TRANSACTION_TYPES,
  );

  const isMusdConversion = hasTransactionType(transactionMeta, [
    TransactionType.musdConversion,
  ]);

  // When set, accountOverride is the account paying for the transaction,
  // except in withdraw (post-quote) flows where it is only the recipient
  // and never signs.
  const payingAccount = isTransactionPayWithdraw(transactionMeta)
    ? from
    : (accountOverride ?? from);

  const isHardwareWallet = isHardwareAccount(payingAccount ?? '');
  const isQRWallet = isQRHardwareAccount(payingAccount ?? '');

  // Fiat payments are bought directly to the destination, so the paying
  // account never signs.
  const isFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return useMemo(() => {
    if (!isPayTransaction || !isHardwareWallet || isFiatPayment) {
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
  }, [
    isFiatPayment,
    isHardwareWallet,
    isHardwarePayEnabled,
    isMusdConversion,
    isPayTransaction,
    isQRWallet,
  ]);
}
