import React, { useCallback } from 'react';
import useApprovalRequest from '@components/Views/confirmations/hooks/useApprovalRequest';
import ApprovalModal from '@ApprovalModal';
import useApprovalFlow from '@components/Views/confirmations/hooks/useApprovalFlow';
import ApprovalFlowLoader from '@components/Views/confirmations/components/Approval/ApprovalFlowLoader';

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
