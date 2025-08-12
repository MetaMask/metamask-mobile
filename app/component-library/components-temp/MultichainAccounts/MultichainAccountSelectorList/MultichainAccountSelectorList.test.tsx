import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import MultichainAccountSelectorList from './MultichainAccountSelectorList';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { RootState } from '../../../../reducers';
import {
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
} from './MultichainAccountSelectorList.constants';

const createMockInternalAccount = (
  id: string,
  address: string,
  name: string,
): InternalAccount => ({
  id,
  address,
  type: 'eip155:eoa',
  scopes: ['eip155:1'],
  options: {},
  methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
  metadata: {
    name,
    keyring: {
      type: KeyringTypes.simple,
    },
    importTime: Date.now(),
  },
});

const createMockAccountGroup = (
  id: string,
  name: string,
  accounts: string[] = [`account-${id}`],
): AccountGroupObject => {
  if (accounts.length === 1) {
    return {
      id: id as AccountGroupObject['id'],
      type: AccountGroupType.SingleAccount,
      accounts: [accounts[0]] as [string],
      metadata: {
        name,
        pinned: false,
        hidden: false,
      },
    } as AccountGroupObject;
  }
  return {
    id: id as AccountGroupObject['id'],
    type: AccountGroupType.MultichainAccount,
    accounts: accounts as [string, ...string[]],
    metadata: {
      name,
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 0,
      },
    },
  } as AccountGroupObject;
};

const createMockWallet = (
  id: string,
  name: string,
  groups: AccountGroupObject[],
): AccountWalletObject =>
  ({
    id: id as AccountWalletObject['id'],
    type: AccountWalletType.Keyring,
    metadata: {
      name,
      keyring: {
        type: KeyringTypes.simple,
      },
    },
    groups: groups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {} as Record<string, AccountGroupObject>),
  } as AccountWalletObject);

const mockFeatureFlagController = {
  RemoteFeatureFlagController: {
    remoteFeatureFlags: {
      enableMultichainAccounts: {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '1.0.0',
      },
    },
  },
};

describe('MultichainAccountSelectorList', () => {
  const mockOnSelectAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock state with accounts and internal accounts
  const createMockState = (
    wallets: AccountWalletObject[],
    internalAccounts: Record<string, InternalAccount>,
  ): DeepPartial<RootState> => ({
    engine: {
      backgroundState: {
        AccountTreeController: {
          accountTree: {
            wallets: wallets.reduce((acc, wallet) => {
              acc[`keyring:${wallet.id}`] = wallet;
              return acc;
            }, {} as Record<string, AccountWalletObject>),
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: internalAccounts,
            selectedAccount: Object.keys(internalAccounts)[0],
          },
        },
        ...mockFeatureFlagController,
      },
    },
  });

  // Helper function to create mock internal accounts from account groups
  const createMockInternalAccountsFromGroups = (
    accountGroups: AccountGroupObject[],
  ): Record<string, InternalAccount> => {
    const internalAccounts: Record<string, InternalAccount> = {};

    accountGroups.forEach((group, groupIndex) => {
      group.accounts.forEach((accountId, accountIndex) => {
        internalAccounts[accountId] = createMockInternalAccount(
          accountId,
          `0x${(groupIndex + 1).toString().padStart(4, '0')}${(accountIndex + 1)
            .toString()
            .padStart(4, '0')}${accountId.slice(-8)}`,
          group.metadata.name,
        );
      });
    });

    return internalAccounts;
  };

  // Helper function to create mock internal accounts with custom addresses
  const createMockInternalAccountsWithAddresses = (
    accountGroups: AccountGroupObject[],
    addresses: Record<string, string>,
  ): Record<string, InternalAccount> => {
    const internalAccounts: Record<string, InternalAccount> = {};

    accountGroups.forEach((group) => {
      group.accounts.forEach((accountId) => {
        const address = addresses[accountId] || `0x${accountId.slice(-8)}`;
        internalAccounts[accountId] = createMockInternalAccount(
          accountId,
          address,
          group.metadata.name,
        );
      });
    });

    return internalAccounts;
  };

  // Helper function to perform search and wait for results
  const performSearch = async (
    getByTestId: ReturnType<typeof renderWithProvider>['getByTestId'],
    queryByText: ReturnType<typeof renderWithProvider>['queryByText'],
    searchTerm: string,
    expectedVisible: string[],
    expectedHidden: string[],
  ) => {
    const searchInput = getByTestId(
      MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
    );
    fireEvent.changeText(searchInput, searchTerm);

    await waitFor(
      () => {
        expectedVisible.forEach((text) => {
          expect(queryByText(text)).toBeTruthy();
        });
        expectedHidden.forEach((text) => {
          expect(queryByText(text)).toBeFalsy();
        });
      },
      { timeout: 500 },
    );
  };

  // Helper function to render component with mock state
  const renderComponentWithMockState = (
    wallets: AccountWalletObject[],
    internalAccounts: Record<string, InternalAccount>,
    selectedAccountGroup: AccountGroupObject,
  ) => {
    const mockState = createMockState(wallets, internalAccounts);

    return renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroup={selectedAccountGroup}
      />,
      { state: mockState },
    );
  };

  it('shows accounts correctly', () => {
    const account1 = createMockAccountGroup('group1', 'Account 1');
    const account2 = createMockAccountGroup('group2', 'Account 2');
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
    const wallet2 = createMockWallet('wallet2', 'Wallet 2', [account2]);

    const internalAccounts = createMockInternalAccountsFromGroups([
      account1,
      account2,
    ]);
    const { getByText } = renderComponentWithMockState(
      [wallet1, wallet2],
      internalAccounts,
      account1,
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Wallet 2')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with different categories', () => {
    const srpAccount = createMockAccountGroup('srp-group', 'SRP Account');
    const snapAccount = createMockAccountGroup('snap-group', 'Snap Account');
    const srpWallet = createMockWallet('srp-wallet', 'Wallet 1', [srpAccount]);
    const snapWallet = createMockWallet('snap-wallet', 'Simple Keyring', [
      snapAccount,
    ]);

    const internalAccounts = createMockInternalAccountsFromGroups([
      srpAccount,
      snapAccount,
    ]);
    const { getByText } = renderComponentWithMockState(
      [srpWallet, snapWallet],
      internalAccounts,
      srpAccount,
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Simple Keyring')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with hardware wallets', () => {
    const srpAccount = createMockAccountGroup('srp-group', 'SRP Account');
    const ledgerAccount = createMockAccountGroup(
      'ledger-group',
      'Ledger Account',
    );
    const srpWallet = createMockWallet('srp-wallet', 'Wallet 1', [srpAccount]);
    const ledgerWallet = createMockWallet('ledger-wallet', 'Ledger', [
      ledgerAccount,
    ]);

    const internalAccounts = createMockInternalAccountsFromGroups([
      srpAccount,
      ledgerAccount,
    ]);
    const { getByText } = renderComponentWithMockState(
      [srpWallet, ledgerWallet],
      internalAccounts,
      srpAccount,
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Ledger')).toBeTruthy();
  });

  it('shows the correct account as selected', () => {
    const account1 = createMockAccountGroup('group1', 'Account 1');
    const account2 = createMockAccountGroup('group2', 'Account 2');
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
      account1,
      account2,
    ]);

    const internalAccounts = createMockInternalAccountsFromGroups([
      account1,
      account2,
    ]);
    const { getAllByTestId } = renderComponentWithMockState(
      [wallet1],
      internalAccounts,
      account2,
    );

    const accountCells = getAllByTestId('multichain-account-cell-container');
    fireEvent.press(accountCells[0]);

    expect(mockOnSelectAccount).toHaveBeenCalledWith(account1);
  });

  describe('Search functionality', () => {
    it('filters accounts by name', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account', [
        'account1',
      ]);
      const account2 = createMockAccountGroup('group2', 'Test Account', [
        'account2',
      ]);
      const account3 = createMockAccountGroup('group3', 'Another Account', [
        'account3',
      ]);
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
        account3,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
        account3,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Initially all accounts should be visible
      expect(queryByText('My Account')).toBeTruthy();
      expect(queryByText('Test Account')).toBeTruthy();
      expect(queryByText('Another Account')).toBeTruthy();

      // Search for "Test"
      await performSearch(
        getByTestId,
        queryByText,
        'Test',
        ['Test Account'],
        ['My Account', 'Another Account'],
      );
    });

    it('debounces search input with 300ms delay', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account', [
        'account1',
      ]);
      const account2 = createMockAccountGroup('group2', 'Test Account', [
        'account2',
      ]);
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Initially all accounts should be visible
      expect(queryByText('My Account')).toBeTruthy();
      expect(queryByText('Test Account')).toBeTruthy();

      // Type "Test" in search input
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );
      fireEvent.changeText(searchInput, 'Test');

      // Immediately after typing, both accounts should still be visible (debounced)
      expect(queryByText('My Account')).toBeTruthy();
      expect(queryByText('Test Account')).toBeTruthy();

      // Wait for debounce delay (300ms) and check that filtering has occurred
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeFalsy();
          expect(queryByText('Test Account')).toBeTruthy();
        },
        { timeout: 500 },
      );
    });

    it('filters accounts by address', async () => {
      const account1 = createMockAccountGroup('group1', 'Account 1', [
        'account1',
      ]);
      const account2 = createMockAccountGroup('group2', 'Account 2', [
        'account2',
      ]);
      const account3 = createMockAccountGroup('group3', 'Account 3', [
        'account3',
      ]);
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
        account3,
      ]);

      const customAddresses = {
        account1: '0x1234567890abcdef',
        account2: '0xabcdef1234567890',
        account3: '0x9876543210fedcba',
      };
      const internalAccounts = createMockInternalAccountsWithAddresses(
        [account1, account2, account3],
        customAddresses,
      );
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Initially all accounts should be visible
      expect(queryByText('Account 1')).toBeTruthy();
      expect(queryByText('Account 2')).toBeTruthy();
      expect(queryByText('Account 3')).toBeTruthy();

      // Search for "fedcba" (only matches Account 3)
      await performSearch(
        getByTestId,
        queryByText,
        'fedcba',
        ['Account 3'],
        ['Account 1', 'Account 2'],
      );
    });

    it('filters account groups when any account in group matches', async () => {
      const account1 = createMockAccountGroup('group1', 'Group 1', [
        'account1',
        'account2',
      ]);
      const account2 = createMockAccountGroup('group2', 'Group 2', [
        'account3',
        'account4',
      ]);
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const customAddresses = {
        account1: '0x1111111111111111',
        account2: '0x2222222222222222',
        account3: '0x3333333333333333',
        account4: '0x4444444444444444',
      };
      const internalAccounts = createMockInternalAccountsWithAddresses(
        [account1, account2],
        customAddresses,
      );
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Initially all groups should be visible
      expect(queryByText('Group 1')).toBeTruthy();
      expect(queryByText('Group 2')).toBeTruthy();

      // Search for "2222" (matches one account in Group 1)
      await performSearch(
        getByTestId,
        queryByText,
        '2222',
        ['Group 1'],
        ['Group 2'],
      );
    });

    it('filters across multiple wallets', async () => {
      const account1 = createMockAccountGroup('group1', 'Account 1', [
        'account1',
      ]);
      const account2 = createMockAccountGroup('group2', 'Account 2', [
        'account2',
      ]);
      const account3 = createMockAccountGroup('group3', 'Account 3', [
        'account3',
      ]);
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
      const wallet2 = createMockWallet('wallet2', 'Wallet 2', [
        account2,
        account3,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
        account3,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1, wallet2],
        internalAccounts,
        account1,
      );

      // Initially all accounts should be visible
      expect(queryByText('Account 1')).toBeTruthy();
      expect(queryByText('Account 2')).toBeTruthy();
      expect(queryByText('Account 3')).toBeTruthy();

      // Search for "Account 2"
      await performSearch(
        getByTestId,
        queryByText,
        'Account 2',
        ['Account 2'],
        ['Account 1', 'Account 3'],
      );
    });

    it('shows empty state when no accounts match search', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account');
      const account2 = createMockAccountGroup('group2', 'Test Account');
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { getByTestId, getByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Search for non-existent term
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );
      fireEvent.changeText(searchInput, 'NonExistentAccount');

      // Wait for debounced search to complete and check empty state
      await waitFor(
        () => {
          expect(
            getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID),
          ).toBeTruthy();
          expect(
            getByText('No accounts found matching your search'),
          ).toBeTruthy();
        },
        { timeout: 500 },
      );
    });

    it('is case insensitive', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account');
      const account2 = createMockAccountGroup('group2', 'Test Account');
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      // Search with different cases
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Test uppercase search
      fireEvent.changeText(searchInput, 'MY ACCOUNT');
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeTruthy();
          expect(queryByText('Test Account')).toBeFalsy();
        },
        { timeout: 500 },
      );

      // Test mixed case search
      fireEvent.changeText(searchInput, 'tEsT aCcOuNt');
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeFalsy();
          expect(queryByText('Test Account')).toBeTruthy();
        },
        { timeout: 500 },
      );
    });

    it('handles empty search input', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account');
      const account2 = createMockAccountGroup('group2', 'Test Account');
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Initially all accounts should be visible
      expect(queryByText('My Account')).toBeTruthy();
      expect(queryByText('Test Account')).toBeTruthy();

      // Search for something
      fireEvent.changeText(searchInput, 'Test');
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeFalsy();
          expect(queryByText('Test Account')).toBeTruthy();
        },
        { timeout: 500 },
      );

      // Clear search
      fireEvent.changeText(searchInput, '');
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeTruthy();
          expect(queryByText('Test Account')).toBeTruthy();
        },
        { timeout: 500 },
      );
    });

    it('trims whitespace from search input', async () => {
      const account1 = createMockAccountGroup('group1', 'My Account');
      const account2 = createMockAccountGroup('group2', 'Test Account');
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { getByTestId, queryByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        account1,
      );

      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Search with leading/trailing whitespace
      fireEvent.changeText(searchInput, '  My Account  ');
      await waitFor(
        () => {
          expect(queryByText('My Account')).toBeTruthy();
          expect(queryByText('Test Account')).toBeFalsy();
        },
        { timeout: 500 },
      );
    });
  });
});
