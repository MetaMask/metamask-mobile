import {
  ApprovalControllerState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import Engine from '../../core/Engine';
import { useCallback, useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { ethErrors } from 'eth-rpc-errors';

const useApprovalRequest = () => {
  const [approvalRequest, setApprovalRequest] = useState<
    ApprovalRequest<any> | undefined
  >(undefined);
  const [pageMeta, setPageMeta] = useState<Record<string, any>>({});

  const handleApprovalControllerStateChange = useCallback(
    (approvalControllerState: ApprovalControllerState) => {
      const newApprovalRequest = Object.values(
        approvalControllerState.pendingApprovals,
      )[0];

      setApprovalRequest(newApprovalRequest);
      setPageMeta((newApprovalRequest?.requestData?.pageMeta as any) ?? {});
    },
    [],
  );

  useEffect(() => {
    Engine.controllerMessenger.subscribe(
      'ApprovalController:stateChange',
      handleApprovalControllerStateChange,
    );
  }, [handleApprovalControllerStateChange]);

  const setApprovalRequestHandled = useCallback(() => {
    if (!approvalRequest) {
      return;
    }

    setApprovalRequest(undefined);
  }, [approvalRequest]);

  const onConfirm = useCallback(() => {
    if (!approvalRequest) return;

    setApprovalRequestHandled();

    Engine.acceptPendingApproval(
      approvalRequest.id,
      approvalRequest.requestData,
    );
  }, [approvalRequest, setApprovalRequestHandled]);

  const onReject = useCallback(() => {
    if (!approvalRequest) return;

    setApprovalRequestHandled();

    Engine.rejectPendingApproval(
      approvalRequest.id,
      ethErrors.provider.userRejectedRequest(),
    );
  }, [approvalRequest, setApprovalRequestHandled]);

  return {
    approvalRequest: cloneDeep(approvalRequest),
    pageMeta,
    setApprovalRequestHandled,
    onConfirm,
    onReject,
  };
};

export default useApprovalRequest;
