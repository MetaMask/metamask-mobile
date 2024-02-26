import Engine from '../Engine';
import { ethErrors } from 'eth-json-rpc-errors';
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
import { isSafeChainId } from '@metamask/controller-utils';

const wallet_switchEthereumChain = async ({
  req,
  res,
  requestUserApproval,
  analytics,
}) => {
  const { CurrencyRateController, NetworkController } = Engine.context;
  const params = req.params?.[0];

  if (!params || typeof params !== 'object') {
    throw ethErrors.rpc.invalidParams({
      message: `Expected single, object parameter. Received:\n${JSON.stringify(
        req.params,
      )}`,
    });
  }

  const { chainId } = params;

  const allowedKeys = {
    chainId: true,
  };

  const extraKeys = Object.keys(params).filter((key) => !allowedKeys[key]);
  if (extraKeys.length) {
    throw ethErrors.rpc.invalidParams(
      `Received unexpected keys on object parameter. Unsupported keys:\n${extraKeys}`,
    );
  }

  const _chainId = typeof chainId === 'string' && chainId.toLowerCase();

  if (!isPrefixedFormattedHexString(_chainId)) {
    throw ethErrors.rpc.invalidParams(
      `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'. Received:\n${chainId}`,
    );
  }

  if (!isSafeChainId(_chainId)) {
    throw ethErrors.rpc.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());
  const existingNetworkDefault = getDefaultNetworkByChainId(_chainId);
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );
  if (existingEntry || existingNetworkDefault) {
    const currentChainId = selectChainId(store.getState());
    if (currentChainId === _chainId) {
      res.result = null;
      return;
    }

    let networkConfigurationId, networkConfiguration;
    if (existingEntry) {
      [networkConfigurationId, networkConfiguration] = existingEntry;
    }

    let requestData;
    let analyticsParams = {
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
        symbol: networkConfiguration?.ticker,
      };
    } else {
      requestData = {
        chainId: _chainId,
        chainColor: existingNetworkDefault.color,
        chainName: existingNetworkDefault.shortName,
        ticker: 'ETH',
      };
      analyticsParams = {
        ...analyticsParams,
      };
    }

    await requestUserApproval({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: { ...requestData, type: 'switch' },
    });

    if (networkConfiguration) {
      CurrencyRateController.setNativeCurrency(networkConfiguration.ticker);
      NetworkController.setActiveNetwork(networkConfigurationId);
    } else {
      CurrencyRateController.setNativeCurrency('ETH');
      NetworkController.setProviderType(existingNetworkDefault.networkType);
    }

    MetaMetrics.getInstance().trackEvent(
      MetaMetricsEvents.NETWORK_SWITCHED,
      analyticsParams,
    );

    res.result = null;
    return;
  }

  throw ethErrors.provider.custom({
    code: 4902, // To-be-standardized "unrecognized chain ID" error
    message: `Unrecognized chain ID "${_chainId}". Try adding the chain using wallet_addEthereumChain first.`,
  });
};

export default wallet_switchEthereumChain;
