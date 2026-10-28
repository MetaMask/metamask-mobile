import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../app/selectors/featureFlagController/moneyAccount';
import { initialStateWallet } from './wallet';

interface InitialStateVbaOptions {
  location?: string;
  flagEnabled?: boolean;
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

/**
 * State shared by VBA entry points and onboarding screens.
 * The default represents an eligible Brazilian user with a primary Money
 * account (required for hydrate / vendor-terms / autoramp walletAddress).
 */
export const initialStateVba = ({
  location = 'BR',
  flagEnabled = true,
}: InitialStateVbaOptions = {}) =>
  initialStateWallet()
    .withRemoteFeatureFlags({
      [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
        enabled: flagEnabled,
        minimumVersion: '0.0.0',
        regions: ['BR'],
        regionCurrencies: { BR: 'BRL' },
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          GeolocationController: {
            location,
            status: 'complete',
          },
          RampsController: {
            autoramps: [],
          },
          KeyringController: {
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
