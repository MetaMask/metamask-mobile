import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface InitialStateWalletActionsOptions {
  isEvmSelected?: boolean;
}

export const initialStateWalletActions = (
  options?: InitialStateWalletActionsOptions,
) => {
  const isEvmSelected = options?.isEvmSelected ?? false;

  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(isEvmSelected)
    .withOverrides({
      engine: {
        backgroundState: {
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: isEvmSelected
              ? 'eip155:1'
              : 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      perpsPerpTradingEnabled: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          PreferencesController: {
            isIpfsGatewayEnabled: false,
          },
          TokenBalancesController: { tokenBalances: {} },
          TokensController: {
            allTokens: {},
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000 },
            },
          },
          EarnController: {
            pooled_staking: {
              isEligible: true,
            },
            lending: {
              positions: [],
              markets: [],
            },
          },
        },
      },
      settings: {
        basicFunctionalityEnabled: true,
        primaryCurrency: 'ETH',
      },
      swaps: {
        '0x1': { isLive: true },
        hasOnboarded: false,
        isLive: true,
      },
      fiatOrders: {
        networks: [
          {
            active: true,
            chainId: '1',
            chainName: 'Ethereum Mainnet',
            nativeTokenSupported: true,
          },
        ],
      },
    } as unknown as DeepPartial<RootState>);

  return builder;
};
