import { InteractionManager } from 'react-native';
import { ChainId } from '@metamask/controller-utils';
import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import { selectNetworkConfigurations } from '../../selectors/networkController';
import { store } from '../../store';
import checkSafeNetwork from './networkChecker.util';
import { RestrictedMethods } from '../Permissions/constants';
import {
  validateAddEthereumChainParams,
  validateRpcEndpoint,
  findExistingNetwork,
  switchToNetwork,
} from './lib/ethereum-chain-utils';
import { getDecimalChainId } from '../../util/networks';

const waitForInteraction = async () =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve();
    });
  });

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
  const existingNetwork = findExistingNetwork(chainId, networkConfigurations);

  if (existingNetwork) {
    const analyticsParams = await switchToNetwork({
      network: existingNetwork,
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
    });

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
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

  MetaMetrics.getInstance().trackEvent(MetaMetricsEvents.NETWORK_REQUESTED, {
    chain_id: getDecimalChainId(chainId),
    source: 'Custom Network API',
    symbol: ticker,
    ...analytics,
  });
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
        MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        {
          chain_id: getDecimalChainId(chainId),
          source: 'Custom Network API',
          symbol: ticker,
          ...analytics,
        },
      );
      throw providerErrors.userRejectedRequest();
    }
    const networkConfigurationId =
      await NetworkController.upsertNetworkConfiguration(
        {
          rpcUrl: firstValidRPCUrl,
          chainId,
          ticker,
          nickname: chainName,
          rpcPrefs: {
            blockExplorerUrl: firstValidBlockExplorerUrl,
          },
        },
        {
          referrer: 'Custom Network API',
          source: 'Custom Network API',
        },
      );

    MetaMetrics.getInstance().trackEvent(MetaMetricsEvents.NETWORK_ADDED, {
      chain_id: getDecimalChainId(chainId),
      source: 'Custom Network API',
      symbol: ticker,
      ...analytics,
    });

    const network = [networkConfigurationId, requestData];

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
      isAddNetworkFlow: true, // isAddNetworkFlow
    });

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
