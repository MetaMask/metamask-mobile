import React, { useCallback } from 'react';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from './ApprovalModal';
import SwitchCustomNetwork from '../UI/SwitchCustomNetwork';

export interface SwitchChainApprovalProps {
  onConfirm: (customNetworkInformation: any) => void;
}

const SwitchChainApproval = (props: SwitchChainApprovalProps) => {
  const {
    approvalRequest,
    pageMeta,
    onConfirm: defaultOnConfirm,
    onReject,
  } = useApprovalRequest();

  const onConfirm = useCallback(() => {
    defaultOnConfirm();
    props.onConfirm(approvalRequest?.requestData);
  }, [approvalRequest, defaultOnConfirm, props]);

  if (approvalRequest?.type !== ApprovalTypes.SWITCH_ETHEREUM_CHAIN)
    return null;

  return (
    <ApprovalModal isVisible onCancel={onReject}>
      <SwitchCustomNetwork
        onCancel={onReject}
        onConfirm={onConfirm}
        currentPageInformation={pageMeta}
        customNetworkInformation={approvalRequest?.requestData}
        type={approvalRequest?.requestData?.type}
      />
    </ApprovalModal>
  );
};

export default SwitchChainApproval;
