import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import SwitchCustomNetwork from '../../UI/SwitchCustomNetwork';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { useDispatch, useSelector } from 'react-redux';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getPermittedEthChainIds,
} from '@metamask/chain-agnostic-permission';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

const SwitchChainApproval = () => {
  const {
    approvalRequest,
    pageMeta,
    onConfirm: defaultOnConfirm,
    onReject,
  } = useApprovalRequest();

  const dispatch = useDispatch();
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const caip25CaveatValue =
    approvalRequest?.requestData?.diff?.permissionDiffMap?.[
      Caip25EndowmentPermissionName
    ]?.[Caip25CaveatType];

  const permittedEthChainIds = caip25CaveatValue
    ? getPermittedEthChainIds(caip25CaveatValue)
    : [];

  // This approval view only handles one chainId added to permissions at a time, and the permissionDiffMap should only contain one chainId
  const chainId = permittedEthChainIds[0];

  const onConfirm = useCallback(() => {
    defaultOnConfirm();

    // If remove global network selector is enabled should set network filter
    selectNetwork(chainId);

    dispatch(
      networkSwitched({
        networkUrl: approvalRequest?.requestData?.metadata?.rpcUrl,
        networkStatus: true,
      }),
    );
  }, [approvalRequest, defaultOnConfirm, dispatch, selectNetwork, chainId]);

  if (
    approvalRequest?.requestData?.diff?.permissionDiffMap?.[
      Caip25EndowmentPermissionName
    ] ||
    // TODO: Revisit removing this when we DRY the addEthereumChain and switchEthereumChain handlers into core
    approvalRequest?.type === ApprovalTypes.SWITCH_ETHEREUM_CHAIN
  ) {
    const customNetworkInformation = {
      chainId,
      chainName: evmNetworkConfigurations[chainId]?.name,
    };

    return (
      <ApprovalModal isVisible onCancel={onReject}>
        <SwitchCustomNetwork
          onCancel={onReject}
          onConfirm={onConfirm}
          currentPageInformation={pageMeta}
          customNetworkInformation={customNetworkInformation}
        />
      </ApprovalModal>
    );
  }
  return null;
};

export default SwitchChainApproval;
