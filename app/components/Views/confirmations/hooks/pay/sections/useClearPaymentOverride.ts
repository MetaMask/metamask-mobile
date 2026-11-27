import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';

import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import {
  selectPaymentOverrideByTransactionId,
  selectTransactionPayIsMaxAmountByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import { isPremiumDepositCandidate } from '../../../../../UI/Money/utils/moneyAccountPremiumDeposit';
import { MONEY_ACCOUNT_DEPOSIT_TYPES } from '../../../constants/confirmations';
import { LIGHTER_PAYMENT_OVERRIDE } from '../../../temp-lighter/perps-lighter-transactions';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';

/**
 * Clears any active `paymentOverride` on the current transaction.
 * Call from every non-money-account section's press handler so that
 * switching away from money account correctly resets the override.
 *
 * The Lighter override is kept. It sets the destination of the deposit, not
 * the pay-with method, so changing the pay token must not clear it.
 *
 * Preserve `atomic: false` for premium deposit candidates and max-amount
 * Money Account deposits when the payment method changes.
 */
export function useClearPaymentOverride() {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMaxAmount = useSelector((state: RootState) =>
    selectTransactionPayIsMaxAmountByTransactionId(state, transactionId),
  );
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const isPremiumDeposit = useSelector((state: RootState) =>
    Boolean(
      transactionMeta &&
        hasTransactionType(transactionMeta, MONEY_ACCOUNT_DEPOSIT_TYPES) &&
        isPremiumDepositCandidate(state, transactionMeta.chainId),
    ),
  );

  return useCallback(() => {
    if (
      transactionId &&
      paymentOverride &&
      paymentOverride !== PaymentOverride.PerpsLighter
    ) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.paymentOverride = undefined;
          config.refundTo = undefined;
          config.atomic =
            isPremiumDeposit || (isMoneyAccountDeposit && isMaxAmount)
              ? false
              : undefined;
        },
      );
    }
  }, [
    isMaxAmount,
    isMoneyAccountDeposit,
    isPremiumDeposit,
    paymentOverride,
    transactionId,
  ]);
}
