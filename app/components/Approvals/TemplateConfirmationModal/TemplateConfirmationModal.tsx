import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import TemplateConfirmation from '../../Views/confirmations/legacy/components/Approval/TemplateConfirmation/TemplateConfirmation';
import { TEMPLATED_CONFIRMATION_APPROVAL_TYPES } from '../../Views/confirmations/legacy/components/Approval/TemplateConfirmation/Templates';

const TemplateConfirmationModal = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  if (
    !approvalRequest ||
    !TEMPLATED_CONFIRMATION_APPROVAL_TYPES.includes(
      approvalRequest.type as ApprovalTypes,
    )
  ) {
    return null;
  }

  return (
    <ApprovalModal isVisible onCancel={onReject}>
      <TemplateConfirmation
        approvalRequest={approvalRequest}
        onConfirm={onConfirm}
        onCancel={onReject}
      />
    </ApprovalModal>
  );
};

export default TemplateConfirmationModal;
