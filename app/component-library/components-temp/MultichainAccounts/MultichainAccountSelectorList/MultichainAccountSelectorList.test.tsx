import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import '@shopify/flash-list/jestSetup';
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
  createMockEntropyWallet,
  createMockState,
  createMockInternalAccountsFromGroups,
  createMockInternalAccountsWithAddresses,
} from '../test-utils';
import { ReactTestInstance } from 'react-test-renderer';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
    MultichainAccountService: {
      createNextMultichainAccountGroup: jest.fn().mockResolvedValue({
        id: 'new-account-group-id',
        metadata: { name: 'New Account' },
        accounts: [],
      }),
    },
  },
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
    selectedAccountGroups: AccountGroupObject[],
  ) => {
    const mockState = createMockState(wallets, internalAccounts);

    return renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroups={selectedAccountGroups}
      />,
      { state: mockState },
    );
  };

  it('shows accounts correctly', () => {
    const account1 = createMockAccountGroup(
      'keyring:wallet1/group1',
      'Account 1',
    );
    const account2 = createMockAccountGroup(
      'keyring:wallet2/group2',
      'Account 2',
    );
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
    const wallet2 = createMockWallet('wallet2', 'Wallet 2', [account2]);

    const internalAccounts = createMockInternalAccountsFromGroups([
      account1,
      account2,
    ]);
    const { getByText } = renderComponentWithMockState(
      [wallet1, wallet2],
      internalAccounts,
      [],
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Wallet 2')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with different categories', () => {
    const srpAccount = createMockAccountGroup(
      'keyring:srp-wallet/srp-group',
      'SRP Account',
    );
    const snapAccount = createMockAccountGroup(
      'keyring:snap-wallet/snap-group',
      'Snap Account',
    );
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
      [],
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Simple Keyring')).toBeTruthy();
  });

  it('shows accounts correctly when there are multiple accounts with hardware wallets', () => {
    const srpAccount = createMockAccountGroup(
      'keyring:srp-wallet/srp-group',
      'SRP Account',
    );
    const ledgerAccount = createMockAccountGroup(
      'keyring:ledger-wallet/ledger-group',
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
      [],
    );

    expect(getByText('Wallet 1')).toBeTruthy();
    expect(getByText('Ledger')).toBeTruthy();
  });

  it('shows the correct account as selected', () => {
    const account1 = createMockAccountGroup(
      'keyring:wallet1/group1',
      'Account 1',
    );
    const account2 = createMockAccountGroup(
      'keyring:wallet1/group2',
      'Account 2',
    );
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
      [],
    );

    const accountCells = getAllByTestId('multichain-account-cell-container');
    const account1Cell = accountCells.find((cell) =>
      within(cell).queryByText('Account 1'),
    );
    expect(account1Cell).toBeTruthy();
    fireEvent.press(account1Cell as ReactTestInstance);

    expect(mockOnSelectAccount).toHaveBeenCalledWith(account1);
  });

  describe('Search functionality', () => {
    it('filters accounts by name', async () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
        ['account2'],
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet1/group3',
        'Another Account',
        ['account3'],
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
        ['account2'],
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
        ['account2'],
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet1/group3',
        'Account 3',
        ['account3'],
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Group 1',
        ['account1', 'account2'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Group 2',
        ['account3', 'account4'],
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet2/group2',
        'Account 2',
        ['account2'],
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet2/group3',
        'Account 3',
        ['account3'],
      );
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
        [],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
      );
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
        [account1],
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
      );
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
        [account1],
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
        { timeout: 1200 },
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
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'My Account',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Test Account',
      );
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
        [account1],
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

  describe('Account Creation and Scrolling', () => {
    it('renders AccountListFooter with correct props', () => {
      const account1 = createMockAccountGroup(
        'entropy:wallet1/group1',
        'Account 1',
      );
      const wallet1 = createMockEntropyWallet('wallet1', 'Wallet 1', [
        account1,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([account1]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { getByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
        />,
        { state: mockState },
      );

      // Verify the component renders correctly with AccountListFooter
      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('Create account')).toBeTruthy();
    });

    it('handles multiple wallets with AccountListFooter', () => {
      const account1 = createMockAccountGroup(
        'entropy:wallet1/group1',
        'Account 1',
      );
      const account2 = createMockAccountGroup(
        'entropy:wallet2/group2',
        'Account 2',
      );
      const wallet1 = createMockEntropyWallet('wallet1', 'Wallet 1', [
        account1,
      ]);
      const wallet2 = createMockEntropyWallet('wallet2', 'Wallet 2', [
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);

      const { getAllByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
        />,
        { state: createMockState([wallet1, wallet2], internalAccounts) },
      );

      // Should have multiple "Create account" buttons (one per wallet)
      const createAccountButtons = getAllByText('Create account');
      expect(createAccountButtons.length).toBe(2);
    });

    it('passes walletId to AccountListFooter', () => {
      const account1 = createMockAccountGroup(
        'entropy:wallet1/group1',
        'Account 1',
      );
      const wallet1 = createMockEntropyWallet('wallet1', 'Wallet 1', [
        account1,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([account1]);

      const { getByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Verify the component renders correctly
      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('Create account')).toBeTruthy();
    });

    it('positions the list so the first selected account is initially visible', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);

      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const { queryByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account2]}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      expect(queryByText('Account 2')).toBeTruthy();
    });
    it('renders a far selected account in the initial viewport when provided as initial selection', () => {
      // Create many accounts so the selected one is far enough to require initialScrollIndex
      const total = 60;
      const accounts = Array.from({ length: total }, (_, i) =>
        createMockAccountGroup(
          `keyring:wallet1/group${i + 1}`,
          `Account ${i + 1}`,
        ),
      );
      const selectedIdx = 36;
      const selected = accounts[selectedIdx];
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', accounts);

      const internalAccounts = createMockInternalAccountsFromGroups(accounts);

      const { queryByText } = renderWithProvider(
        <MultichainAccountSelectorList selectedAccountGroups={[selected]} />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Without initialScrollIndex, this would not be visible initially
      expect(queryByText(`Account ${selectedIdx + 1}`)).toBeTruthy();
      expect(queryByText('Account 1')).toBeFalsy();
    });
  });

  describe('Keyboard Avoiding View', () => {
    it('enables keyboard avoiding view when there is 1 account', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);

      const internalAccounts = createMockInternalAccountsFromGroups([account1]);
      const mockSetKeyboardAvoidingViewEnabled = jest.fn();

      renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          setKeyboardAvoidingViewEnabled={mockSetKeyboardAvoidingViewEnabled}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Should be called with true since there is only 1 account
      expect(mockSetKeyboardAvoidingViewEnabled).toHaveBeenCalledWith(true);
    });

    it('disables keyboard avoiding view when there are more than 2 accounts', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet1/group3',
        'Account 3',
      );
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
      const mockSetKeyboardAvoidingViewEnabled = jest.fn();

      renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          setKeyboardAvoidingViewEnabled={mockSetKeyboardAvoidingViewEnabled}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Should be called with false since there are 3 accounts
      expect(mockSetKeyboardAvoidingViewEnabled).toHaveBeenCalledWith(false);
    });

    it('does not call setKeyboardAvoidingViewEnabled when prop is not provided', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
      const internalAccounts = createMockInternalAccountsFromGroups([account1]);

      // Render without setKeyboardAvoidingViewEnabled prop
      const result = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Should render without errors when prop is not provided
      expect(result).toBeTruthy();
    });

    it('updates keyboard avoiding view when filtered data changes', async () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Test Account',
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'My Account',
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet1/group3',
        'Another Account',
      );
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
      const mockSetKeyboardAvoidingViewEnabled = jest.fn();

      const { getByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          setKeyboardAvoidingViewEnabled={mockSetKeyboardAvoidingViewEnabled}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Initially called with false (3 accounts)
      expect(mockSetKeyboardAvoidingViewEnabled).toHaveBeenCalledWith(false);

      // Search to filter down to 1 account
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );
      fireEvent.changeText(searchInput, 'Test');

      // Wait for debounce and re-render
      await waitFor(
        () => {
          // Should be called with true since filtered results show only 1 account
          expect(mockSetKeyboardAvoidingViewEnabled).toHaveBeenLastCalledWith(
            true,
          );
        },
        { timeout: 500 },
      );
    });
  });

  describe('Checkbox functionality', () => {
    it('shows checkboxes when showCheckbox prop is true', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
      const internalAccounts = createMockInternalAccountsFromGroups([account1]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { getAllByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Ensure wrapper exists with expected testID (from ListItemSelect)
      const wrappers = getAllByTestId('list-item-select');
      expect(wrappers.length).toBeGreaterThan(0);
    });

    it('hides checkboxes when showCheckbox prop is false', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
      const internalAccounts = createMockInternalAccountsFromGroups([account1]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { queryByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          showCheckbox={false}
        />,
        { state: mockState },
      );

      expect(
        queryByTestId(`account-list-cell-checkbox-${account1.id}`),
      ).toBeFalsy();
    });

    it('displays checked checkbox for selected accounts', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
        ['account2'],
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);
      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { getByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
          showCheckbox
        />,
        { state: mockState },
      );

      // The Checkbox component renders an icon when checked
      expect(getByTestId('checkbox-icon-component')).toBeTruthy();
    });

    it('displays unchecked checkbox for unselected accounts', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
        ['account2'],
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [
        account1,
        account2,
      ]);
      const internalAccounts = createMockInternalAccountsFromGroups([
        account1,
        account2,
      ]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { queryByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Check that there are no checked checkbox icons (since none are selected)
      expect(queryByTestId('checkbox-icon-component')).toBeFalsy();
    });

    it('calls onSelectAccount when checkbox is pressed', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
      const internalAccounts = createMockInternalAccountsFromGroups([account1]);
      const mockState = createMockState([wallet1], internalAccounts);

      const { getAllByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Press the list item wrapper (acts as the selection control)
      const wrappers = getAllByTestId('list-item-select');
      fireEvent.press(wrappers[0]);

      expect(mockOnSelectAccount).toHaveBeenCalledWith(account1);
    });

    it('shows checkboxes correctly with multiple selected accounts', () => {
      const account1 = createMockAccountGroup(
        'keyring:wallet1/group1',
        'Account 1',
        ['account1'],
      );
      const account2 = createMockAccountGroup(
        'keyring:wallet1/group2',
        'Account 2',
        ['account2'],
      );
      const account3 = createMockAccountGroup(
        'keyring:wallet1/group3',
        'Account 3',
        ['account3'],
      );
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
      const mockState = createMockState([wallet1], internalAccounts);

      const { getAllByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1, account3]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Check that there are checked checkbox icons (for the 2 selected accounts)
      const checkedIcons = getAllByTestId('checkbox-icon-component');
      expect(checkedIcons.length).toEqual(2);
    });
  });
});
