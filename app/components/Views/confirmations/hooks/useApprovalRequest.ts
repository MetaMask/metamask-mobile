import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ApprovalRequest } from '@metamask/approval-controller';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';
import { selectFirstPendingApproval } from '../../../../selectors/approvalController';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApprovalRequestType = ApprovalRequest<any>;

const useApprovalRequest = () => {
  const approvalRequest = useSelector(selectFirstPendingApproval) as
    | ApprovalRequestType
    | undefined;

  const onConfirm = useCallback(
    async (
      opts?: Parameters<typeof Engine.acceptPendingApproval>[2],
      value?: Parameters<typeof Engine.acceptPendingApproval>[1],
    ) => {
      if (!approvalRequest) return;
      await Engine.acceptPendingApproval(
        approvalRequest.id,
        { ...approvalRequest.requestData, ...(value || {}) },
        opts,
      );
    },
    [approvalRequest],
  );

  const onReject = useCallback(
    (error?: Error) => {
      if (!approvalRequest) return;

      Engine.rejectPendingApproval(
        approvalRequest.id,
        error ?? providerErrors.userRejectedRequest(),
      );
    },
    [approvalRequest],
  );

  const pageMeta = useMemo(
    () =>
      approvalRequest?.requestData?.pageMeta ??
      approvalRequest?.requestData?.metadata?.pageMeta ??
      {},
    [approvalRequest],
  );

  return useMemo(
    () => ({
      approvalRequest,
      pageMeta,
      onConfirm,
      onReject,
    }),
    [approvalRequest, pageMeta, onConfirm, onReject],
  );
};

export default useApprovalRequest;
