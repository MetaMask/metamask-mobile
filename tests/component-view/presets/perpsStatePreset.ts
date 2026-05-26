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

const defaultConfirmationTransactionId = 'perps-cv-confirmation-tx';

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
            transactions: [
              {
                id: defaultConfirmationTransactionId,
                chainId: '0xa4b1',
                networkClientId: 'arbitrum-mainnet',
                status: 'unapproved',
                time: 0,
                type: 'simpleSend',
                txParams: {
                  from: '0x1234567890123456789012345678901234567890',
                  to: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
                  value: '0x0',
                  data: '0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead0000000000000000000000000000000000000000000000000000000000000000',
                },
              },
            ],
            transactionBatches: [],
          },
          ApprovalController: {
            pendingApprovals: {
              [defaultConfirmationTransactionId]: {
                id: defaultConfirmationTransactionId,
                type: 'transaction',
                requestData: {},
              },
            },
          },
          TransactionPayController: {
            transactionData: {
              [defaultConfirmationTransactionId]: {
                isLoading: false,
                tokens: [],
                sourceAmounts: [],
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 2500,
                usdConversionRate: 2500,
              },
            },
          },
          GasFeeController: {
            gasFeeEstimatesByChainId: {},
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              livenessByChainId: {},
            },
          },
          SignatureController: {
            signatureRequests: {},
          },
          MoneyAccountController: {
            moneyAccounts: {},
          },
          // usePerpsPaymentTokens -> useTokensWithBalance reads TokenBalancesController
          TokenBalancesController: { tokenBalances: {} },
          // HeroCardView -> useReferralDetails reads RewardsController
          RewardsController: {
            activeAccount: null,
          } as Record<string, unknown>,
        },
      },
    } as unknown as DeepPartial<RootState>);
