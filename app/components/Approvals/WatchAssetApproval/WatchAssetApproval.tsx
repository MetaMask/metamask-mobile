import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import WatchAssetRequest from '../../Views/confirmations/legacy/components/WatchAssetRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';

const WatchAssetApproval = () => {
  const { approvalRequest, pageMeta, onConfirm, onReject } =
    useApprovalRequest();

  const asset = approvalRequest?.requestData;

  if (!asset) return null;

  return (
    <ApprovalModal
      isVisible={approvalRequest.type === ApprovalTypes.WATCH_ASSET}
      onCancel={onReject}
    >
      <WatchAssetRequest
        onCancel={onReject}
        onConfirm={onConfirm}
        suggestedAssetMeta={asset}
        currentPageInformation={pageMeta}
      />
    </ApprovalModal>
  );
};

export default WatchAssetApproval;
