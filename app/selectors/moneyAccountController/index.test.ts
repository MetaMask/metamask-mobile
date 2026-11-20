import {
  selectDefaultMoneyAccount,
  selectMoneyAccounts,
  selectPrimaryMoneyAccount,
} from './index';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { MOCK_HD_KEYRING_METADATA } from '../keyringController/testUtils';

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

const MOCK_MPC_MONEY_ACCOUNT: MoneyAccount = {
  id: 'account-mpc',
  address: '0xdef456',
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: { type: 'mpc' },
    exportable: false,
  },
};

const MOCK_MONEY_ACCOUNTS = {
  [MOCK_MONEY_ACCOUNT.id]: MOCK_MONEY_ACCOUNT,
};

const MOCK_MONEY_ACCOUNTS_WITH_MPC = {
  ...MOCK_MONEY_ACCOUNTS,
  [MOCK_MPC_MONEY_ACCOUNT.id]: MOCK_MPC_MONEY_ACCOUNT,
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
      const result = selectPrimaryMoneyAccount.resultFunc(MOCK_MONEY_ACCOUNTS, {
        type: KeyringTypes.hd,
        accounts: [],
        metadata: MOCK_HD_KEYRING_METADATA,
      });

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('returns undefined when no account matches the primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(MOCK_MONEY_ACCOUNTS, {
        type: KeyringTypes.hd,
        accounts: [],
        metadata: { id: 'different-keyring-id', name: '' },
      });

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
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when there is no primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        undefined,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectDefaultMoneyAccount', () => {
    const PRIMARY_HD_KEYRING = {
      type: KeyringTypes.hd,
      accounts: [],
      metadata: MOCK_HD_KEYRING_METADATA,
    };

    it('returns the default money account when it is the primary SRP account', () => {
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
          defaultMoneyAccountId: MOCK_MONEY_ACCOUNT.id,
        },
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('falls back to the primary money account when no default is set', () => {
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
          defaultMoneyAccountId: null,
        },
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('returns undefined when no default is set and there is no primary money account', () => {
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
          defaultMoneyAccountId: null,
        },
        undefined,
      );

      expect(result).toBeUndefined();
    });

    it('returns the MPC money account when it is the default, even though the primary is the SRP account', () => {
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS_WITH_MPC,
          defaultMoneyAccountId: MOCK_MPC_MONEY_ACCOUNT.id,
        },
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toEqual(MOCK_MPC_MONEY_ACCOUNT);
    });

    it('falls back to the primary money account when the default id has no matching account', () => {
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
          defaultMoneyAccountId: 'missing-account-id',
        },
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('resolves the primary money account from the primary HD keyring', () => {
      const primary = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        PRIMARY_HD_KEYRING,
      );
      const result = selectDefaultMoneyAccount.resultFunc(
        {
          moneyAccounts: MOCK_MONEY_ACCOUNTS,
          defaultMoneyAccountId: null,
        },
        primary,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });
  });
});
