import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

/**
 * Minimal Activity state. EVM networks are intentionally disabled by default so
 * ActivityList renders through Redux without kicking off the external tx API.
 */
export const initialStateActivity = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalBridgeController()
    .withMinimalTokenRates()
    .withMinimalMultichainTransactions()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: {
        showFiatOnTestnets: true,
      },
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {},
            accountsByChainId: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {},
          },
          GasFeeController: {
            gasFeeEstimates: {},
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {},
              solana: {},
            },
          },
          PreferencesController: {
            showTestNetworks: false,
            tokenNetworkFilter: {},
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {},
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokensController: {
            allTokens: {
              '0x1': {
                '0x0000000000000000000000000000000000000001': [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
