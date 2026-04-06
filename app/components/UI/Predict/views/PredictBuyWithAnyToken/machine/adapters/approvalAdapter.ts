import type { ApprovalPort } from '../ports';

interface ApprovalRequestHook {
  approvalRequest: { id: string } | undefined;
  onConfirm: (opts?: {
    deleteAfterResult?: boolean;
    waitForResult?: boolean;
    handleErrors?: boolean;
  }) => void;
}

interface ConfirmActionsHook {
  onReject: (error?: Error, skipNavigation?: boolean) => void;
}

export function createApprovalAdapter(
  approvalHook: ApprovalRequestHook,
  confirmActionsHook: ConfirmActionsHook,
): ApprovalPort {
  return {
    getApprovalTransactionId: () => approvalHook.approvalRequest?.id,

    confirmApproval: () =>
      approvalHook.onConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      }),

    rejectApproval: () => confirmActionsHook.onReject(undefined, true),
  };
}
