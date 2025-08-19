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
    CurrencyRateController,
    TokenRatesController,
    TokenBalancesController,
    PreferencesController,
  } = Engine.context;

  const tokenListChains = PreferencesController.state.tokenNetworkFilter;

  const chainIds = Object.keys(tokenListChains) as Hex[];

  const actions = [
    TokenDetectionController.detectTokens({
      chainIds,
    }),
    TokenBalancesController.updateBalances({
      chainIds,
    }),
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
