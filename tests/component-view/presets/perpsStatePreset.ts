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
          },
          PreferencesController: {
            selectedAddress: '0x1234567890abcdef',
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
        },
      },
    } as unknown as DeepPartial<RootState>);
