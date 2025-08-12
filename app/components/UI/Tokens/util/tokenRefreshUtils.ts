import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

export const performEvmRefresh = async (
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >,
  nativeCurrencies: string[],
) => {
  const {
    TokenDetectionController,
    AccountTrackerController,
    CurrencyRateController,
    TokenRatesController,
    TokenBalancesController,
    NetworkController,
    PreferencesController,
  } = Engine.context;

  const tokenListChains = PreferencesController.state.tokenNetworkFilter;
  const networkConfigurations =
    NetworkController.state.networkConfigurationsByChainId;

  const chainIds = Object.keys(tokenListChains) as Hex[];
  const networkClientIds = chainIds
    .map((c) => {
      const config = networkConfigurations[c];
      if (!config) {
        return undefined;
      }

      return config?.rpcEndpoints?.[config?.defaultRpcEndpointIndex]
        ?.networkClientId;
    })
    .filter((c: string | undefined): c is string => Boolean(c));

  const actions = [
    TokenDetectionController.detectTokens({
      chainIds,
    }),
    TokenBalancesController.updateBalances({
      chainIds,
    }),
    AccountTrackerController.refresh(networkClientIds),
    CurrencyRateController.updateExchangeRate(nativeCurrencies),
    TokenRatesController.updateExchangeRatesByChainId(
      chainIds
        .filter((chainId) => {
          const config = evmNetworkConfigurationsByChainId[chainId];
          return config?.chainId && config?.nativeCurrency;
        })
        .map((c) => evmNetworkConfigurationsByChainId[c]),
    ),
  ];

  await Promise.all(actions).catch((error) => {
    Logger.error(error, 'Error while refreshing tokens');
  });
};
