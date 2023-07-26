import Engine from '../../core/Engine';
import { useCallback } from 'react';
import { ethErrors } from 'eth-rpc-errors';
import { useSelector } from 'react-redux';
import { selectPendingApprovals } from '../../selectors/approvalController';
import { cloneDeep, isEqual } from 'lodash';
import { AcceptOptions, ApprovalRequest } from '@metamask/approval-controller';

const useApprovalRequest = () => {
  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);

  const approvalRequest = Object.values(pendingApprovals ?? {})[0] as
    | ApprovalRequest<any>
    | undefined;

  const pageMeta = approvalRequest?.requestData?.pageMeta ?? {};

  const onConfirm = useCallback(
    (opts?: AcceptOptions) => {
      if (!approvalRequest) return;

      Engine.acceptPendingApproval(
        approvalRequest.id,
        approvalRequest.requestData,
        opts,
      );
    },
    [approvalRequest],
  );

  const onReject = useCallback(() => {
    if (!approvalRequest) return;

    Engine.rejectPendingApproval(
      approvalRequest.id,
      ethErrors.provider.userRejectedRequest(),
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
