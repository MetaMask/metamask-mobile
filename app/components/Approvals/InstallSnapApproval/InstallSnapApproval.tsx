import React, { useState } from 'react';
import { InstallSnapApprovalFlow } from '../../UI/InstallSnapApprovalFlow';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';

const InstallSnapApproval = () => {
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  const onInstallSnapFinished = () => {
    setIsFinished(true);
  };

  const isModalVisible =
    approvalRequest?.type === ApprovalTypes.INSTALL_SNAP ||
    (!isFinished && approvalRequest);

  return (
    <ApprovalModal isVisible={isModalVisible} onCancel={onReject}>
      <InstallSnapApprovalFlow
        onCancel={onReject}
        onConfirm={onConfirm}
        onFinish={onInstallSnapFinished}
        requestData={approvalRequest}
      />
    </ApprovalModal>
  );
};

export default React.memo(InstallSnapApproval);
