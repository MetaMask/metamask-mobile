import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import AccountApproval from '../../UI/AccountApproval';

const WalletConnectApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();
  const meta = approvalRequest?.requestData?.peerMeta || null;

  const currentPageInformation = {
    title: meta?.name || meta?.title,
    url: meta?.url,
    icon: meta?.icons?.[0],
  };

  return (
    <ApprovalModal
      isVisible={approvalRequest?.type === ApprovalTypes.WALLET_CONNECT}
      onCancel={onReject}
    >
      <AccountApproval
        onCancel={onReject}
        onConfirm={onConfirm}
        currentPageInformation={currentPageInformation}
        walletConnectRequest
      />
    </ApprovalModal>
  );
};

export default WalletConnectApproval;
