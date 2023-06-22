import {
  ApprovalControllerState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import Engine from '../../core/Engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cloneDeep } from 'lodash';
import { ethErrors } from 'eth-rpc-errors';

const useApprovalRequest = () => {
  const [approvalRequest, setApprovalRequest] = useState<
    ApprovalRequest<any> | undefined
  >(undefined);
  const [pageMeta, setPageMeta] = useState<Record<string, any>>({});
  const handledIds = useRef<string[]>([]);

  const handleApprovalControllerStateChange = useCallback(
    (approvalControllerState: ApprovalControllerState) => {
      const pendingApprovalRequest = Object.values(
        approvalControllerState.pendingApprovals,
      )[0];

      const newApprovalRequest =
        pendingApprovalRequest &&
        !handledIds.current.includes(pendingApprovalRequest.id)
          ? pendingApprovalRequest
          : undefined;

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

    handledIds.current = [...handledIds.current, approvalRequest.id];
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
