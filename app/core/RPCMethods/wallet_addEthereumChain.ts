import { InteractionManager } from 'react-native';
import validUrl from 'valid-url';
import {
  ChainId,
  isSafeChainId,
  NetworkType,
  NetworksTicker,
} from '@metamask/controller-utils';
import { jsonRpcRequest } from '../../util/jsonRpcRequest';
import Engine from '../Engine';
import { rpcErrors, providerErrors } from '@metamask/rpc-errors';
import {
  isPrefixedFormattedHexString,
  getDecimalChainId,
} from '../../util/networks';
import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import {
  selectNetworkConfigurations,
  selectChainId,
} from '../../selectors/networkController';
import { store } from '../../store';
import networkChecker from './networkChecker.util';
import { NetworkController } from '@metamask/network-controller';

const EVM_NATIVE_TOKEN_DECIMALS = 18;

interface WalletAddEthereumChainParams {
  req: {
    params?: {
      chainId: string;
      chainName?: string;
      blockExplorerUrls?: string[] | null;
      nativeCurrency?: {
        name?: string;
        symbol?: string;
        decimals: number;
      } | null;
      rpcUrls: string[];
    }[];
  };
  res: {
    result: null;
  };
  requestUserApproval: (data: {
    type: string;
    requestData: unknown;
  }) => Promise<void>;
  analytics: Record<string, unknown>;
  startApprovalFlow: () => { id: string };
  endApprovalFlow: (data: { id: string }) => void;
}

const waitForInteraction = async (): Promise<void> =>
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
}: WalletAddEthereumChainParams): Promise<void> => {
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

  const extraKeys = Object.keys(params).filter(
    (key) => !allowedKeys[key as keyof typeof allowedKeys],
  );
  if (extraKeys.length) {
    throw rpcErrors.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
    );
  }

  const dirtyFirstValidRPCUrl = Array.isArray(rpcUrls)
    ? rpcUrls.find((rpcUrl) => validUrl.isHttpsUri(rpcUrl))
    : null;

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

  if (!_chainId || !isSafeChainId(_chainId as `0x${string}`)) {
    throw rpcErrors.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  const actualChains = { ...ChainId, aurora: undefined };
  if (Object.values(actualChains).find((value) => value === _chainId)) {
    throw rpcErrors.invalidParams(`May not specify default MetaMask chain.`);
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );

  if (existingEntry) {
    const [networkConfigurationId, networkConfiguration] = existingEntry;
    const currentChainId = selectChainId(store.getState());

    if (currentChainId === _chainId) {
      res.result = null;
      return;
    }

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
          chainName: networkConfiguration.nickname,
          ticker: networkConfiguration.ticker,
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
    (
      NetworkController as NetworkController & {
        setActiveNetwork: (networkConfigurationId: string) => void;
      }
    ).setActiveNetwork(networkConfigurationId);
    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );
    res.result = null;
    return;
  }

  let endpointChainId: string;
  try {
    endpointChainId = (await jsonRpcRequest(
      firstValidRPCUrl,
      'eth_chainId',
    )) as string;
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

  if (typeof rawChainName !== 'string' || !rawChainName) {
    throw rpcErrors.invalidParams({
      message: `Expected non-empty string 'chainName'. Received:\n${rawChainName}`,
    });
  }

  const chainName =
    rawChainName.length > 100 ? rawChainName.substring(0, 100) : rawChainName;

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

  interface RequestData {
    chainId: string;
    blockExplorerUrl: string | null | undefined;
    chainName: string;
    rpcUrl: string;
    ticker: string;
    alerts?: unknown;
  }

  const requestData: RequestData = {
    chainId: _chainId,
    blockExplorerUrl: firstValidBlockExplorerUrl,
    chainName,
    rpcUrl: firstValidRPCUrl,
    ticker,
  };

  const alerts = await networkChecker(
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

  const approvalFlowId = startApprovalFlow().id;

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

    const networkConfigurationId = await (
      NetworkController as NetworkController & {
        upsertNetworkConfiguration: (
          configuration: {
            rpcUrl: string;
            chainId: `0x${string}`;
            ticker: string;
            nickname: string;
            rpcPrefs: {
              blockExplorerUrl?: string;
            };
          },
          options: {
            referrer: string;
            source: string;
          },
        ) => Promise<string>;
      }
    ).upsertNetworkConfiguration(
      {
        rpcUrl: firstValidRPCUrl,
        chainId: _chainId as `0x${string}`,
        ticker,
        nickname: chainName,
        rpcPrefs: {
          blockExplorerUrl: firstValidBlockExplorerUrl || undefined,
        },
      },
      {
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );

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
    (
      NetworkController as NetworkController & {
        setActiveNetwork: (networkConfigurationId: string) => void;
      }
    ).setActiveNetwork(networkConfigurationId);
  } finally {
    endApprovalFlow({ id: approvalFlowId });
  }

  res.result = null;
};

export default wallet_addEthereumChain;
