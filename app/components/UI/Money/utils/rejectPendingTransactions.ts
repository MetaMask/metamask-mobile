import { providerErrors } from '@metamask/rpc-errors';
import { TransactionStatus } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

/**
 * Reject every unapproved transaction so a stale one is not picked up by the
 * next confirmation screen. Scans the TransactionController's current
 * transactions; only `unapproved` ones are rejected. Best-effort: failures are
 * logged, not thrown.
 */
export function rejectPendingTransactions() {
  const { ApprovalController, TransactionController } = Engine.context;
  const transactions = TransactionController.state.transactions ?? [];

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
