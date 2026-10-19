import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import {
  selectBatchTransactionCounts,
  selectTransactions,
} from '../../../../selectors/transactionController';
import {
  selectAccountOverrideByTransactionId,
  selectTransactionPayFiatPaymentByTransactionId,
  selectTransactionPayRawQuotesByTransactionId,
} from '../../../../selectors/transactionPayController';
import { isHardwareAccount } from '../../../../util/address';
import {
  haveRequiredTransactionsBeenSigned,
  isTransactionStatusSignedOrLater,
} from '../../../Views/confirmations/utils/batch-signing';
import { isMoneyDepositTx } from './moneyTransactionGuards';

/** Parent statuses during which funding legs may still be awaiting signature. */
const SIGNING_IN_FLIGHT_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
]);

/**
 * A Money Account deposit whose funding legs a hardware wallet signs on-device.
 * The payer is `accountOverride` (falling back to `from`); fiat deposits never
 * sign funding legs, even when the override still names a hardware account.
 */
export function isHardwareFundedDeposit(
  state: RootState,
  transactionMeta: TransactionMeta,
): boolean {
  if (!isMoneyDepositTx(transactionMeta) || transactionMeta.metamaskPay?.fiat) {
    return false;
  }

  const fiatPayment = selectTransactionPayFiatPaymentByTransactionId(
    state,
    transactionMeta.id,
  );
  if (fiatPayment?.selectedPaymentMethodId) {
    return false;
  }

  const payingAccount =
    selectAccountOverrideByTransactionId(state, transactionMeta.id) ??
    transactionMeta.txParams?.from;

  return Boolean(payingAccount && isHardwareAccount(payingAccount));
}

/** True once the parent moved past `approved` or every funding leg is signed. */
export function isHardwareDepositSigningComplete(
  state: RootState,
  transactionMeta: TransactionMeta,
): boolean {
  if (isTransactionStatusSignedOrLater(transactionMeta.status)) {
    return true;
  }

  // Pay may hold an empty quotes array; a deposit still needs at least one leg.
  const expectedQuoteCount = Math.max(
    1,
    selectTransactionPayRawQuotesByTransactionId(state, transactionMeta.id)
      ?.length ?? 0,
  );

  return haveRequiredTransactionsBeenSigned(
    transactionMeta.id,
    {
      transactions: selectTransactions(state),
      batchTransactionCounts: selectBatchTransactionCounts(state),
    },
    expectedQuoteCount,
  );
}

/**
 * Deposits whose in-progress toast may be unblocked by `transactionMeta`
 * reaching `signed`: the deposit itself, or a deposit funded by that leg.
 */
export function findDepositsAwaitingSignature(
  state: RootState,
  transactionMeta: TransactionMeta,
): TransactionMeta[] {
  return selectTransactions(state).filter(
    (candidate) =>
      isMoneyDepositTx(candidate) &&
      SIGNING_IN_FLIGHT_STATUSES.has(candidate.status) &&
      (candidate.id === transactionMeta.id ||
        (candidate.requiredTransactionIds ?? []).includes(transactionMeta.id)),
  );
}
