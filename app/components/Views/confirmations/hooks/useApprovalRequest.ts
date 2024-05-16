import Engine from '../../../../core/Engine';
import { useCallback } from 'react';
import { providerErrors } from '@metamask/rpc-errors';
import { useDispatch, useSelector } from 'react-redux';
import { selectPendingApprovals } from '../../../../selectors/approvalController';
import { cloneDeep, isEqual } from 'lodash';
import { ApprovalRequest } from '@metamask/approval-controller';

import { recordRejectionToRequestFromOrigin } from '../../../../actions/requests';

const useApprovalRequest = () => {
  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);
  const dispatch = useDispatch();

  const approvalRequest = Object.values(pendingApprovals ?? {})[0] as
    | ApprovalRequest<any>
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

    if (approvalRequest?.requestData?.origin) {
      dispatch(
        recordRejectionToRequestFromOrigin(
          approvalRequest?.requestData?.origin,
        ),
      );
    }
  }, [approvalRequest, dispatch]);

  return {
    approvalRequest: cloneDeep(approvalRequest),
    pageMeta,
    onConfirm,
    onReject,
  };
};

export default useApprovalRequest;
