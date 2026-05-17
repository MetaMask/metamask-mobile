import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

/**
 * Default PerpsController state for component view tests.
 * Selectors read from state.engine.backgroundState.PerpsController.
 */
const defaultPerpsControllerState = {
  isEligible: true,
  initializationState: 'initialized' as const,
  watchlistMarkets: { testnet: [] as string[], mainnet: [] as string[] },
  marketFilterPreferences: {
    optionId: 'default',
    direction: 'desc' as const,
  },
  accountState: null,
  perpsBalances: {},
  selectedPaymentToken: null,
  activeProvider: 'hyperliquid' as const,
  isTestnet: false,
  withdrawalRequests: [] as unknown[],
};

/**
 * Returns a StateFixtureBuilder with minimal state for Perps views.
 * Use .withOverrides() to set PerpsController.isEligible, etc.
 */
export const initialStatePerps = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalMultichainAssetsRates()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withRemoteFeatureFlags({
      perpsPerpTradingEnabled: {
        enabled: true,
        featureVersion: null,
        minimumVersion: null,
      },
    } as Record<string, unknown>)
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: defaultPerpsControllerState,
          NetworkController: {
            providerConfig: { chainId: '0x1', type: 'mainnet' },
            selectedNetworkClientId: 'mainnet',
            // Include Arbitrum so ensureArbitrumNetworkExists() returns without calling addNetwork
            // (required for view tests that trigger navigateToOrder, e.g. PerpsActiveTraderFlow)
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                    name: 'Ethereum Network default RPC',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Main Network',
                nativeCurrency: 'ETH',
              },
              '0xa4b1': {
                chainId: '0xa4b1',
                name: 'Arbitrum One',
                nativeCurrency: 'ETH',
                rpcEndpoints: [
                  {
                    networkClientId: 'arbitrum-mainnet',
                    type: 'infura',
                    url: 'https://arbitrum-mainnet.infura.io/v3/{infuraProjectId}',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://arbiscan.io'],
                defaultBlockExplorerUrlIndex: 0,
              },
            },
          },
          PreferencesController: {
            // useTokensWithBalance -> sortAssets expects tokenSortConfig.key
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
          // PerpsMarketBalanceActions -> usePerpsHomeActions -> useConfirmNavigation reads TransactionController
          TransactionController: {
            transactions: [],
            transactionBatches: [],
          },
          // usePerpsPaymentTokens -> useTokensWithBalance reads TokenBalancesController
          TokenBalancesController: { tokenBalances: {} },
          // HeroCardView -> useReferralDetails/useSeasonStatus -> selectRewardsSubscriptionId reads RewardsController
          RewardsController: {
            activeAccount: null,
          } as Record<string, unknown>,
        },
      },
    } as unknown as DeepPartial<RootState>);
