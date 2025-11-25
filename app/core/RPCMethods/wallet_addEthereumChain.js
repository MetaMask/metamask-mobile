import { equal } from 'uri-js';
import { InteractionManager } from 'react-native';
import { ChainId, toHex } from '@metamask/controller-utils';
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
import { addItemToChainIdList } from '../../util/metrics/MultichainAPI/networkMetricUtils';
import Logger from '../../util/Logger';

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

/**
 * Add chain implementation to be used in JsonRpcEngine middleware.
 *
 * @param params.req - The JsonRpcEngine request.
 * @param params.res - The JsonRpcEngine result object.
 * @param params.requestUserApproval - The callback to trigger user approval flow.
 * @param params.analytics - Analytics parameters to be passed when tracking event via `MetaMetrics`.
 * @param params.hooks - Method hooks passed to the method implementation.
 * @returns {Nothing}.
 */
export const wallet_addEthereumChain = async ({
  req,
  res,
  requestUserApproval,
  analytics,
  hooks,
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

  const existingNetworkConfiguration =
    hooks.getNetworkConfigurationByChainId(chainId);
  const rpcIndex = existingNetworkConfiguration?.rpcEndpoints.findIndex(
    ({ url }) => equal(url, firstValidRPCUrl),
  );

  let updatedNetworkConfiguration = existingNetworkConfiguration;

  const blockExplorerIndex = firstValidBlockExplorerUrl
    ? existingNetworkConfiguration?.blockExplorerUrls.findIndex((url) =>
        equal(url, firstValidBlockExplorerUrl),
      )
    : undefined;

  const shouldAddOrUpdateNetwork =
    !existingNetworkConfiguration ||
    rpcIndex !== existingNetworkConfiguration.defaultRpcEndpointIndex ||
    (firstValidBlockExplorerUrl &&
      blockExplorerIndex !==
        existingNetworkConfiguration.defaultBlockExplorerUrlIndex);

  if (shouldAddOrUpdateNetwork) {
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
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NETWORK_REQUESTED,
      )
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

      const clonedNetworkConfiguration = {
        ...existingNetworkConfiguration,
        rpcEndpoints: rpcResult.updatedArray,
        defaultRpcEndpointIndex: rpcResult.index,
        blockExplorerUrls: blockExplorerResult.updatedArray,
        defaultBlockExplorerUrlIndex: blockExplorerResult.index,
      };

      updatedNetworkConfiguration = await NetworkController.updateNetwork(
        chainId,
        clonedNetworkConfiguration,
        currentChainId === chainId
          ? {
              replacementSelectedRpcEndpointIndex:
                clonedNetworkConfiguration.defaultRpcEndpointIndex,
            }
          : undefined,
      );

      // Track RPC Added event if a new RPC endpoint was added (not just updated)
      // rpcResult.index === original array length means a new RPC was added
      const wasNewRpcAdded =
        rpcResult.index === existingNetworkConfiguration.rpcEndpoints.length;
      if (wasNewRpcAdded) {
        MetaMetrics.getInstance().trackEvent(
          MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.RPC_ADDED)
            .addProperties({
              chain_id: toHex(chainId),
              source: 'Custom Network API',
              symbol: ticker,
              rpc_url_index: rpcResult.index,
              ...analytics,
            })
            .build(),
        );
      }
    } else {
      updatedNetworkConfiguration = NetworkController.addNetwork({
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

      // Track RPC Added event for new networks - first RPC endpoint is at index 0
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.RPC_ADDED)
          .addProperties({
            chain_id: toHex(chainId),
            source: 'Custom Network API',
            symbol: ticker,
            rpc_url_index: 0,
            ...analytics,
          })
          .build(),
      );
    }

    MetaMetrics.getInstance().addTraitsToUser(addItemToChainIdList(chainId));
  }

  const { networkClientId, url: rpcUrl } =
    updatedNetworkConfiguration.rpcEndpoints[
      updatedNetworkConfiguration.defaultRpcEndpointIndex
    ];

  await switchToNetwork({
    networkClientId,
    nativeCurrency: updatedNetworkConfiguration.nativeCurrency,
    rpcUrl,
    chainId,
    controllers: {
      MultichainNetworkController,
      PermissionController,
      SelectedNetworkController,
    },
    analytics,
    origin,
    autoApprove: shouldAddOrUpdateNetwork,
    hooks,
  });

  res.result = null;
};
