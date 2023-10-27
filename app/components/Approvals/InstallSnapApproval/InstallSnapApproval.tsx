import React, { useState } from 'react';
import { InstallSnapApprovalFlow } from '../../UI/InstallSnapApprovalFlow';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';

const InstallSnapApproval = () => {
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  console.log('SNAPS/ approvalRequest', approvalRequest);

  const onInstallSnapFinished = () => {
    setIsFinished(true);
  };

  const isModalVisible: boolean =
    approvalRequest?.type === ApprovalTypes.INSTALL_SNAP ||
    (!isFinished && approvalRequest !== undefined);

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
