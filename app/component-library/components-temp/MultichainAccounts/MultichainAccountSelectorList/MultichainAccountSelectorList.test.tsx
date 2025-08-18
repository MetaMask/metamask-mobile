import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import MultichainAccountSelectorList from './MultichainAccountSelectorList';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
} from './MultichainAccountSelectorList.constants';
import {
  createMockAccountGroup,
  createMockWallet,
  createMockState,
  createMockInternalAccountsFromGroups,
  createMockInternalAccountsWithAddresses,
} from '../test-utils';

describe('MultichainAccountSelectorList', () => {
  const mockOnSelectAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        { timeout: 1000 }, // Increased timeout to account for debounce delay
      );
    });
  });
});
