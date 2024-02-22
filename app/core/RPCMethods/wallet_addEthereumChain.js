import { InteractionManager } from 'react-native';
import validUrl from 'valid-url';
import { NetworksChainId } from '@metamask/controller-utils';
import { jsonRpcRequest } from '../../util/jsonRpcRequest';
import Engine from '../Engine';
import { ethErrors } from 'eth-json-rpc-errors';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../util/networks';
import URL from 'url-parse';
import { MetaMetricsEvents } from '../../core/Analytics';
import AnalyticsV2 from '../../util/analyticsV2';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import { BannerAlertSeverity } from '../../component-library/components/Banners/Banner';
import { strings } from '../../../locales/i18n';

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
    throw ethErrors.rpc.invalidParams({
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
    throw ethErrors.rpc.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
    );
  }

  const dirtyFirstValidRPCUrl = Array.isArray(rpcUrls)
    ? rpcUrls.find((rpcUrl) => validUrl.isHttpsUri(rpcUrl))
    : null;
  // Remove trailing slashes
  const firstValidRPCUrl = dirtyFirstValidRPCUrl
    ? dirtyFirstValidRPCUrl.replace(/\/+$/, '')
    : dirtyFirstValidRPCUrl;

  const firstValidBlockExplorerUrl =
    blockExplorerUrls !== null && Array.isArray(blockExplorerUrls)
      ? blockExplorerUrls.find((blockExplorerUrl) =>
          validUrl.isHttpsUri(blockExplorerUrl),
        )
      : null;

  if (!firstValidRPCUrl) {
    throw ethErrors.rpc.invalidParams(
      `Expected an array with at least one valid string HTTPS url 'rpcUrls', Received:\n${rpcUrls}`,
    );
  }

  if (blockExplorerUrls !== null && !firstValidBlockExplorerUrl) {
    throw ethErrors.rpc.invalidParams(
      `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'. Received: ${blockExplorerUrls}`,
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

  if (!isPrefixedFormattedHexString(_chainId)) {
    throw ethErrors.rpc.invalidParams(
      `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`,
    );
  }

  if (!isSafeChainId(parseInt(_chainId, 16))) {
    throw ethErrors.rpc.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  const chainIdDecimal = parseInt(_chainId, 16).toString(10);

  if (
    Object.values(NetworksChainId).find((value) => value === chainIdDecimal)
  ) {
    throw ethErrors.rpc.invalidParams(
      `May not specify default MetaMask chain.`,
    );
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) =>
      networkConfiguration.chainId === chainIdDecimal,
  );

  if (existingEntry) {
    const [networkConfigurationId, networkConfiguration] = existingEntry;
    const currentChainId = selectChainId(store.getState());
    if (currentChainId === chainIdDecimal) {
      res.result = null;
      return;
    }

    const analyticsParams = {
      chain_id: _chainId,
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
          chainName: networkConfiguration.nickname,
          ticker: networkConfiguration.ticker,
          type: 'switch',
        },
      });
    } catch (e) {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        analyticsParams,
      );
      throw ethErrors.provider.userRejectedRequest();
    }

    CurrencyRateController.setNativeCurrency(networkConfiguration.ticker);
    NetworkController.setActiveNetwork(networkConfigurationId);

    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_SWITCHED, analyticsParams);

    res.result = null;
    return;
  }

  let endpointChainId;

  try {
    endpointChainId = await jsonRpcRequest(firstValidRPCUrl, 'eth_chainId');
  } catch (err) {
    throw ethErrors.rpc.internal({
      message: `Request for method 'eth_chainId on ${firstValidRPCUrl} failed`,
      data: { networkErr: err },
    });
  }

  if (_chainId !== endpointChainId) {
    throw ethErrors.rpc.invalidParams({
      message: `Chain ID returned by RPC URL ${firstValidRPCUrl} does not match ${_chainId}`,
      data: { chainId: endpointChainId },
    });
  }

  if (typeof rawChainName !== 'string' || !rawChainName) {
    throw ethErrors.rpc.invalidParams({
      message: `Expected non-empty string 'chainName'. Received:\n${rawChainName}`,
    });
  }
  const chainName =
    rawChainName.length > 100 ? rawChainName.substring(0, 100) : rawChainName;

  if (nativeCurrency !== null) {
    if (typeof nativeCurrency !== 'object' || Array.isArray(nativeCurrency)) {
      throw ethErrors.rpc.invalidParams({
        message: `Expected null or object 'nativeCurrency'. Received:\n${nativeCurrency}`,
      });
    }
    if (nativeCurrency.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
      throw ethErrors.rpc.invalidParams({
        message: `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided. Received: ${nativeCurrency.decimals}`,
      });
    }

    if (!nativeCurrency.symbol || typeof nativeCurrency.symbol !== 'string') {
      throw ethErrors.rpc.invalidParams({
        message: `Expected a string 'nativeCurrency.symbol'. Received: ${nativeCurrency.symbol}`,
      });
    }
  }
  const ticker = nativeCurrency?.symbol || 'ETH';

  if (typeof ticker !== 'string' || ticker.length < 2 || ticker.length > 6) {
    throw ethErrors.rpc.invalidParams({
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

  const alerts = [];
  const safeChainsListRequest = await fetch(
    'https://chainid.network/chains.json',
  );
  const safeChainsList = await safeChainsListRequest.json();
  const matchedChain = safeChainsList.find(
    (chain) => chain.chainId.toString() === chainIdDecimal,
  );

  if (matchedChain) {
    const { origin } = new URL(requestData.rpcUrl);
    if (!matchedChain.rpc?.map((rpc) => new URL(rpc).origin).includes(origin)) {
      alerts.push({
        alertError: strings('add_custom_network.invalid_rpc_url'),
        alertSeverity: BannerAlertSeverity.Error,
        alertOrigin: 'rpc_url',
      });
    }
    if (matchedChain.nativeCurrency?.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
      alerts.push({
        alertError: strings('add_custom_network.invalid_chain_token_decimals'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'decimals',
      });
    }
    if (
      matchedChain.name?.toLowerCase() !== requestData.chainName.toLowerCase()
    ) {
      alerts.push({
        alertError: strings('add_custom_network.unrecognized_chain_name'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_name',
      });
    }
    if (matchedChain.nativeCurrency?.symbol !== requestData.ticker) {
      alerts.push({
        alertError: strings('add_custom_network.unrecognized_chain_ticker'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_ticker',
      });
    }
  }

  if (!matchedChain) {
    alerts.push({
      alertError: strings('add_custom_network.unrecognized_chain_id'),
      alertSeverity: BannerAlertSeverity.Error,
      alertOrigin: 'unknown_chain',
    });
  }

  requestData.alerts = alerts;

  const analyticsParamsAdd = {
    chain_id: chainIdDecimal,
    source: 'Custom Network API',
    symbol: ticker,
    ...analytics,
  };

  AnalyticsV2.trackEvent(
    MetaMetricsEvents.NETWORK_REQUESTED,
    analyticsParamsAdd,
  );

  // Remove all existing approvals, including other add network requests.
  ApprovalController.clear(ethErrors.provider.userRejectedRequest());

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
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.NETWORK_REQUEST_REJECTED,
        analyticsParamsAdd,
      );
      throw ethErrors.provider.userRejectedRequest();
    }

    const networkConfigurationId =
      await NetworkController.upsertNetworkConfiguration(
        {
          rpcUrl: firstValidRPCUrl,
          chainId: chainIdDecimal,
          ticker,
          nickname: chainName,
          rpcPrefs: {
            blockExplorerUrl: firstValidBlockExplorerUrl,
          },
        },
        {
          // Metrics-related properties required, but the metric event is a no-op
          // TODO: Use events for controller metric events
          referrer: 'ignored',
          source: 'ignored',
        },
      );

    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_ADDED, analyticsParamsAdd);

    await waitForInteraction();

    await requestUserApproval({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: { ...requestData, type: 'new' },
    });

    CurrencyRateController.setNativeCurrency(ticker);
    NetworkController.setActiveNetwork(networkConfigurationId);
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
