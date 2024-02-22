import React, { useCallback } from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import ApprovalModal from '../ApprovalModal';
import useApprovalFlow from '../../hooks/useApprovalFlow';
import ApprovalFlowLoader from '../../UI/Approval/ApprovalFlowLoader';

const FlowLoaderModal = () => {
  const { approvalRequest } = useApprovalRequest();
  const { approvalFlow } = useApprovalFlow();

  const onCancel = useCallback(() => {
    // Do nothing to prevent the loader from closing
  }, []);

  if (!approvalFlow || approvalRequest) return null;

  return (
    <ApprovalModal isVisible onCancel={onCancel}>
      <ApprovalFlowLoader loadingText={approvalFlow?.loadingText} />
    </ApprovalModal>
  );
};

export default FlowLoaderModal;
