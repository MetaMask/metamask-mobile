import { ApprovalType, ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import { TransactionType } from '@metamask/transaction-controller';
import type { ApprovalRequest } from '@metamask/approval-controller';
import type { Json } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { isMoneyDepositTx } from './moneyTransactionGuards';

function isMoneyDepositApproval(
  approvalRequest: ApprovalRequest<Record<string, Json>>,
): boolean {
  if (approvalRequest.origin !== ORIGIN_METAMASK) {
    return false;
  }

  if (approvalRequest.type === ApprovalType.Transaction) {
    const transactionMeta =
      Engine.context.TransactionController.state.transactions.find(
        (tx) => tx.id === approvalRequest.id,
      );
    if (!transactionMeta) {
      return false;
    }
    return isMoneyDepositTx(transactionMeta);
  }

  if (approvalRequest.type === ApprovalType.TransactionBatch) {
    const batchMeta =
      Engine.context.TransactionController.state.transactionBatches.find(
        (batch) => batch.id === approvalRequest.id,
      );
    return Boolean(
      batchMeta?.transactions?.some(
        (nested) => nested.type === TransactionType.moneyAccountDeposit,
      ),
    );
  }

  return false;
}

export function cancelInternalTransactionApprovals(): void {
  const pendingApprovals =
    Engine.context.ApprovalController.state.pendingApprovals;
  const staleApprovalIds = Object.values(pendingApprovals)
    .filter(isMoneyDepositApproval)
    .map((approvalRequest) => approvalRequest.id);

  for (const id of staleApprovalIds) {
    Engine.rejectPendingApproval(id, providerErrors.userRejectedRequest(), {
      ignoreMissing: true,
      logErrors: false,
    });
  }
}
