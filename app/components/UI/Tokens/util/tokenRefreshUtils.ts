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
  } = Engine.context;

  const networkClientIds = Object.values(
    NetworkController.state.networkConfigurationsByChainId,
  ).map(
    (network) =>
      network?.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.networkClientId,
  );

  const actions = [
    TokenDetectionController.detectTokens({
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    TokenBalancesController.updateBalances({
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    AccountTrackerController.refresh(networkClientIds),
    CurrencyRateController.updateExchangeRate(nativeCurrencies),
    ...Object.values(evmNetworkConfigurationsByChainId).map((network) =>
      TokenRatesController.updateExchangeRatesByChainId([
        {
          chainId: network.chainId,
          nativeCurrency: network.nativeCurrency,
        },
      ]),
    ),
  ];

  await Promise.all(actions).catch((error) => {
    Logger.error(error, 'Error while refreshing tokens');
  });
};
