import { EthAccountType, EthScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import { getInternalAccountsFromWallet } from './getInternalAccountsFromWallet';
import { InternalAccount } from '@metamask/keyring-internal-api';

const mockAccount1: InternalAccount = {
  id: 'cf8dace4-9439-4213-a944-b034375a0340',
  address: '0x1',
  options: {
    entropySource: 'keyring1',
  },
  methods: [],
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 1',
    importTime: Date.now(),
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  type: EthAccountType.Eoa,
};

const mockAccount2: InternalAccount = {
  id: '01d3a901-52a4-4786-bb72-c1b752945789',
  address: '0x2',
  options: {
    entropySource: 'keyring1',
  },
  methods: [],
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 2',
    importTime: Date.now(),
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  type: EthAccountType.Eoa,
};

const mockAccount3: InternalAccount = {
  id: '01d3a901-52a4-4786-bb72-c1b752945780',
  address: '0x3',
  options: {
    entropySource: 'keyring1',
  },
  methods: [],
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 3',
    importTime: Date.now(),
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  type: EthAccountType.Eoa,
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          get accounts() {
            return {
              [mockAccount1.id]: mockAccount1,
              [mockAccount2.id]: mockAccount2,
            };
          },
        },
      },
    },
  },
}));

describe('getInternalAccountsFromWallet', () => {
  it('returns the correct internal accounts for a given wallet', () => {
    const mockWallet = {
      id: 'keyring:1',
      metadata: { name: 'Test Wallet' },
      groups: {
        group1: {
          accounts: [mockAccount1.id, mockAccount2.id],
        },
      },
    } as unknown as AccountWalletObject;

    const result = getInternalAccountsFromWallet(mockWallet);
    expect(result).toEqual([mockAccount1, mockAccount2]);
    expect(result.length).toBe(2);
  });

  it('returns an empty array if the wallet has no accounts', () => {
    const mockWallet = {
      id: 'keyring:2',
      metadata: { name: 'Empty Wallet' },
      groups: {
        group1: {
          accounts: [],
        },
      },
    } as unknown as AccountWalletObject;

    const result = getInternalAccountsFromWallet(mockWallet);
    expect(result).toEqual([]);
  });

  it('handles wallets with multiple account groups', () => {
    const mockWallet = {
      id: 'keyring:3',
      metadata: { name: 'Multi-group Wallet' },
      groups: {
        group1: {
          accounts: [mockAccount1.id],
        },
        group2: {
          accounts: [mockAccount2.id],
        },
      },
    } as unknown as AccountWalletObject;

    const result = getInternalAccountsFromWallet(mockWallet);
    expect(result).toEqual([mockAccount1, mockAccount2]);
  });

  it('filters out accounts that are not in the accounts controller', () => {
    const mockWallet = {
      id: 'keyring:4',
      metadata: { name: 'Partial Wallet' },
      groups: {
        group1: {
          accounts: [mockAccount1.id, mockAccount3.id],
        },
      },
    } as unknown as AccountWalletObject;

    const result = getInternalAccountsFromWallet(mockWallet);
    expect(result).toEqual([expect.objectContaining({ id: mockAccount1.id })]);
  });

  it('returns an empty array if wallet groups are empty', () => {
    const mockWallet = {
      id: 'keyring:5',
      metadata: { name: 'No Groups Wallet' },
      groups: {},
    } as unknown as AccountWalletObject;

    const result = getInternalAccountsFromWallet(mockWallet);
    expect(result).toEqual([]);
  });
});
