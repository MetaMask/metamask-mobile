import React, { useCallback } from 'react';
import useApprovalRequest from '../hooks/useApprovalRequest';
import WatchAssetRequest from '../UI/WatchAssetRequest';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import Engine from '../../core/Engine';
import { ethErrors } from 'eth-rpc-errors';
import ApprovalModal from './ApprovalModal';

const WatchAssetApproval = () => {
  const { approvalRequest, pageMeta, setApprovalRequestHandled } =
    useApprovalRequest();

  const onWatchAssetConfirm = useCallback(() => {
    if (!approvalRequest) return;

    Engine.acceptPendingApproval(
      approvalRequest.id,
      approvalRequest.requestData,
    );

    setApprovalRequestHandled(approvalRequest);
  }, [approvalRequest, setApprovalRequestHandled]);

  const onWatchAssetReject = useCallback(() => {
    if (!approvalRequest) return;

    Engine.rejectPendingApproval(
      approvalRequest.id,
      ethErrors.provider.userRejectedRequest(),
    );

    setApprovalRequestHandled(approvalRequest);
  }, [approvalRequest, setApprovalRequestHandled]);

  const asset = approvalRequest?.requestData;

  if (!asset) return null;

  return (
    <ApprovalModal
      isVisible={approvalRequest?.type === ApprovalTypes.WATCH_ASSET}
      onCancel={onWatchAssetReject}
    >
      <WatchAssetRequest
        onCancel={onWatchAssetReject}
        onConfirm={onWatchAssetConfirm}
        suggestedAssetMeta={asset}
        currentPageInformation={pageMeta}
      />
    </ApprovalModal>
  );
};

export default WatchAssetApproval;
