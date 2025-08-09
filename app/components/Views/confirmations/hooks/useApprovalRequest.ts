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
    () => approvalRequest?.requestData?.pageMeta ?? {},
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
