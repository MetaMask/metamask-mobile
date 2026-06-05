import { ApprovalType, ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';

export function cancelInternalTransactionApprovals(): void {
  const pendingApprovals =
    Engine.context.ApprovalController.state.pendingApprovals;
  const staleApprovalIds = Object.values(pendingApprovals)
    .filter(
      (approvalRequest) =>
        approvalRequest.origin === ORIGIN_METAMASK &&
        (approvalRequest.type === ApprovalType.Transaction ||
          approvalRequest.type === ApprovalType.TransactionBatch),
    )
    .map((approvalRequest) => approvalRequest.id);

  for (const id of staleApprovalIds) {
    Engine.rejectPendingApproval(id, providerErrors.userRejectedRequest(), {
      ignoreMissing: true,
      logErrors: false,
    });
  }
}
