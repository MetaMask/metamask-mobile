import { InteractionManager } from 'react-native';
import validUrl from 'valid-url';
import { ChainId, isSafeChainId } from '@metamask/controller-utils';
import { jsonRpcRequest } from '../../util/jsonRpcRequest';
import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import {
  getDecimalChainId,
  isPrefixedFormattedHexString,
} from '../../util/networks';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import checkSafeNetwork from './networkChecker.util';
import { RpcEndpointType } from '@metamask/network-controller';

const EVM_NATIVE_TOKEN_DECIMALS = 18;

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
  const { CurrencyRateController, NetworkController, ApprovalController } =
    Engine.context;

  if (!req.params?.[0] || typeof req.params[0] !== 'object') {
    throw rpcErrors.invalidParams({
      message: `Expected single, object parameter. Received:\n${JSON.stringify(
        req.params,
      )}`,
    });
  }

  const params = req.params[0];

  const {
    chainId,
    chainName: rawChainName = null,
    blockExplorerUrls = null,
    nativeCurrency = null,
    rpcUrls,
  } = params;

  const allowedKeys = {
    chainId: true,
    chainName: true,
    blockExplorerUrls: true,
    nativeCurrency: true,
    rpcUrls: true,
    iconUrls: true,
  };

  const extraKeys = Object.keys(params).filter((key) => !allowedKeys[key]);
  if (extraKeys.length) {
    throw rpcErrors.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
    );
  }

  const dirtyFirstValidRPCUrl = Array.isArray(rpcUrls)
    ? rpcUrls.find((rpcUrl) => validUrl.isHttpsUri(rpcUrl))
    : null;
  // Remove trailing slashes
  const firstValidRPCUrl = dirtyFirstValidRPCUrl
    ? // https://github.com/MetaMask/mobile-planning/issues/1589
      dirtyFirstValidRPCUrl.replace(/([^/])\/+$/g, '$1')
    : dirtyFirstValidRPCUrl;

  const firstValidBlockExplorerUrl =
    blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
      ? blockExplorerUrls.find((blockExplorerUrl) =>
          validUrl.isHttpsUri(blockExplorerUrl),
        )
      : null;

  if (!firstValidRPCUrl) {
    throw rpcErrors.invalidParams(
      `Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n${rpcUrls}`,
    );
  }

  if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
    throw rpcErrors.invalidParams(
      `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrls}`,
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

  if (!isPrefixedFormattedHexString(_chainId)) {
    throw rpcErrors.invalidParams(
      `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`,
    );
  }

  if (!isSafeChainId(_chainId)) {
    throw rpcErrors.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  if (typeof rawChainName !== 'string' || !rawChainName) {
    throw rpcErrors.invalidParams({
      message: `Expected non-empty string 'chainName'. Received:\n${rawChainName}`,
    });
  }

  const chainName =
    rawChainName.length > 100 ? rawChainName.substring(0, 100) : rawChainName;

  //TODO: Remove aurora from default chains in @metamask/controller-utils
  const actualChains = { ...ChainId, aurora: undefined };
  if (Object.values(actualChains).find((value) => value === _chainId)) {
    throw rpcErrors.invalidParams(`May not specify default MetaMask chain.`);
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );

  if (existingEntry) {
    const [chainId, networkConfiguration] = existingEntry;
    const currentChainId = selectChainId(store.getState());

    // A network for this chain id already exists.
    // Update it with any new information.
    const clonedNetwork = { ...networkConfiguration };

    // Check if the rpc url already exists
    let rpcIndex = clonedNetwork.rpcEndpoints.findIndex(
      ({ url }) => url === firstValidRPCUrl,
    );

    // If it doesn't exist, add a new one
    if (rpcIndex === -1) {
      clonedNetwork.rpcEndpoints = [
        ...clonedNetwork.rpcEndpoints,
        {
          url: firstValidRPCUrl,
          type: RpcEndpointType.Custom,
          name: chainName,
        },
      ];
      rpcIndex = clonedNetwork.rpcEndpoints.length - 1;
    }

    // The provided rpc endpoint becomes the default
    clonedNetwork.defaultRpcEndpointIndex = rpcIndex;

    // Check if the block explorer already exists
    let blockExplorerIndex = clonedNetwork.blockExplorerUrls.findIndex(
      (url) => url === firstValidBlockExplorerUrl,
    );

    // If it doesn't exist, add a new one
    if (blockExplorerIndex === -1) {
      clonedNetwork.blockExplorerUrls = [
        ...clonedNetwork.blockExplorerUrls,
        firstValidBlockExplorerUrl,
      ];
      blockExplorerIndex = clonedNetwork.blockExplorerUrls.length - 1;
    }

    // The provided block explorer becomes the default
    clonedNetwork.defaultBlockExplorerUrlIndex = blockExplorerIndex;

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
      chain_id: getDecimalChainId(_chainId),
      source: 'Custom Network API',
      symbol: networkConfiguration.ticker,
      ...analytics,
    };

    try {
      await requestUserApproval({
        type: 'SWITCH_ETHEREUM_CHAIN',
        requestData: {
          rpcUrl: networkConfiguration.rpcUrl,
          chainId: _chainId,
          chainName: networkConfiguration.name,
          ticker: networkConfiguration.nativeCurrency,
          type: 'switch',
        },
      });
    } catch (e) {
      MetaMetrics.getInstance().trackEvent(
        MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        analyticsParams,
      );
      throw providerErrors.userRejectedRequest();
    }

    CurrencyRateController.updateExchangeRate(networkConfiguration.ticker);
    const { networkClientId } =
      networkConfiguration?.rpcEndpoints?.[
        networkConfiguration.defaultRpcEndpointIndex
      ] ?? {};

    NetworkController.setActiveNetwork(networkClientId);

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );

    res.result = null;
    return;
  }

  let endpointChainId;

  try {
    endpointChainId = await jsonRpcRequest(firstValidRPCUrl, 'eth_chainId');
  } catch (err) {
    throw rpcErrors.internal({
      message: `Request for method 'eth_chainId on ${firstValidRPCUrl} failed`,
      data: { networkErr: err },
    });
  }

  if (_chainId !== endpointChainId) {
    throw rpcErrors.invalidParams({
      message: `Chain ID returned by RPC URL ${firstValidRPCUrl} does not match ${_chainId}`,
      data: { chainId: endpointChainId },
    });
  }

  if (nativeCurrency !== null) {
    if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
      throw rpcErrors.invalidParams({
        message: `Expected null or object 'nativeCurrency'. Received:\n${nativeCurrency}`,
      });
    }
    if (nativeCurrency.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
      throw rpcErrors.invalidParams({
        message: `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ${nativeCurrency.decimals}`,
      });
    }

    if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
      throw rpcErrors.invalidParams({
        message: `Expected a string 'nativeCurrency.symbol'. Received: ${nativeCurrency.symbol}`,
      });
    }
  }
  const ticker = nativeCurrency?.symbol || 'ETH';

  if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6) {
    throw rpcErrors.invalidParams({
      message: `Expected 2-6 character string 'nativeCurrency.symbol'. Received:\n${ticker}`,
    });
  }

  const requestData = {
    chainId: _chainId,
    blockExplorerUrl: firstValidBlockExplorerUrl,
    chainName,
    rpcUrl: firstValidRPCUrl,
    ticker,
  };

  const alerts = await checkSafeNetwork(
    getDecimalChainId(_chainId),
    requestData.rpcUrl,
    requestData.chainName,
    requestData.ticker,
  );

  requestData.alerts = alerts;

  const analyticsParamsAdd = {
    chain_id: getDecimalChainId(_chainId),
    source: 'Custom Network API',
    symbol: ticker,
    ...analytics,
  };

  MetaMetrics.getInstance().trackEvent(
    MetaMetricsEvents.NETWORK_REQUESTED,
    analyticsParamsAdd,
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
    } catch (e) {
      MetaMetrics.getInstance().trackEvent(
        MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        analyticsParamsAdd,
      );
      throw providerErrors.userRejectedRequest();
    }
    const networkConfigurationId = await NetworkController.addNetwork({
      chainId,
      blockExplorerUrls,
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
      MetaMetricsEvents.NETWORK_ADDED,
      analyticsParamsAdd,
    );

    await waitForInteraction();

    await requestUserApproval({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: { ...requestData, type: 'new' },
    });

    CurrencyRateController.updateExchangeRate(ticker);
    const { networkClientId } =
      networkConfigurationId?.rpcEndpoints?.[
        networkConfigurationId.defaultRpcEndpointIndex
      ] ?? {};

    NetworkController.setActiveNetwork(networkClientId);
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
