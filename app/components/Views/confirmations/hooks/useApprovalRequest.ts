import { useCallback, useMemo, useRef } from 'react';
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

  // Use a ref to track the previous approval request to prevent unnecessary re-renders
  const prevApprovalRequestRef = useRef<ApprovalRequestType | undefined>();

  const approvalRequest = useMemo(
    () => {
      if (!firstPendingApproval) return undefined;

      // For smart transaction status, check if the content has actually changed
      if (firstPendingApproval.type === 'smart_transaction_status') {
        const prevRequest = prevApprovalRequestRef.current;
        const currentRequest = firstPendingApproval;

        // If we have a previous request and the content is the same, return the previous reference
        if (prevRequest &&
            prevRequest.type === currentRequest.type &&
            prevRequest.id === currentRequest.id &&
            isEqual(prevRequest.requestState, currentRequest.requestState)) {
          return prevRequest;
        }
      }

      // Update the ref and return the new request
      const newRequest = cloneDeep(firstPendingApproval);
      prevApprovalRequestRef.current = newRequest;
      return newRequest;
    },
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
