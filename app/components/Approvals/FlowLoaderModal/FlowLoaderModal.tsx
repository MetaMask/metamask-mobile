import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import ApprovalModal from '../ApprovalModal';
import useApprovalFlow from '../../Views/confirmations/hooks/useApprovalFlow';
import ApprovalFlowLoader from '../../Views/confirmations/legacy/components/Approval/ApprovalFlowLoader';

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
