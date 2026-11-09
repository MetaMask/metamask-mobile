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
import { selectIsMfaMoneyKeyringAddress } from '../../../../../../selectors/keyringController';
import { resolveMoneyAccountDepositAtomic } from '../../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';

/**
 * Clears any active `paymentOverride` on the current transaction.
 * Call from every non-money-account section's press handler so that
 * switching away from money account correctly resets the override.
 *
 * `atomic` is re-derived rather than blindly cleared: a Money Account deposit
 * can require `atomic: false` independently of the pay-with selection — on a
 * max amount, or on an MFA keyring — so that must survive a payment-method
 * switch. The signing account is the Money Account whichever token funds it,
 * so switching payment method never changes the MFA cost.
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
  const isMfaMoneyKeyring = useSelector((state: RootState) =>
    selectIsMfaMoneyKeyringAddress(state, transactionMeta?.txParams?.from),
  );

  return useCallback(() => {
    if (transactionId && paymentOverride) {
      Engine.context.TransactionPayController.setTransactionConfig(
        transactionId,
        (config) => {
          config.paymentOverride = undefined;
          config.refundTo = undefined;

          const { atomic, atomicForbidden } = isMoneyAccountDeposit
            ? resolveMoneyAccountDepositAtomic({
                isMaxAmount: Boolean(isMaxAmount),
                isMfaKeyring: isMfaMoneyKeyring,
                // Clearing the override drops the Money Account pay token, so
                // no subsidised fixed-spread route survives the switch.
                shouldHintAtomicMax: false,
              })
            : { atomic: undefined, atomicForbidden: undefined };

          config.atomic = atomic;
          config.atomicForbidden = atomicForbidden;
        },
      );
    }
  }, [
    isMaxAmount,
    isMfaMoneyKeyring,
    isMoneyAccountDeposit,
    paymentOverride,
    transactionId,
  ]);
}
