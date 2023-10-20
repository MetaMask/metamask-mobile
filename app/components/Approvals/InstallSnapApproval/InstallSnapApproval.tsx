import React, { useState } from 'react';
import { InstallSnapApprovalFlow } from '../../UI/InstallSnapApprovalFlow';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';

const InstallSnapApproval = () => {
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const { approvalRequest, pageMeta, onConfirm, onReject } =
    useApprovalRequest();

  const onInstallSnapFinished = () => {
    setIsFinished(true);
  };

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type === ApprovalTypes.INSTALL_SNAP && !isFinished
      }
      onCancel={onReject}
    >
      <InstallSnapApprovalFlow
        onCancel={onReject}
        onConfirm={onConfirm}
        onFinish={onInstallSnapFinished}
        requestData={pageMeta}
      />
    </ApprovalModal>
  );
};

export default React.memo(InstallSnapApproval);
