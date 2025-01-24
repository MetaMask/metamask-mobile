import { InteractionManager } from 'react-native';
import { ChainId } from '@metamask/controller-utils';
import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import {
  selectChainId,
  selectNetworkConfigurations,
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
    CurrencyRateController,
    NetworkController,
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

  //TODO: Remove aurora from default chains in @metamask/controller-utils
  const actualChains = { ...ChainId, aurora: undefined };
  if (Object.values(actualChains).find((value) => value === chainId)) {
    throw rpcErrors.invalidParams(`May not specify default MetaMask chain.`);
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === chainId,
  );
  if (existingEntry) {
    const [chainId, networkConfiguration] = existingEntry;
    const currentChainId = selectChainId(store.getState());

    // A network for this chain id already exists.
    // Update it with any new information.
    const clonedNetwork = { ...networkConfiguration };

    // Use the addOrUpdateIndex utility for rpcEndpoints
    const rpcResult = addOrUpdateIndex(
      clonedNetwork.rpcEndpoints,
      {
        url: firstValidRPCUrl,
        type: RpcEndpointType.Custom,
        name: chainName,
      },
      (endpoint) => endpoint.url === firstValidRPCUrl,
    );

    clonedNetwork.rpcEndpoints = rpcResult.updatedArray;
    clonedNetwork.defaultRpcEndpointIndex = rpcResult.index;

    // Use the addOrUpdateIndex utility for blockExplorerUrls
    const blockExplorerResult = addOrUpdateIndex(
      clonedNetwork.blockExplorerUrls,
      firstValidBlockExplorerUrl,
      (url) => url === firstValidBlockExplorerUrl,
    );

    clonedNetwork.blockExplorerUrls = blockExplorerResult.updatedArray;
    clonedNetwork.defaultBlockExplorerUrlIndex = blockExplorerResult.index;

    await NetworkController.updateNetwork(
      clonedNetwork.chainId,
      clonedNetwork,
      currentChainId === chainId
        ? {
            replacementSelectedRpcEndpointIndex:
              clonedNetwork.defaultRpcEndpointIndex,
          }
        : undefined,
    );

    const analyticsParams = {
      chain_id: getDecimalChainId(chainId),
      source: 'Custom Network API',
      symbol: networkConfiguration.ticker,
      ...analytics,
    };

    const { networkClientId } =
      networkConfiguration.rpcEndpoints[
        networkConfiguration.defaultRpcEndpointIndex
      ];

    const network = [networkClientId, clonedNetwork];
    await switchToNetwork({
      network,
      chainId,
      controllers: {
        CurrencyRateController,
        NetworkController,
        PermissionController,
        SelectedNetworkController,
      },
      requestUserApproval,
      analytics,
      origin,
      isAddNetworkFlow: true,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
        .addProperties(analyticsParams)
        .build(),
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
    const networkConfiguration = await NetworkController.addNetwork({
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

    const { networkClientId } =
      networkConfiguration?.rpcEndpoints?.[
        networkConfiguration.defaultRpcEndpointIndex
      ] ?? {};

    const network = [networkClientId, networkConfiguration];
    const analyticsParams = await switchToNetwork({
      network,
      chainId,
      controllers: {
        CurrencyRateController,
        NetworkController,
        PermissionController,
        SelectedNetworkController,
      },
      requestUserApproval,
      analytics,
      origin,
      isAddNetworkFlow: true,
    });

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.NETWORK_SWITCHED)
        .addProperties(analyticsParams)
        .build(),
    );
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
