import { TransactionType } from '@metamask/transaction-controller';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import type { JsonMap } from '../../../../../util/analytics/analytics.types';
import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';

const TRANSACTION_TYPES_FOR_ACTIVE_AB_TESTS: ReadonlySet<TransactionType> =
  new Set([
    TransactionType.swap,
    TransactionType.bridge,
    TransactionType.swapApproval,
    TransactionType.swapAndSend,
    TransactionType.bridgeApproval,
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

/**
 * Adds `active_ab_tests` to Transaction Added for swap/bridge/perps/predict flows when
 * the user entered those flows with tracked A/B assignments (e.g. homepage trending sections).
 */
export function getSwapTransactionActiveAbTestProperties({
  eventType,
  transactionMeta,
  getState,
}: TransactionMetricsBuilderRequest): TransactionMetrics {
  if (eventType.category !== TRANSACTION_EVENTS.TRANSACTION_ADDED.category) {
    return { properties: {}, sensitiveProperties: {} };
  }

  const { type } = transactionMeta;
  if (!type || !TRANSACTION_TYPES_FOR_ACTIVE_AB_TESTS.has(type)) {
    return { properties: {}, sensitiveProperties: {} };
  }

  const tests = getState().bridge?.transactionActiveAbTests;
  if (!tests?.length) {
    return { properties: {}, sensitiveProperties: {} };
  }

  const properties: JsonMap = {
    active_ab_tests: tests,
  };

  return { properties, sensitiveProperties: {} };
}
