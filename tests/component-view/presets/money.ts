import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import type { MoneyAccountUpgradeStatus } from '@metamask/money-account-upgrade-controller';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

export const MONEY_ACCOUNT_ADDRESS =
  '0x1234567890abcdef1234567890abcdef12345678';

const PRIMARY_KEYRING_ID = 'primary-hd-keyring';

const MONEY_ACCOUNT = {
  id: 'money-account-1',
  address: MONEY_ACCOUNT_ADDRESS,
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: PRIMARY_KEYRING_ID,
      derivationPath: "m/44'/60'/1'/0/0",
      groupIndex: 0,
    },
    exportable: false,
  },
};

interface InitialStateMoneyOptions {
  hasMoneyAccount?: boolean;
  upgradedAccounts?: Record<string, MoneyAccountUpgradeStatus>;
}

/**
 * Returns a StateFixtureBuilder with a primary HD keyring and, optionally, a
 * Money account derived from it plus this device's upgrade records.
 */
export const initialStateMoney = ({
  hasMoneyAccount = true,
  upgradedAccounts = {},
}: InitialStateMoneyOptions = {}) =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withRemoteFeatureFlags({})
    .withOverrides({
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: [],
                metadata: { id: PRIMARY_KEYRING_ID, name: '' },
              },
            ],
          },
          MoneyAccountController: {
            moneyAccounts: hasMoneyAccount
              ? { [MONEY_ACCOUNT.id]: MONEY_ACCOUNT }
              : {},
          },
          MoneyAccountUpgradeController: {
            upgradedAccounts,
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
