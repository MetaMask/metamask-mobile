import type { RootState } from '../../../app/reducers';
import type { TokenDetailsV1TabKey } from '../../../app/components/UI/TokenDetails/constants/constants';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import { createStateFixture } from '../stateFixture';

interface InitialStateTokenDetailsV1Options {
  deterministicFiat?: boolean;
  socialEnabled?: boolean;
  tabConfigOrder?: readonly TokenDetailsV1TabKey[];
}

const versionFlag = (enabled: boolean) => ({
  enabled,
  minimumVersion: '0.0.1',
});

/**
 * Baseline that can mount Token Details, with the memecoin V1 flag on.
 */
export const initialStateTokenDetailsV1 = (
  options?: InitialStateTokenDetailsV1Options,
) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalSmartTransactions()
    .withPreferences({
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    } as unknown as Record<string, unknown>)
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalAnalyticsController()
    .withMinimalEarnController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      assetsMemecoinTdpV1: {
        enabled: true,
        ...(options?.tabConfigOrder
          ? { tabConfigOrder: [...options.tabConfigOrder] }
          : {}),
      },
      aiSocialLeaderboardEnabled: versionFlag(options?.socialEnabled === true),
    })
    .withOverrides({
      engine: {
        backgroundState: {
          KeyringController: { isUnlocked: true, keyrings: [] },
          AssetsController: {
            selectedCurrency: 'usd',
            assetsPrice: {},
            assetsInfo: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000, usdConversionRate: 1 },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  balance: '0x0',
                },
              },
            },
          },
          TokenBalancesController: { tokenBalances: {} },
          TokensController: {
            allTokens: {
              '0x1': {
                '0x0000000000000000000000000000000000000001': [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          MultichainBalancesController: { balances: {} },
          MultichainAssetsController: {
            accountsAssets: {},
            assetsMetadata: {},
            allIgnoredAssets: {},
          },
          MultichainTransactionsController: { nonEvmTransactions: {} },
          MoneyAccountController: {
            moneyAccounts: {},
            defaultMoneyAccountId: null,
          },
          NftController: { allNfts: {}, allNftContracts: {} },
        },
      },
      collectibles: { favorites: {} },
    } as unknown as DeepPartial<RootState>);

  if (options?.deterministicFiat) {
    builder.withOverrides({
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000, usdConversionRate: 1 },
            },
            conversionRate: 2000,
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
  }

  return builder;
};
