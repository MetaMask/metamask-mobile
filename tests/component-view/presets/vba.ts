import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot } from '@metamask/ramps-controller';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME } from '../../../app/lib/Money/feature-flags';
import {
  MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY,
} from '../../../app/selectors/featureFlagController/moneyAccount';
import { initialStateWallet } from './wallet';

/**
 * Per-currency rollout flags. BRL lists `BR` and defaults to `flagEnabled`.
 * USD lists `US` and is unset unless given.
 */
export interface VbaMarketsOption {
  brl?: boolean;
  usd?: boolean;
}

interface InitialStateVbaOptions {
  location?: string;
  flagEnabled?: boolean;
  markets?: VbaMarketsOption;
  legacyFlagEnabled?: boolean;
  /** Approved autoramp on the test money address. */
  hasActiveAccount?: boolean;
  /** Persisted UKYC session, which the delete-identity section requires. */
  hasKycSession?: boolean;
}

/** Primary HD keyring id paired with {@link VBA_TEST_MONEY_ADDRESS}. */
export const VBA_TEST_HD_KEYRING_ID = 'vba-test-hd-keyring';

/**
 * Money account address used by VBA component-view fixtures.
 * Must match the entropy id on {@link VBA_TEST_HD_KEYRING_ID} so
 * `selectSelectedVbaWalletAddress` resolves.
 */
export const VBA_TEST_MONEY_ADDRESS =
  '0xb1a6e05757757c333909af7243d408de5bf26f89';

/** Synthetic approved virtual bank account id. */
export const VBA_TEST_AUTORAMP_ID = 'vba-account-test-1';

/** Synthetic UKYC session for a customer who has started verification. */
export const VBA_TEST_KYC_SESSION = {
  id: 'kyc-session-test-1',
  finalStatus: 'approved',
  externalUserId: 'external-user-test-1',
  kycStatus: 'approved',
  vendor: 'moonpay',
  vendorStatus: 'approved',
} as const satisfies KycSessionStatus;

/** Customer abilities entry for BRL, the fiat side of a Pix deposit. */
export const VBA_TEST_BRL_CURRENCY = {
  currency: { type: 'Fiat', code: 'BRL' },
  flows: ['Onramp'],
};

/** Customer abilities entry for mUSD on Monad, the token the account buys. */
export const VBA_TEST_MUSD_ON_MONAD = {
  currency: { type: 'Crypto', token: 'mUSD', blockchain: 'Monad' },
  flows: ['Onramp'],
};

/** Customer abilities entry for a token other than mUSD on Monad. */
export const VBA_TEST_USDC_ON_ETHEREUM = {
  currency: { type: 'Crypto', token: 'USDC', blockchain: 'Ethereum' },
  flows: ['Onramp'],
};

/**
 * MoonPay customer abilities with an Active Pix rail, listing `currencies`.
 * Leave mUSD on Monad out to model a customer who is not offered it.
 *
 * @param currencies - Abilities `currencies` entries.
 * @returns Customer abilities for a BRL customer.
 */
export const vbaTestBrlAbilities = (currencies: unknown[]) => ({
  fiat_deposit: { brl: { pix: 'Active', pix_thirdparty: 'Active' } },
  fiat_payout: {},
  currencies,
  blocking_abilities: {},
});

/** Onboarding snapshot for a KYC-approved customer with account setup next. */
export const VBA_TEST_APPROVED_SNAPSHOT: VbaOnboardingSnapshot = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'approved',
  autorampStatus: 'needs_source_currency',
};

/**
 * State shared by VBA entry points and onboarding screens.
 * The default represents an eligible Brazilian user with a primary Money
 * account (required for hydrate / vendor-terms / autoramp walletAddress).
 */
export const initialStateVba = ({
  location = 'BR',
  flagEnabled = true,
  markets = {},
  legacyFlagEnabled = flagEnabled,
  hasActiveAccount = false,
  hasKycSession = false,
}: InitialStateVbaOptions = {}) =>
  initialStateWallet()
    .withRemoteFeatureFlags({
      [MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME]: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
        enabled: legacyFlagEnabled,
        minimumVersion: '0.0.0',
      },
      [MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY]: {
        enabled: markets.brl ?? flagEnabled,
        minimumVersion: '0.0.0',
        currency: 'BRL',
        regions: ['BR'],
        layout: 'Pix',
      },
      ...(markets.usd === undefined
        ? {}
        : {
            [MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY]: {
              enabled: markets.usd,
              minimumVersion: '0.0.0',
              currency: 'USD',
              regions: ['US'],
            },
          }),
    })
    .withOverrides({
      engine: {
        backgroundState: {
          GeolocationController: {
            location,
            status: 'complete',
          },
          RampsController: {
            autoramps: hasActiveAccount
              ? [
                  {
                    id: VBA_TEST_AUTORAMP_ID,
                    walletAddress: VBA_TEST_MONEY_ADDRESS,
                    status: 'Approved',
                    depositRailsSummary: { currency: 'BRL' },
                  },
                ]
              : [],
          },
          ...(hasKycSession
            ? { KycController: { sessionStatus: VBA_TEST_KYC_SESSION } }
            : {}),
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: [],
                metadata: { id: VBA_TEST_HD_KEYRING_ID, name: '' },
              },
            ],
          },
          MoneyAccountController: {
            moneyAccounts: {
              'money-account-1': {
                id: 'money-account-1',
                address: VBA_TEST_MONEY_ADDRESS,
                type: 'eip155:eoa',
                scopes: [],
                methods: [],
                options: {
                  entropy: {
                    type: 'mnemonic',
                    id: VBA_TEST_HD_KEYRING_ID,
                    derivationPath: "m/44'/4392018'/0'/0",
                    groupIndex: 0,
                  },
                  exportable: false,
                },
              },
            },
            defaultMoneyAccountId: 'money-account-1',
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
