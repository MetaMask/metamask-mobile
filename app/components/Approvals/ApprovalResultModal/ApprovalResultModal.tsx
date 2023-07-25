import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import { ApprovalResult } from '../../UI/Approval/ApprovalResult';
import { ApprovalResultType } from '../../UI/Approval/ApprovalResult/ApprovalResult';

const ApprovalResultModal = () => {
  const { approvalRequest, onConfirm } = useApprovalRequest();

  if (
    !approvalRequest ||
    ![ApprovalTypes.RESULT_SUCCESS, ApprovalTypes.RESULT_ERROR].includes(
      approvalRequest.type as ApprovalTypes,
    )
  ) {
    return null;
  }

  return (
    <ApprovalModal isVisible onCancel={onConfirm}>
      <ApprovalResult
        requestData={approvalRequest?.requestData}
        onConfirm={onConfirm}
        requestType={
          approvalRequest.type === ApprovalTypes.RESULT_SUCCESS
            ? ApprovalResultType.Success
            : ApprovalResultType.Failure
        }
      />
    </ApprovalModal>
  );
};

export default ApprovalResultModal;
