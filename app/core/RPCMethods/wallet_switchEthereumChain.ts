import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import {
  getDecimalChainId,
  getDefaultNetworkByChainId,
  isPrefixedFormattedHexString,
} from '../../util/networks';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import {
  NetworksTicker,
  isSafeChainId,
  NetworkType,
} from '@metamask/controller-utils';
import { NetworkController } from '@metamask/network-controller';

interface WalletSwitchEthereumChainParams {
  req: {
    params?: { chainId: string }[];
  };
  res: {
    result: null;
  };
  requestUserApproval: (data: {
    type: string;
    requestData: Record<string, unknown>;
  }) => Promise<void>;
  analytics: Record<string, unknown>;
}

interface NetworkConfiguration {
  rpcUrl?: string;
  chainId: string;
  nickname?: string;
  ticker: string;
}

interface DefaultNetwork {
  color: string;
  shortName: string;
  networkType: NetworkType;
}

interface ExtendedNetworkController {
  setActiveNetwork: (networkConfigurationId: string) => void;
  setProviderType: (networkType: NetworkType) => void;
}

const wallet_switchEthereumChain = async ({
  req,
  res,
  requestUserApproval,
  analytics,
}: WalletSwitchEthereumChainParams): Promise<void> => {
  const { CurrencyRateController, NetworkController } = Engine.context;
  const params = req.params?.[0];

  if (!params || typeof params !== 'object') {
    throw rpcErrors.invalidParams({
      message: `Expected single, object parameter. Received:\n${JSON.stringify(
        req.params,
      )}`,
    });
  }

  const { chainId } = params;

  const allowedKeys: Record<string, boolean> = {
    chainId: true,
  };

  const extraKeys = Object.keys(params).filter(
    (key) => !allowedKeys[key as keyof typeof allowedKeys],
  );
  if (extraKeys.length) {
    throw rpcErrors.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
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

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingNetworkDefault = getDefaultNetworkByChainId(_chainId) as
    | DefaultNetwork
    | undefined;
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );
  if (existingEntry || existingNetworkDefault) {
    const currentChainId = selectChainId(store.getState());
    if (currentChainId === _chainId) {
      res.result = null;
      return;
    }

    let networkConfigurationId: string | undefined;
    let networkConfiguration: NetworkConfiguration | undefined;
    if (existingEntry) {
      [networkConfigurationId, networkConfiguration] = existingEntry;
    }

    let requestData: Record<string, unknown>;
    let analyticsParams: Record<string, unknown> = {
      chain_id: getDecimalChainId(_chainId),
      source: 'Switch Network API',
      ...analytics,
    };
    if (networkConfiguration) {
      requestData = {
        rpcUrl: networkConfiguration.rpcUrl,
        chainId: _chainId,
        chainName: networkConfiguration.nickname,
        ticker: networkConfiguration.ticker,
      };
      analyticsParams = {
        ...analyticsParams,
        symbol: networkConfiguration.ticker,
      };
    } else if (existingNetworkDefault) {
      requestData = {
        chainId: _chainId,
        chainColor: existingNetworkDefault.color,
        chainName: existingNetworkDefault.shortName,
        ticker: 'ETH',
      };
      analyticsParams = {
        ...analyticsParams,
      };
    } else {
      throw new Error(
        'Unexpected state: neither networkConfiguration nor existingNetworkDefault is defined',
      );
    }

    await requestUserApproval({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: { ...requestData, type: 'switch' },
    });

    if (networkConfiguration && networkConfigurationId) {
      CurrencyRateController.updateExchangeRate(networkConfiguration.ticker);
      (
        NetworkController as NetworkController & {
          setActiveNetwork: (networkConfigurationId: string) => void;
        }
      ).setActiveNetwork(networkConfigurationId);
    } else if (existingNetworkDefault) {
      CurrencyRateController.updateExchangeRate(NetworksTicker.mainnet);
      (
        NetworkController as NetworkController & {
          setProviderType: (networkType: NetworkType) => void;
        }
      ).setProviderType(existingNetworkDefault.networkType);
    }

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );

    res.result = null;
    return;
  }

  throw providerErrors.custom({
    code: 4902, // To-be-standardized "unrecognized chain ID" error
    message: `Unrecognized chain ID "${_chainId}". Try adding the chain using wallet_addEthereumChain first.`,
  });
};

export default wallet_switchEthereumChain;
