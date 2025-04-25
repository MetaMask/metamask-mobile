import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

interface RefreshEvmTokensProps {
  isEvmSelected: boolean;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  nativeCurrencies: string[];
}

export const refreshEvmTokens = async ({
  isEvmSelected,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
}: RefreshEvmTokensProps) => {
  if (!isEvmSelected) {
    return;
  }

  const {
    TokenDetectionController,
    AccountTrackerController,
    CurrencyRateController,
    TokenRatesController,
    TokenBalancesController,
  } = Engine.context;

  const actions = [
    TokenDetectionController.detectTokens({
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    TokenBalancesController.updateBalances({
      chainIds: Object.keys(evmNetworkConfigurationsByChainId) as Hex[],
    }),
    AccountTrackerController.refresh(),
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
