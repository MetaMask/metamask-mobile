import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { defaultCardFeatureFlag } from '../../../app/selectors/featureFlagController/card';

const DEFAULT_WALLET_ADDRESS = '0x0000000000000000000000000000000000000001';

/**
 * Minimal CardHomeData with an active VIRTUAL card seeded with a non-zero
 * USDC spendable balance so hasPriorityTokenBalance is true, which enables
 * the ManageCardOptions section to render.
 */
const defaultCardHomeData = {
  card: {
    id: 'card-test-123',
    status: 'ACTIVE',
    type: 'VIRTUAL',
    lastFour: '1234',
    holderName: 'Test User',
    isFreezable: true,
  },
  account: {
    verificationStatus: 'VERIFIED',
    provisioningEligible: false,
    holderName: 'Test User',
    shippingAddress: {
      line1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
  },
  primaryFundingAsset: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    walletAddress: DEFAULT_WALLET_ADDRESS,
    decimals: 6,
    chainId: 'eip155:59144',
    // Non-zero spendableBalance makes rawTokenBalance > 0 via useAssetBalances
    spendableBalance: '100.000000',
    spendingCap: '200.000000',
    priority: 1,
    // 'active' maps to FundingStatus.Enabled via toCardFundingToken
    status: 'active',
  },
  fundingAssets: [],
  availableFundingAssets: [],
  alerts: [],
  // 'add_funds' action causes ADD_FUNDS_BUTTON to render
  actions: [{ type: 'add_funds', enabled: true }],
  delegationSettings: null,
};

/**
 * Returns a StateFixtureBuilder seeded with minimal state for CardHome views.
 * The default state includes:
 * - An authenticated user with an active VIRTUAL card (USDC, Linea)
 * - US location so Order Metal Card is eligible when the feature flag is enabled
 * - Empty MoneyAccountController so the money-account linkage section is hidden
 *
 * Use `.withOverrides()` to override individual fields (e.g. isAuthenticated: false,
 * cardHomeDataStatus: 'error').
 */
export const initialStateCard = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalMultichainAssetsRates()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalAnalyticsController({ optedIn: false })
    .withOverrides({
      engine: {
        backgroundState: {
          CardController: {
            isAuthenticated: true,
            cardholderAccounts: [`eip155:0:${DEFAULT_WALLET_ADDRESS}`],
            activeProviderId: 'baanx',
            providerData: { baanx: { location: 'us' } },
            cardHomeData: defaultCardHomeData,
            cardHomeDataStatus: 'success',
            selectedCountry: null,
          },
          MoneyAccountController: { moneyAccounts: {} },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardFeature: defaultCardFeatureFlag,
              metalCardCheckoutEnabled: null,
            },
          },
          PreferencesController: {
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
            tokenNetworkFilter: {},
            privacyMode: false,
          },
        },
      },
    } as DeepPartial<RootState>);
