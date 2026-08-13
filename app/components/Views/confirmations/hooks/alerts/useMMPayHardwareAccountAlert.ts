import { useMemo } from 'react';
import { hasTransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { isHardwareAccount } from '../../../../../util/address';
import { PAY_TRANSACTION_TYPES } from '../../constants/confirmations';

export function useMMPayHardwareAccountAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();
  const fiatPayment = useTransactionPayFiatPayment();

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const isPayTransaction = hasTransactionType(
    transactionMeta,
    PAY_TRANSACTION_TYPES,
  );

  // When set, accountOverride is the account paying for the transaction,
  // except in withdraw (post-quote) flows where it is only the recipient
  // and never signs.
  const payingAccount = isTransactionPayWithdraw(transactionMeta)
    ? from
    : (accountOverride ?? from);

  const isHardwareWallet = isHardwareAccount(payingAccount ?? '');

  // Fiat payments are bought directly to the destination, so the paying
  // account never signs.
  const isFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return useMemo(() => {
    if (!isPayTransaction || !isHardwareWallet || isFiatPayment) {
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
  }, [isFiatPayment, isHardwareWallet, isPayTransaction]);
}
