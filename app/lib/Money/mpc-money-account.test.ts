import type { MoneyAccount } from '@metamask/money-account-controller';
import { isMpcBackedMoneyAccount } from './mpc-money-account';

const moneyAccount: MoneyAccount = {
  id: 'account-id',
  address: '0x123',
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: 'entropy-id',
      derivationPath: "m/44'/60'/0'/0/0",
      groupIndex: 0,
    },
    exportable: false,
  },
};

describe('isMpcBackedMoneyAccount', () => {
  it('returns true for a money account migrated to an MPC keyring', () => {
    expect(
      isMpcBackedMoneyAccount({
        ...moneyAccount,
        options: {
          ...moneyAccount.options,
          mpcKeyring: true,
        } as MoneyAccount['options'] & { mpcKeyring: true },
      }),
    ).toBe(true);
  });

  it('returns false for an HD-backed money account', () => {
    expect(isMpcBackedMoneyAccount(moneyAccount)).toBe(false);
  });

  it('returns false when no money account is provided', () => {
    expect(isMpcBackedMoneyAccount(undefined)).toBe(false);
  });
});
