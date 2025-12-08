import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { cloneDeep, isEqual } from 'lodash';
import { ApprovalRequest } from '@metamask/approval-controller';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';
import { selectPendingApprovals } from '../../../../selectors/approvalController';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApprovalRequestType = ApprovalRequest<any>;

const useApprovalRequest = () => {
  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);
  const pendingApprovalList = Object.values(pendingApprovals ?? {});

  const firstPendingApproval = pendingApprovalList[0] as
    | ApprovalRequestType
    | undefined;

  const approvalRequest = useMemo(
    () => cloneDeep(firstPendingApproval),
    [firstPendingApproval],
  );

  const hasPendingApproval = useCallback(
    (approvalId?: string) =>
      Boolean(approvalId && pendingApprovals?.[approvalId]),
    [pendingApprovals],
  );

  const onConfirm = useCallback(
    async (
      opts?: Parameters<typeof Engine.acceptPendingApproval>[2],
      value?: Parameters<typeof Engine.acceptPendingApproval>[1],
    ) => {
      if (!approvalRequest) {
        return;
      }

      // Approval may already be resolved/removed (e.g., Smart Transactions finishing in the background).
      if (!hasPendingApproval(approvalRequest.id)) {
        return;
      }

      await Engine.acceptPendingApproval(
        approvalRequest.id,
        { ...approvalRequest.requestData, ...(value || {}) },
        opts,
      );
    },
    [approvalRequest, hasPendingApproval],
  );

  const onReject = useCallback(
    (error?: Error) => {
      if (!approvalRequest) {
        return;
      }

      if (!hasPendingApproval(approvalRequest.id)) {
        return;
      }

      Engine.rejectPendingApproval(
        approvalRequest.id,
        error ?? providerErrors.userRejectedRequest(),
      );
    },
    [approvalRequest, hasPendingApproval],
  );

  const pageMeta = useMemo(
    () =>
      approvalRequest?.requestData?.pageMeta ??
      approvalRequest?.requestData?.metadata?.pageMeta ??
      {},
    [approvalRequest],
  );

  return {
    approvalRequest,
    pageMeta,
    onConfirm,
    onReject,
  };
};

export default useApprovalRequest;
