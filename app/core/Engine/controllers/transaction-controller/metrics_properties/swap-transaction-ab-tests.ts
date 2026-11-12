import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import type {
  JsonMap,
  JsonValue,
} from '../../../../../util/analytics/analytics.types';
import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import {
  peekTransactionAbTestAttributionForTransaction,
  takeTransactionAbTestAttributionForTransaction,
} from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const TRANSACTION_TYPES_FOR_ACTIVE_AB_TESTS: ReadonlySet<TransactionType> =
  new Set([
    TransactionType.swap,
    TransactionType.bridge,
    TransactionType.swapApproval,
    TransactionType.swapAndSend,
    TransactionType.bridgeApproval,
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
    TransactionType.perpsAcrossDeposit,
    TransactionType.perpsDeposit,
    TransactionType.perpsDepositAndOrder,
    TransactionType.perpsRelayDeposit,
    TransactionType.perpsWithdraw,
    TransactionType.predictAcrossDeposit,
    TransactionType.predictClaim,
    TransactionType.predictDeposit,
    TransactionType.predictDepositAndOrder,
    TransactionType.predictWithdraw,
    TransactionType.predictRelayDeposit,
  ]);

const EMPTY_AB_TEST_METRICS: TransactionMetrics = {
  properties: {},
  sensitiveProperties: {},
};

/**
 * Money account withdrawals are submitted as a batch. The withdraw type often
 * sits on a nested transaction rather than the parent `type`.
 */
function includesMoneyAccountWithdraw(
  transactionMeta: TransactionMeta,
): boolean {
  if (transactionMeta.type === TransactionType.moneyAccountWithdraw) {
    return true;
  }

  return (
    transactionMeta.nestedTransactions?.some(
      (nested) => nested.type === TransactionType.moneyAccountWithdraw,
    ) ?? false
  );
}

/**
 * Adds `active_ab_tests` to Transaction Added, Transaction Finalized, and
 * Transaction Rejected when the initiating flow staged an assignment. Added
 * peeks so Finalized, the completion event, can report the same variant.
 * Finalized and Rejected then drop the entry.
 */
export function getSwapTransactionActiveAbTestProperties({
  eventType,
  transactionMeta,
}: TransactionMetricsBuilderRequest): TransactionMetrics {
  const isTransactionAdded =
    eventType.category === TRANSACTION_EVENTS.TRANSACTION_ADDED.category;
  const isTransactionFinalized =
    eventType.category === TRANSACTION_EVENTS.TRANSACTION_FINALIZED.category;
  const isTransactionRejected =
    eventType.category === TRANSACTION_EVENTS.TRANSACTION_REJECTED.category;

  if (
    !isTransactionAdded &&
    !isTransactionFinalized &&
    !isTransactionRejected
  ) {
    return EMPTY_AB_TEST_METRICS;
  }

  const { type } = transactionMeta;
  const typeIsTracked = Boolean(
    type && TRANSACTION_TYPES_FOR_ACTIVE_AB_TESTS.has(type),
  );
  if (!typeIsTracked && !includesMoneyAccountWithdraw(transactionMeta)) {
    return EMPTY_AB_TEST_METRICS;
  }

  // Added peeks so Finalized can still report the variant. Finalized and
  // Rejected consume the entry so abandoned confirmations do not linger.
  const tests =
    isTransactionFinalized || isTransactionRejected
      ? takeTransactionAbTestAttributionForTransaction(transactionMeta.id)
      : peekTransactionAbTestAttributionForTransaction(transactionMeta.id);
  if (!tests?.length) {
    return { properties: {}, sensitiveProperties: {} };
  }

  const properties: JsonMap = {
    // Serializable key/value pairs; structural type lacks JsonMap index signature.
    active_ab_tests: tests as unknown as JsonValue,
  };

  return { properties, sensitiveProperties: {} };
}
