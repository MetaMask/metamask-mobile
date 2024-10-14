import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import {
  getDecimalChainId,
  getDefaultNetworkByChainId,
  isPrefixedFormattedHexString,
} from '../../util/networks';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import { selectNetworkConfigurations } from '../../selectors/networkController';
import { store } from '../../store';
import { NetworksTicker, isSafeChainId } from '@metamask/controller-utils';
import { RestrictedMethods } from '../Permissions/constants';

const wallet_switchEthereumChain = async ({
  req,
  res,
  requestUserApproval,
  analytics,
}) => {
  const {
    CurrencyRateController,
    NetworkController,
    PermissionController,
    SelectedNetworkController,
  } = Engine.context;
  const params = req.params?.[0];
  const { origin } = req;

  if (!params || typeof params !== 'object') {
    throw rpcErrors.invalidParams({
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

  if (!isSafeChainId(_chainId)) {
    throw rpcErrors.invalidParams(
      `Invalid chain ID "${_chainId}": numerical value greater than max safe value. Received:\n${chainId}`,
    );
  }

  const networkConfigurations = selectNetworkConfigurations(store.getState());

  const existingNetworkDefault = getDefaultNetworkByChainId(_chainId);
  const existingEntry = Object.entries(networkConfigurations).find(
    ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
  );

  if (existingEntry || existingNetworkDefault) {
    const currentDomainSelectedNetworkClientId =
      Engine.context.SelectedNetworkController.getNetworkClientIdForDomain(
        origin,
      );

    const {
      configuration: { chainId: currentDomainSelectedChainId },
    } = Engine.context.NetworkController.getNetworkClientById(
      currentDomainSelectedNetworkClientId,
    ) || { configuration: {} };

    if (currentDomainSelectedChainId === _chainId) {
      res.result = null;
      return;
    }

    let networkConfigurationId, networkConfiguration;
    if (existingEntry) {
      [, networkConfiguration] = existingEntry;
      networkConfigurationId =
        networkConfiguration.rpcEndpoints[
          networkConfiguration.defaultRpcEndpointIndex
        ].networkClientId;
    }

    let requestData;
    let analyticsParams = {
      chain_id: getDecimalChainId(_chainId),
      source: 'Switch Network API',
      ...analytics,
    };
    if (networkConfiguration) {
      requestData = {
        rpcUrl:
          networkConfiguration.rpcEndpoints[
            networkConfiguration.defaultRpcEndpointIndex
          ],
        chainId: _chainId,
        chainName: networkConfiguration.name,
        ticker: networkConfiguration.nativeCurrency,
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

    const originHasAccountsPermission = PermissionController.hasPermission(
      origin,
      RestrictedMethods.eth_accounts,
    );

    if (process.env.MULTICHAIN_V1 && originHasAccountsPermission) {
      SelectedNetworkController.setNetworkClientIdForDomain(
        origin,
        networkConfigurationId || existingNetworkDefault.networkType,
      );
    } else if (networkConfiguration) {
      CurrencyRateController.updateExchangeRate(networkConfiguration.ticker);
      NetworkController.setActiveNetwork(networkConfigurationId);
    } else {
      // TODO we will need to update this so that each network in the NetworksList has its own ticker
      // if we ever add networks that don't have ETH as their base currency
      CurrencyRateController.updateExchangeRate(NetworksTicker.mainnet);
      NetworkController.setActiveNetwork(existingNetworkDefault.networkType);
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
