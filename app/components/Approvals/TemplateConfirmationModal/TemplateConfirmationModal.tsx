import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import TemplateConfirmation from '../../UI/Approval/TemplateConfirmation/TemplateConfirmation';
import { TEMPLATED_CONFIRMATION_APPROVAL_TYPES } from '../../UI/Approval/TemplateConfirmation/Templates';

const TemplateConfirmationModal = () => {
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
    <ApprovalModal
      isVisible={TEMPLATED_CONFIRMATION_APPROVAL_TYPES.includes(
        approvalRequest.type as ApprovalTypes,
      )}
      onCancel={onConfirm}
    >
      <TemplateConfirmation
        approvalRequest={approvalRequest}
        onConfirm={onConfirm}
      />
    </ApprovalModal>
  );
};

export default TemplateConfirmationModal;
