import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

/**
 * Reject every unapproved transaction so a stale one is not picked up by the
 * next confirmation screen. Best-effort: failures are logged, not thrown.
 *
 * @param transactions - Transactions to scan; only `unapproved` ones are rejected.
 */
export function rejectPendingTransactions(transactions: TransactionMeta[]) {
  const { ApprovalController } = Engine.context;

  for (const tx of transactions) {
    if (tx.status !== TransactionStatus.unapproved) {
      continue;
    }
    try {
      ApprovalController.rejectRequest(
        tx.id,
        providerErrors.userRejectedRequest(),
      );
    } catch (error) {
      Logger.error(error as Error, 'Failed to reject pending transaction');
    }
  }
}
