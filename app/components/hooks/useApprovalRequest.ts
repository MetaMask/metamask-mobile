import {
  ApprovalControllerState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import Engine from '../../core/Engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cloneDeep } from 'lodash';

const useApprovalRequest = (): {
  approvalRequest: ApprovalRequest<any> | undefined;
  pageMeta: Record<string, any>;
  setApprovalRequestHandled: (
    handledApprovalRequest?: ApprovalRequest<any>,
  ) => void;
} => {
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

  const setApprovalRequestHandled = useCallback(
    (handledApprovalRequest?: ApprovalRequest<any>) => {
      if (!handledApprovalRequest) {
        return;
      }

      handledIds.current = [...handledIds.current, handledApprovalRequest.id];
    },
    [],
  );

  return {
    approvalRequest: cloneDeep(approvalRequest),
    pageMeta,
    setApprovalRequestHandled,
  };
};

export default useApprovalRequest;
