import Engine from '../../../../core/Engine';
import { useCallback } from 'react';
import { providerErrors } from '@metamask/rpc-errors';
import { useSelector } from 'react-redux';
import { selectPendingApprovals } from '../../../../selectors/approvalController';
import { cloneDeep, isEqual } from 'lodash';
import { ApprovalRequest } from '@metamask/approval-controller';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApprovalRequestType = ApprovalRequest<any>;

const useApprovalRequest = () => {
  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);

  const approvalRequest = Object.values(pendingApprovals ?? {})[0] as
    | ApprovalRequestType
    | undefined;

  const pageMeta = approvalRequest?.requestData?.pageMeta ?? {};

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

  const onReject = useCallback(() => {
    if (!approvalRequest) return;

    Engine.rejectPendingApproval(
      approvalRequest.id,
      providerErrors.userRejectedRequest(),
    );
  }, [approvalRequest]);

  return {
    approvalRequest: cloneDeep(approvalRequest),
    pageMeta,
    onConfirm,
    onReject,
  };
};

export default useApprovalRequest;
