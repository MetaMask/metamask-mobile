import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface RefreshTokensProps {
  isEvmSelected: boolean;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  nativeCurrencies: string[];
  selectedAccount?: InternalAccount;
}

export const refreshTokens = async ({
  isEvmSelected,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
  selectedAccount,
}: RefreshTokensProps) => {
  if (!isEvmSelected) {
    const { MultichainBalancesController } = Engine.context;
    if (selectedAccount) {
      const actions = [
        MultichainBalancesController.updateBalance(selectedAccount?.id),
      ];
      await Promise.all(actions).catch((error) => {
        Logger.error(error, 'Error while refreshing NonEvm tokens');
      });
    }
  } else {
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
        network?.rpcEndpoints?.[network.defaultRpcEndpointIndex]
          ?.networkClientId,
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
  }
};
