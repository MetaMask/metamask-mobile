import { InteractionManager } from 'react-native';
import { ChainId } from '@metamask/controller-utils';
import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../selectors/networkController';
import { store } from '../../store';
import checkSafeNetwork from './networkChecker.util';
import {
  validateAddEthereumChainParams,
  validateRpcEndpoint,
  switchToNetwork,
} from './lib/ethereum-chain-utils';
import { getDecimalChainId } from '../../util/networks';
import { RpcEndpointType } from '@metamask/network-controller';

const waitForInteraction = async () =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });

// Utility function to find or add an item in an array and return the updated array and index
const addOrUpdateIndex = (array, value, comparator) => {
  const index = array.findIndex(comparator);
  if (index === -1) {
    return {
      updatedArray: [...array, value],
      index: array.length,
    };
  }
  return { updatedArray: array, index };
};

const wallet_addEthereumChain = async ({
  req,
  res,
  requestUserApproval,
  analytics,
  startApprovalFlow,
  endApprovalFlow,
}) => {
  const {
    NetworkController,
    MultichainNetworkController,
    ApprovalController,
    PermissionController,
    SelectedNetworkController,
  } = Engine.context;

  const { origin } = req;

  const params = validateAddEthereumChainParams(req.params);
  const {
    chainId,
    chainName,
    firstValidRPCUrl,
    firstValidBlockExplorerUrl,
    ticker,
  } = params;

  const switchToNetworkAndMetrics = async (network, isAddNetworkFlow) => {
    const { networkClientId } =
      network.rpcEndpoints[network.defaultRpcEndpointIndex];

    await switchToNetwork({
      network: [networkClientId, network],
      chainId,
      controllers: {
        MultichainNetworkController,
        PermissionController,
        SelectedNetworkController,
      },
      requestUserApproval,
      analytics,
      origin,
      isAddNetworkFlow,
    });
  };

  //TODO: Remove aurora from default chains in @metamask/controller-utils
  const actualChains = { ...ChainId, aurora: undefined };
  if (Object.values(actualChains).find((value) => value === chainId)) {
    throw rpcErrors.invalidParams(`May not specify default MetaMask chain.`);
  }
  const networkConfigurations = selectEvmNetworkConfigurationsByChainId(
    store.getState(),
  );

  const existingNetworkConfiguration = Object.values(
    networkConfigurations,
  ).find((networkConfiguration) => networkConfiguration.chainId === chainId);

  const existingNetworkConfigurationHasRpcEndpoint =
    existingNetworkConfiguration?.rpcEndpoints.some(
      (endpoint) => endpoint.url === firstValidRPCUrl,
    );

  // If the network already exists and the RPC URL is the same, perform a network switch only
  if (
    existingNetworkConfiguration &&
    existingNetworkConfigurationHasRpcEndpoint
  ) {
    const rpcResult = addOrUpdateIndex(
      existingNetworkConfiguration.rpcEndpoints,
      {
        url: firstValidRPCUrl,
        type: RpcEndpointType.Custom,
        name: chainName,
      },
      (endpoint) => endpoint.url === firstValidRPCUrl,
    );

    switchToNetworkAndMetrics(
      {
        ...existingNetworkConfiguration,
        rpcEndpoints: rpcResult.updatedArray,
        defaultRpcEndpointIndex: rpcResult.index,
      },
      false,
    );

    res.result = null;
    return;
  }

  await validateRpcEndpoint(firstValidRPCUrl, chainId);
  const requestData = {
    chainId,
    blockExplorerUrl: firstValidBlockExplorerUrl,
    chainName,
    rpcUrl: firstValidRPCUrl,
    ticker,
    isNetworkRpcUpdate: !!existingNetworkConfiguration,
  };

  const alerts = await checkSafeNetwork(
    getDecimalChainId(chainId),
    requestData.rpcUrl,
    requestData.chainName,
    requestData.ticker,
  );
  requestData.alerts = alerts;

  MetaMetrics.getInstance().trackEvent(
    MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.NETWORK_REQUESTED)
      .addProperties({
        chain_id: getDecimalChainId(chainId),
        source: 'Custom Network API',
        symbol: ticker,
        ...analytics,
      })
      .build(),
  );

  // Remove all existing approvals, including other add network requests.
  ApprovalController.clear(providerErrors.userRejectedRequest());

  // If existing approval request was an add network request, wait for
  // it to be rejected and for the corresponding approval flow to be ended.
  await waitForInteraction();
  const { id: approvalFlowId } = startApprovalFlow();

  try {
    try {
      await requestUserApproval({
        type: 'ADD_ETHEREUM_CHAIN',
        requestData,
      });
    } catch (error) {
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        )
          .addProperties({
            chain_id: getDecimalChainId(chainId),
            source: 'Custom Network API',
            symbol: ticker,
            ...analytics,
          })
          .build(),
      );
      throw providerErrors.userRejectedRequest();
    }

    let newNetworkConfiguration;
    if (existingNetworkConfiguration) {
      const currentChainId = selectEvmChainId(store.getState());

      const rpcResult = addOrUpdateIndex(
        existingNetworkConfiguration.rpcEndpoints,
        {
          url: firstValidRPCUrl,
          type: RpcEndpointType.Custom,
          name: chainName,
        },
        (endpoint) => endpoint.url === firstValidRPCUrl,
      );

      const blockExplorerResult = addOrUpdateIndex(
        existingNetworkConfiguration.blockExplorerUrls,
        firstValidBlockExplorerUrl,
        (url) => url === firstValidBlockExplorerUrl,
      );

      const updatedNetworkConfiguration = {
        ...existingNetworkConfiguration,
        rpcEndpoints: rpcResult.updatedArray,
        defaultRpcEndpointIndex: rpcResult.index,
        blockExplorerUrls: blockExplorerResult.updatedArray,
        defaultBlockExplorerUrlIndex: blockExplorerResult.index,
      };

      newNetworkConfiguration = await NetworkController.updateNetwork(
        chainId,
        updatedNetworkConfiguration,
        currentChainId === chainId
          ? {
              replacementSelectedRpcEndpointIndex:
                updatedNetworkConfiguration.defaultRpcEndpointIndex,
            }
          : undefined,
      );
    } else {
      newNetworkConfiguration = NetworkController.addNetwork({
        chainId,
        blockExplorerUrls: [firstValidBlockExplorerUrl],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: chainName,
        nativeCurrency: ticker,
        rpcEndpoints: [
          {
            url: firstValidRPCUrl,
            name: chainName,
            type: RpcEndpointType.Custom,
          },
        ],
      });

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.NETWORK_ADDED)
          .addProperties({
            chain_id: getDecimalChainId(chainId),
            source: 'Custom Network API',
            symbol: ticker,
            ...analytics,
          })
          .build(),
      );
    }

    switchToNetworkAndMetrics(newNetworkConfiguration, true);
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
