import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import ApprovalModal from '../ApprovalModal';
import SwitchCustomNetwork from '../../UI/SwitchCustomNetwork';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { useDispatch, useSelector } from 'react-redux';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
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

  const onConfirm = useCallback(() => {
    defaultOnConfirm();

    // If portfolio view is enabled should set network filter
    if (isPortfolioViewEnabled()) {
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
  }, [approvalRequest, defaultOnConfirm, dispatch, selectNetwork]);

  const permittedEthChainIds = getPermittedEthChainIds(
    approvalRequest?.requestData?.diff?.permissionDiffMap?.[
      Caip25EndowmentPermissionName
    ]?.[Caip25CaveatType] ?? {
      requiredScopes: {},
      optionalScopes: {},
      sessionProperties: {},
      isMultichainOrigin: false,
    },
  );

  const chainId = permittedEthChainIds[0];

  const customNetworkInformation = {
    chainId,
    chainName: evmNetworkConfigurations[chainId]?.name,
  };

  if (
    approvalRequest?.requestData?.diff?.permissionDiffMap?.[
      Caip25EndowmentPermissionName
    ] ||
    approvalRequest?.requestData?.metadata?.isSwitchEthereumChain ||
    approvalRequest?.type === ApprovalTypes.SWITCH_ETHEREUM_CHAIN
  ) {
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
