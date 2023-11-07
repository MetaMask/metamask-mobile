import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import AddCustomNetwork from '../../UI/AddCustomNetwork';

const AddChainApproval = () => {
  const { approvalRequest, pageMeta, onConfirm, onReject } =
    useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.ADD_ETHEREUM_CHAIN) return null;

  return (
    <ApprovalModal isVisible onCancel={onReject}>
      <AddCustomNetwork
        onCancel={onReject}
        onConfirm={onConfirm}
        currentPageInformation={pageMeta}
        customNetworkInformation={approvalRequest?.requestData}
      />
    </ApprovalModal>
  );
};

export default AddChainApproval;
