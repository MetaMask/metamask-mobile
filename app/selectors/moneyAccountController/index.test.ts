import { selectMoneyAccounts, selectPrimaryMoneyAccount } from './index';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { MOCK_HD_KEYRING_METADATA } from '../keyringController/testUtils';
import { isMpcMoneyKeyringBuildEnabled } from '../../constants/featureFlags';

jest.mock('../../constants/featureFlags', () => ({
  isMpcMoneyKeyringBuildEnabled: jest.fn(() => false),
}));

const MOCK_MONEY_ACCOUNT: MoneyAccount = {
  id: 'account-1',
  address: '0xabc123',
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: MOCK_HD_KEYRING_METADATA.id,
      derivationPath: `${MONEY_DERIVATION_PATH}/0`,
      groupIndex: 0,
    },
    exportable: false,
  },
};

const MOCK_MONEY_ACCOUNTS = {
  [MOCK_MONEY_ACCOUNT.id]: MOCK_MONEY_ACCOUNT,
};

describe('MoneyAccountController selectors', () => {
  describe('selectMoneyAccounts', () => {
    it('returns the moneyAccounts record', () => {
      const result = selectMoneyAccounts.resultFunc({
        moneyAccounts: MOCK_MONEY_ACCOUNTS,
        defaultMoneyAccountId: MOCK_MONEY_ACCOUNT.id,
      });

      expect(result).toEqual(MOCK_MONEY_ACCOUNTS);
    });
  });

  describe('selectPrimaryMoneyAccount', () => {
    it('returns the money account matching the primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: MOCK_HD_KEYRING_METADATA,
        },
        null,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('returns undefined when no account matches the primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: { id: 'different-keyring-id', name: '' },
        },
        null,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when moneyAccounts is empty', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        {},
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: MOCK_HD_KEYRING_METADATA,
        },
        null,
      );

      expect(result).toBeUndefined();
    });

    describe('after the Money account moved to MPC', () => {
      const MPC_MONEY_ACCOUNT = {
        ...MOCK_MONEY_ACCOUNT,
        id: 'mpc-account',
        address: '0xmpc',
        options: { entropy: { type: 'mpc' }, exportable: false },
      } as unknown as MoneyAccount;
      const accounts = {
        ...MOCK_MONEY_ACCOUNTS,
        [MPC_MONEY_ACCOUNT.id]: MPC_MONEY_ACCOUNT,
      };
      const keyring = {
        type: KeyringTypes.hd,
        accounts: [],
        metadata: MOCK_HD_KEYRING_METADATA,
      };

      it('returns the default MPC Money account in builds with the MPC keyring', () => {
        jest.mocked(isMpcMoneyKeyringBuildEnabled).mockReturnValueOnce(true);

        expect(
          selectPrimaryMoneyAccount.resultFunc(
            accounts,
            keyring,
            MPC_MONEY_ACCOUNT.id,
          ),
        ).toEqual(MPC_MONEY_ACCOUNT);
      });

      it('keeps the SRP Money account in builds without the MPC keyring', () => {
        expect(
          selectPrimaryMoneyAccount.resultFunc(
            accounts,
            keyring,
            MPC_MONEY_ACCOUNT.id,
          ),
        ).toEqual(MOCK_MONEY_ACCOUNT);
      });
    });

    it('returns undefined when there is no primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        undefined,
        null,
      );

      expect(result).toBeUndefined();
    });
  });
});
