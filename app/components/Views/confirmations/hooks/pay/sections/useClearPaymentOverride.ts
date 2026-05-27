import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';

/**
 * Clears any active `paymentOverride` on the current transaction.
 * Call from every non-money-account section's press handler so that
 * switching away from money account correctly resets the override.
 */
export function useClearPaymentOverride() {
  const transactionId = useTransactionMetadataRequest()?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );

  return useCallback(() => {
    if (transactionId && paymentOverride) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          (config as Record<string, unknown>).paymentOverride = undefined;
        },
      );
    }
  }, [paymentOverride, transactionId]);
}
