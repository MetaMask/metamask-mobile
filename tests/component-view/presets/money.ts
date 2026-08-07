import { createStateFixture } from '../stateFixture';
import { DEV_VAULT_CONFIG } from '../../../app/selectors/featureFlagController/moneyAccount';
import { STEPPER_IDS } from '../../../app/components/UI/Money/hooks/useOnboardingStep';
import { MONEY_ONBOARDING_TOTAL_STEPS } from '../../../app/components/UI/Money/components/MoneyOnboardingCard/MoneyOnboardingCard';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

export const MONEY_WALLET_ADDRESS =
  '0x0000000000000000000000000000000000000001';
export const MONEY_ACCOUNT_ADDRESS =
  '0x00000000000000000000000000000000000000a1';

const PRIMARY_KEYRING_ID = 'keyring-1';

/**
 * Remote flags every Money Home render depends on. `earnMoneyVaultApyControl`
 * supplies the APY fallback so the APY slot resolves without a live service
 * value, and the balance animation stays off unless a test turns it on.
 */
const moneyRemoteFeatureFlags = {
  moneyEnableMoneyAccount: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
  earnMoneyEarningSectionEnabled: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
  earnMoneyBalanceAnimationEnabled: {
    enabled: false,
    minimumVersion: '0.0.0',
  },
  // The card thumbnail's Rive tilt subscribes to the accelerometer, which has
  // no native module under test — the static card image is used instead.
  earnMoneyCardTiltAnimationEnabled: {
    enabled: false,
    minimumVersion: '0.0.0',
  },
  earnMoneyVaultApyControl: {
    vaultApyFallback: 0.05,
  },
  moneyAccountVaultConfig: DEV_VAULT_CONFIG,
  moneyAccountGeoBlockedCountries: { blockedRegions: ['GB'] },
};

/**
 * Returns a StateFixtureBuilder seeded with the minimal state Money Home needs:
 * - a primary HD keyring joined to a Money account, so the balance renders
 * instead of the "no account" slot
 * - a geolocation outside the blocked regions
 * - the Money remote feature flags, with the balance animation off by default
 * - a completed onboarding stepper, so the onboarding card stays out of the way
 *
 * Use `.withOverrides()` for per-test deltas (feature flags, privacy mode, the
 * persisted `moneyBalance` slice).
 */
export const initialStateMoney = () =>
  createStateFixture()
    .withMinimalAccounts(MONEY_WALLET_ADDRESS)
    .withMinimalMainnetNetwork()
    .withMinimalTokensController()
    .withMinimalTokenRates()
    .withMinimalTransactionController()
    .withMinimalMultichainNetwork(true)
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainTransactions()
    .withMinimalAnalyticsController({ optedIn: false })
    .withRemoteFeatureFlags(moneyRemoteFeatureFlags)
    .withOverrides({
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: [
              {
                type: 'HD Key Tree',
                accounts: [MONEY_WALLET_ADDRESS],
                metadata: { id: PRIMARY_KEYRING_ID, name: '' },
              },
            ],
          },
          MoneyAccountController: {
            moneyAccounts: {
              'money-account-1': {
                id: 'money-account-1',
                address: MONEY_ACCOUNT_ADDRESS,
                type: 'eip155:eoa',
                scopes: [],
                methods: [],
                options: {
                  entropy: {
                    type: 'mnemonic',
                    id: PRIMARY_KEYRING_ID,
                    derivationPath: "m/44'/60'/0'/0/0",
                    groupIndex: 0,
                  },
                  exportable: false,
                },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: { ETH: { conversionRate: 2000 } },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          GeolocationController: {
            location: 'FR',
          },
          CardController: {
            isAuthenticated: false,
            cardholderAccounts: [],
            activeProviderId: null,
            providerData: {},
            cardHomeData: null,
            cardHomeDataStatus: 'idle',
            selectedCountry: null,
            selectedCardProgramId: null,
          },
          PreferencesController: {
            privacyMode: false,
            tokenNetworkFilter: {},
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
        },
      },
      user: {
        onboardingStepperProgress: {
          [STEPPER_IDS.MONEY]: MONEY_ONBOARDING_TOTAL_STEPS,
        },
      },
      moneyBalance: {
        lastKnownBalance: null,
        hasPendingUserOp: false,
      },
    } as unknown as DeepPartial<RootState>);
