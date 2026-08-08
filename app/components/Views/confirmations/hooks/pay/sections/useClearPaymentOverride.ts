import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import {
  selectPaymentOverrideByTransactionId,
  selectTransactionPayIsMaxAmountByTransactionId,
} from '../../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';

/**
 * Clears any active `paymentOverride` on the current transaction.
 * Call from every non-money-account section's press handler so that
 * switching away from money account correctly resets the override.
 *
 * `atomic` is re-derived rather than blindly cleared: a max-amount Money
 * Account deposit sets `atomic: false` independently of the pay-with
 * selection (via `setMoneyAccountDepositMaxAtomic`), so it must survive a
 * payment-method switch while `isMaxAmount` remains on.
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

  return useCallback(() => {
    if (transactionId && paymentOverride) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.paymentOverride = undefined;
          config.refundTo = undefined;
          config.atomic =
            isMoneyAccountDeposit && isMaxAmount ? false : undefined;
        },
      );
    }
  }, [isMaxAmount, isMoneyAccountDeposit, paymentOverride, transactionId]);
}
