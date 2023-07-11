import React, { useCallback } from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import SwitchCustomNetwork from '../../UI/SwitchCustomNetwork';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { useDispatch } from 'react-redux';

const SwitchChainApproval = () => {
  const {
    approvalRequest,
    pageMeta,
    onConfirm: defaultOnConfirm,
    onReject,
  } = useApprovalRequest();

  const dispatch = useDispatch();

  const onConfirm = useCallback(() => {
    defaultOnConfirm();

    dispatch(
      networkSwitched({
        networkUrl: approvalRequest?.requestData?.rpcUrl,
        networkStatus: true,
      }),
    );
  }, [approvalRequest, defaultOnConfirm, dispatch]);

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
