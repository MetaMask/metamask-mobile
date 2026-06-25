import {
  selectMoneyAccounts,
  selectPrimaryMoneyAccount,
  selectSelectedAccountGroupMoneyAccountAddresses,
} from './index';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { MOCK_HD_KEYRING_METADATA } from '../keyringController/testUtils';
import { RootState } from '../../reducers';
import { AccountGroupType } from '@metamask/account-api';

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

const SELECTED_ENTROPY_ID = 'selected-entropy-id';
const SELECTED_WALLET_ID = `entropy:${SELECTED_ENTROPY_ID}`;
const SELECTED_GROUP_ID = `${SELECTED_WALLET_ID}/0`;

const createMoneyAccount = (
  overrides: Partial<MoneyAccount> = {},
): MoneyAccount => ({
  ...MOCK_MONEY_ACCOUNT,
  id: 'money-account',
  address: '0x111',
  options: {
    ...MOCK_MONEY_ACCOUNT.options,
    entropy: {
      ...MOCK_MONEY_ACCOUNT.options.entropy,
      id: SELECTED_ENTROPY_ID,
      groupIndex: 0,
    },
  },
  ...overrides,
});

const createState = ({
  moneyAccounts = {},
  includeSelectedGroup = true,
  includeMoneyController = true,
}: {
  moneyAccounts?: Record<string, MoneyAccount>;
  includeSelectedGroup?: boolean;
  includeMoneyController?: boolean;
} = {}): RootState =>
  ({
    engine: {
      backgroundState: {
        ...(includeMoneyController
          ? {
              MoneyAccountController: {
                moneyAccounts,
              },
            }
          : {}),
        AccountTreeController: {
          accountTree: {
            wallets: includeSelectedGroup
              ? {
                  [SELECTED_WALLET_ID]: {
                    id: SELECTED_WALLET_ID,
                    metadata: {
                      name: 'Selected wallet',
                    },
                    groups: {
                      [SELECTED_GROUP_ID]: {
                        id: SELECTED_GROUP_ID,
                        type: AccountGroupType.MultichainAccount,
                        accounts: [],
                        metadata: {
                          name: 'Selected group',
                          entropy: { groupIndex: 0 },
                        },
                      },
                    },
                  },
                }
              : {},
          },
          selectedAccountGroup: includeSelectedGroup ? SELECTED_GROUP_ID : null,
        },
      },
    },
  }) as unknown as RootState;

describe('MoneyAccountController selectors', () => {
  describe('selectMoneyAccounts', () => {
    it('returns the moneyAccounts record', () => {
      const result = selectMoneyAccounts.resultFunc({
        moneyAccounts: MOCK_MONEY_ACCOUNTS,
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

  describe('selectSelectedAccountGroupMoneyAccountAddresses', () => {
    it('returns Money account addresses matching the selected group entropy id and group index', () => {
      const matchingAccount = createMoneyAccount({
        id: 'matching-money-account',
        address: '0x222',
      });
      const state = createState({
        moneyAccounts: {
          [matchingAccount.id]: matchingAccount,
        },
      });

      expect(selectSelectedAccountGroupMoneyAccountAddresses(state)).toEqual([
        matchingAccount.address,
      ]);
    });

    it('excludes Money accounts with a different entropy id', () => {
      const mismatchedAccount = createMoneyAccount({
        id: 'mismatched-entropy-money-account',
        address: '0x333',
        options: {
          ...MOCK_MONEY_ACCOUNT.options,
          entropy: {
            ...MOCK_MONEY_ACCOUNT.options.entropy,
            id: 'different-entropy-id',
            groupIndex: 0,
          },
        },
      });
      const state = createState({
        moneyAccounts: {
          [mismatchedAccount.id]: mismatchedAccount,
        },
      });

      expect(selectSelectedAccountGroupMoneyAccountAddresses(state)).toEqual([]);
    });

    it('excludes Money accounts with a different group index', () => {
      const mismatchedAccount = createMoneyAccount({
        id: 'mismatched-group-money-account',
        address: '0x444',
        options: {
          ...MOCK_MONEY_ACCOUNT.options,
          entropy: {
            ...MOCK_MONEY_ACCOUNT.options.entropy,
            id: SELECTED_ENTROPY_ID,
            groupIndex: 1,
          },
        },
      });
      const state = createState({
        moneyAccounts: {
          [mismatchedAccount.id]: mismatchedAccount,
        },
      });

      expect(selectSelectedAccountGroupMoneyAccountAddresses(state)).toEqual([]);
    });

    it('returns empty array when selected group data is missing', () => {
      const matchingAccount = createMoneyAccount();
      const state = createState({
        moneyAccounts: {
          [matchingAccount.id]: matchingAccount,
        },
        includeSelectedGroup: false,
      });

      expect(selectSelectedAccountGroupMoneyAccountAddresses(state)).toEqual([]);
    });

    it('returns empty array when MoneyAccountController is missing', () => {
      const state = createState({
        includeMoneyController: false,
      });

      expect(selectSelectedAccountGroupMoneyAccountAddresses(state)).toEqual([]);
    });
  });
});
