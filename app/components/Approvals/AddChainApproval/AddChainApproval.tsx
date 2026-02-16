import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import NetworkVerificationInfo from '../../UI/NetworkVerificationInfo';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';

const AddChainApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.ADD_ETHEREUM_CHAIN) return null;

  const { isNetworkRpcUpdate, ...customNetworkInformation } =
    approvalRequest.requestData;

  return (
    <BottomSheet onClose={() => onReject()} shouldNavigateBack={false}>
      <NetworkVerificationInfo
        customNetworkInformation={customNetworkInformation}
        onReject={onReject}
        onConfirm={onConfirm}
        isNetworkRpcUpdate={isNetworkRpcUpdate}
      />
    </BottomSheet>
  );
};

export default AddChainApproval;
