import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import SwitchCustomNetwork from '../../UI/SwitchCustomNetwork';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { selectIsAllNetworks } from '../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';

const SwitchChainApproval = () => {
  const {
    approvalRequest,
    pageMeta,
    onConfirm: defaultOnConfirm,
    onReject,
  } = useApprovalRequest();

  const dispatch = useDispatch();
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const onConfirm = useCallback(() => {
    defaultOnConfirm();

    // If portfolio view is enabled should set network filter
    if (isPortfolioViewEnabled()) {
      const { PreferencesController } = Engine.context;
      PreferencesController.setTokenNetworkFilter({
        ...(isAllNetworks ? tokenNetworkFilter : {}),
        [approvalRequest?.requestData?.chainId]: true,
      });

      if (isRemoveGlobalNetworkSelectorEnabled()) {
        selectNetwork(approvalRequest?.requestData?.chainId);
      }
    }

    dispatch(
      networkSwitched({
        networkUrl: approvalRequest?.requestData?.rpcUrl,
        networkStatus: true,
      }),
    );
  }, [
    approvalRequest,
    defaultOnConfirm,
    dispatch,
    isAllNetworks,
    tokenNetworkFilter,
    selectNetwork,
  ]);

  if (approvalRequest?.type !== ApprovalTypes.SWITCH_ETHEREUM_CHAIN)
    return null;

  return (
    <ApprovalModal isVisible onCancel={onReject}>
      <SwitchCustomNetwork
        onCancel={onReject}
        onConfirm={onConfirm}
        currentPageInformation={pageMeta}
        customNetworkInformation={approvalRequest?.requestData}
      />
    </ApprovalModal>
  );
};

export default SwitchChainApproval;
