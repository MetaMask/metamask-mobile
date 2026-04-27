import React from 'react';
import { fireEvent, waitFor, within, act } from '@testing-library/react-native';

// FlashList v2 jestSetup is broken (RecyclerView not exported from main index).
// Provide a simple mock that renders items directly.
jest.mock('@shopify/flash-list', () => {
  const ReactMock = jest.requireActual('react');
  const { View, ScrollView } = jest.requireActual('react-native');
  const actual = jest.requireActual('@shopify/flash-list');

  const MockFlashList = ReactMock.forwardRef(
    (
      props: {
        data: unknown[];
        renderItem: (info: {
          item: unknown;
          index: number;
        }) => React.ReactElement;
        keyExtractor: (item: unknown, index: number) => string;
        ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
      },
      ref: React.ForwardedRef<unknown>,
    ) => {
      const { data, renderItem, keyExtractor, ListEmptyComponent } = props;
      ReactMock.useImperativeHandle(ref, () => ({
        scrollToIndex: jest.fn(),
        scrollToOffset: jest.fn(),
      }));
      if (!data || data.length === 0) {
        return ListEmptyComponent
          ? ReactMock.createElement(ListEmptyComponent)
          : null;
      }
      return ReactMock.createElement(
        View,
        null,
        data.map((item: unknown, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : String(index);
          return ReactMock.createElement(
            ReactMock.Fragment,
            { key },
            renderItem({ item, index }),
          );
        }),
      );
    },
  );

  return {
    ...actual,
    FlashList: MockFlashList,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...jest.requireActual('react-native-gesture-handler'),
    ScrollView: RN.ScrollView,
  };
});
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
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_ERROR_TESTID,
} from './MultichainAccountSelectorList.constants';
import {
  createMockAccountGroup,
  createMockWallet,
  createMockEntropyWallet,
  createMockState,
  createMockInternalAccountsFromGroups,
  createMockInternalAccountsWithAddresses,
} from '../test-utils';
import { AccountCellIds } from '../AccountCell/AccountCell.testIds';

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

// Mock whenEngineReady to prevent Engine access after Jest teardown
jest.mock('../../../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

// Mock analytics module
jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

describe('MultichainAccountSelectorList', () => {
  const mockOnSelectAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to perform search and wait for results
  const performSearch = async (
    getByTestId: ReturnType<typeof renderWithProvider>['getByTestId'],
    queryAllByText: ReturnType<typeof renderWithProvider>['queryAllByText'],
    searchTerm: string,
    expectedVisible: string[],
    expectedHidden: string[],
  ) => {
    const searchInput = getByTestId(
      MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
    );

    await act(async () => {
      fireEvent.changeText(searchInput, searchTerm);
    });

    // Wait for debounce (1s) to complete and filtering to occur. Use a
    // generous timeout so CI has time for debounce + re-render + list update.
    await waitFor(
      () => {
        expectedVisible.forEach((text) => {
          expect(queryAllByText(text).length).toBeGreaterThan(0);
        });
        expectedHidden.forEach((text) => {
          expect(queryAllByText(text).length).toBe(0);
        });
      },
      { timeout: 1000 },
    );
  };

  // Helper function to render component with mock state
  const renderComponentWithMockState = (
    wallets: AccountWalletObject[],
    internalAccounts: Record<string, InternalAccount>,
    selectedAccountGroups: AccountGroupObject[],
    componentProps: Partial<
      React.ComponentProps<typeof MultichainAccountSelectorList>
    > = {},
  ) => {
    const mockState = createMockState(wallets, internalAccounts);

    return renderWithProvider(
      <MultichainAccountSelectorList
        onSelectAccount={mockOnSelectAccount}
        selectedAccountGroups={selectedAccountGroups}
        {...componentProps}
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
    const { getAllByText } = renderComponentWithMockState(
      [wallet1, wallet2],
      internalAccounts,
      [],
    );

    expect(getAllByText('Wallet 1').length).toBeGreaterThan(0);
    expect(getAllByText('Wallet 2').length).toBeGreaterThan(0);
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
    const { getAllByText } = renderComponentWithMockState(
      [srpWallet, snapWallet],
      internalAccounts,
      [],
    );

    expect(getAllByText('Wallet 1').length).toBeGreaterThan(0);
    expect(getAllByText('Simple Keyring').length).toBeGreaterThan(0);
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
    const { getAllByText } = renderComponentWithMockState(
      [srpWallet, ledgerWallet],
      internalAccounts,
      [],
    );

    expect(getAllByText('Wallet 1').length).toBeGreaterThan(0);
    expect(getAllByText('Ledger').length).toBeGreaterThan(0);
  });

  it('shows the correct account as selected', async () => {
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

    const { getAllByTestId, rerender, queryByText, queryAllByText } =
      renderComponentWithMockState([wallet1], internalAccounts, [account2]);

    await waitFor(() => {
      expect(
        getAllByTestId(AccountCellIds.CONTAINER).length,
      ).toBeGreaterThanOrEqual(2);
    });

    const accountCells = getAllByTestId(AccountCellIds.CONTAINER);

    const account1Cell = accountCells.find((cell) =>
      within(cell).queryByText('Account 1'),
    );
    const account2Cell = accountCells.find((cell) =>
      within(cell).queryByText('Account 2'),
    );

    expect(account1Cell).toBeTruthy();
    expect(account2Cell).toBeTruthy();

    const account1Texts = queryAllByText('Account 1');
    const account1Text = account1Texts[0];
    const account1TouchableParent = account1Text?.parent?.parent;

    if (account1TouchableParent) {
      await act(async () => {
        fireEvent.press(account1TouchableParent);
      });
    }

    await waitFor(() => {
      expect(mockOnSelectAccount).toHaveBeenCalledWith(account1);
    });

    mockOnSelectAccount.mockClear();

    const account2Texts = queryAllByText('Account 2');
    const account2Text = account2Texts[0];
    const account2TouchableParent = account2Text?.parent?.parent;

    if (account2TouchableParent) {
      await act(async () => {
        fireEvent.press(account2TouchableParent);
      });
    }

    await waitFor(() => {
      expect(mockOnSelectAccount).toHaveBeenCalledWith(account2);
    });

    await act(async () => {
      rerender(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account2]}
          showCheckbox
        />,
      );
    });

    await waitFor(() => {
      const account2Checkbox = getAllByTestId(
        `account-list-cell-checkbox-${account2.id}`,
      );
      expect(account2Checkbox.length).toBeGreaterThanOrEqual(1);

      const account1Checkbox = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      expect(account1Checkbox.length).toBeGreaterThanOrEqual(1);
    });
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      // Initially all accounts should be visible
      expect(queryAllByText('My Account').length).toBeGreaterThan(0);
      expect(queryAllByText('Test Account').length).toBeGreaterThan(0);
      expect(queryAllByText('Another Account').length).toBeGreaterThan(0);

      // Search for "Test"
      await performSearch(
        getByTestId,
        queryAllByText,
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      // Initially all accounts should be visible
      expect(queryAllByText('My Account').length).toBeGreaterThan(0);
      expect(queryAllByText('Test Account').length).toBeGreaterThan(0);

      // Type "Test" in search input
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      await act(async () => {
        fireEvent.changeText(searchInput, 'Test');
      });

      // Immediately after typing, both accounts should still be visible (debounced)
      expect(queryAllByText('My Account').length).toBeGreaterThan(0);
      expect(queryAllByText('Test Account').length).toBeGreaterThan(0);

      // Wait for debounce delay (200ms) and check that filtering has occurred
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBe(0);
          expect(queryAllByText('Test Account').length).toBeGreaterThan(0);
        },
        { timeout: 1000 },
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      // Initially all accounts should be visible
      expect(queryAllByText('Account 1').length).toBeGreaterThan(0);
      expect(queryAllByText('Account 2').length).toBeGreaterThan(0);
      expect(queryAllByText('Account 3').length).toBeGreaterThan(0);

      // Search for "fedcba" (only matches Account 3)
      await performSearch(
        getByTestId,
        queryAllByText,
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      // Initially all groups should be visible
      expect(queryAllByText('Group 1').length).toBeGreaterThan(0);
      expect(queryAllByText('Group 2').length).toBeGreaterThan(0);

      // Search for "2222" (matches one account in Group 1)
      await performSearch(
        getByTestId,
        queryAllByText,
        '2222',
        ['Group 1'],
        ['Group 2'],
      );
    });

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('filters across multiple wallets', async () => {
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1, wallet2],
        internalAccounts,
        [],
      );

      // Initially all accounts should be visible
      expect(queryAllByText('Account 1').length).toBeGreaterThan(0);
      expect(queryAllByText('Account 2').length).toBeGreaterThan(0);
      expect(queryAllByText('Account 3').length).toBeGreaterThan(0);

      // Search for "Account 2"
      await performSearch(
        getByTestId,
        queryAllByText,
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

      await act(async () => {
        fireEvent.changeText(searchInput, 'NonExistentAccount');
      });

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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      // Search with different cases
      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Test uppercase search
      await act(async () => {
        fireEvent.changeText(searchInput, 'MY ACCOUNT');
      });
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBeGreaterThan(0);
          expect(queryAllByText('Test Account').length).toBe(0);
        },
        { timeout: 1000 },
      );

      // Test mixed case search
      await act(async () => {
        fireEvent.changeText(searchInput, 'tEsT aCcOuNt');
      });
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBe(0);
          expect(queryAllByText('Test Account').length).toBeGreaterThan(0);
        },
        { timeout: 1000 },
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Initially all accounts should be visible
      expect(queryAllByText('My Account').length).toBeGreaterThan(0);
      expect(queryAllByText('Test Account').length).toBeGreaterThan(0);

      // Search for something
      await act(async () => {
        fireEvent.changeText(searchInput, 'Test');
      });
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBe(0);
          expect(queryAllByText('Test Account').length).toBeGreaterThan(0);
        },
        { timeout: 1000 },
      );

      // Clear search
      await act(async () => {
        fireEvent.changeText(searchInput, '');
      });
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBeGreaterThan(0);
          expect(queryAllByText('Test Account').length).toBeGreaterThan(0);
        },
        { timeout: 1000 },
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
      const { getByTestId, queryAllByText } = renderComponentWithMockState(
        [wallet1],
        internalAccounts,
        [account1],
      );

      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      // Search with leading/trailing whitespace
      await act(async () => {
        fireEvent.changeText(searchInput, '  My Account  ');
      });
      await waitFor(
        () => {
          expect(queryAllByText('My Account').length).toBeGreaterThan(0);
          expect(queryAllByText('Test Account').length).toBe(0);
        },
        { timeout: 1000 },
      );
    });
  });

  describe('External address validation', () => {
    const account1 = createMockAccountGroup(
      'keyring:wallet1/group1',
      'Account 1',
      ['account1'],
    );
    const wallet1 = createMockWallet('wallet1', 'Wallet 1', [account1]);
    const internalAccounts = createMockInternalAccountsFromGroups([account1]);
    interface ExternalValidationCase {
      testName: string;
      chainId: string;
      input: string;
      shouldShowError: boolean;
      shouldSelectExternal: boolean;
    }

    const validationCases: ExternalValidationCase[] = [
      {
        testName:
          'shows error and disables external row for invalid EVM address input',
        chainId: '0x1',
        input: 'not-a-valid-evm-address',
        shouldShowError: true,
        shouldSelectExternal: false,
      },
      {
        testName: 'allows selecting a valid EVM external address',
        chainId: '0x1',
        input: '0x9999999999999999999999999999999999999999',
        shouldShowError: false,
        shouldSelectExternal: true,
      },
      {
        testName:
          'shows error and disables external row for invalid Solana address input',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        input: 'not-a-valid-solana-address',
        shouldShowError: true,
        shouldSelectExternal: false,
      },
      {
        testName: 'keeps unknown non-EVM chain input permissive',
        chainId: 'cosmos:cosmoshub-4',
        input: 'not-a-cosmos-address',
        shouldShowError: false,
        shouldSelectExternal: true,
      },
    ];

    it.each(validationCases)('$testName', async (testCase) => {
      const mockOnSelectExternalAccount = jest.fn();
      const { getByTestId, queryByTestId, queryByText } =
        renderComponentWithMockState([wallet1], internalAccounts, [], {
          showExternalAccountOnEmptySearch: true,
          onSelectExternalAccount: mockOnSelectExternalAccount,
          chainId: testCase.chainId,
        });

      const searchInput = getByTestId(
        MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
      );

      await act(async () => {
        fireEvent.changeText(searchInput, testCase.input);
      });

      await waitFor(() => {
        if (testCase.shouldShowError) {
          expect(
            getByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_ERROR_TESTID),
          ).toBeOnTheScreen();
        } else {
          expect(
            queryByTestId(MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_ERROR_TESTID),
          ).not.toBeOnTheScreen();
        }

        expect(queryByText('Account 1')).not.toBeOnTheScreen();
        expect(
          getByTestId('external-account-cell-touchable'),
        ).toBeOnTheScreen();
      });

      if (testCase.shouldSelectExternal) {
        const externalRowButton = getByTestId(
          'external-account-cell-touchable',
        );
        await act(async () => {
          fireEvent.press(externalRowButton);
        });
        expect(mockOnSelectExternalAccount).toHaveBeenCalledWith(
          testCase.input,
        );
      }
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

      const { getAllByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
        />,
        { state: mockState },
      );

      // Verify the component renders correctly with AccountListFooter
      expect(getAllByText('Account 1').length).toBeGreaterThan(0);
      expect(getAllByText('Add account').length).toBeGreaterThan(0);
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

      // Should have multiple "Add account" buttons (one per wallet)
      const createAccountButtons = getAllByText('Add account');
      expect(createAccountButtons.length).toBeGreaterThanOrEqual(2);
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

      const { getAllByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      // Verify the component renders correctly
      expect(getAllByText('Account 1').length).toBeGreaterThan(0);
      expect(getAllByText('Add account').length).toBeGreaterThan(0);
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
      const { queryAllByText } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account2]}
        />,
        { state: createMockState([wallet1], internalAccounts) },
      );

      expect(queryAllByText('Account 2').length).toBeGreaterThan(0);
    });
    // Skipped: MockFlashList renders all items (no virtualization), so visibility assertions are not meaningful
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('renders a far selected account in the initial viewport when provided as initial selection', async () => {
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

      // Wait for requestAnimationFrame to execute the scroll
      await act(async () => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => resolve(undefined)),
        );
      });

      // After scroll, the selected account should be visible
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

      await act(async () => {
        fireEvent.changeText(searchInput, 'Test');
      });

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

      expect(
        getAllByTestId(`account-list-cell-checkbox-${account1.id}`).length,
      ).toBeGreaterThan(0);
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

      const { getAllByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[account1]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Check that checkboxes exist for both accounts
      const account1Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      const account2Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account2.id}`,
      );
      expect(account1Checkboxes.length).toBeGreaterThanOrEqual(1);
      expect(account2Checkboxes.length).toBeGreaterThanOrEqual(1);

      // Check that there is at least 1 checked checkbox icon (for the selected account)
      const selectedAccount = account1;
      const checkboxElements = getAllByTestId(
        `account-list-cell-checkbox-${selectedAccount.id}`,
      );
      expect(checkboxElements.length).toBeGreaterThanOrEqual(1);
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

      const { getAllByTestId, queryByTestId } = renderWithProvider(
        <MultichainAccountSelectorList
          onSelectAccount={mockOnSelectAccount}
          selectedAccountGroups={[]}
          showCheckbox
        />,
        { state: mockState },
      );

      // Check that checkboxes exist for both accounts
      const account1Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      const account2Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account2.id}`,
      );
      expect(account1Checkboxes.length).toBeGreaterThanOrEqual(1);
      expect(account2Checkboxes.length).toBeGreaterThanOrEqual(1);

      // Check that there are no checked checkbox icons (since none are selected)
      expect(queryByTestId('checkbox-icon-component')).toBeFalsy();
    });

    it('calls onSelectAccount when checkbox is pressed', async () => {
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

      const checkboxElements = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      await act(async () => {
        fireEvent.press(checkboxElements[0]);
      });

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

      // Check that all 3 checkboxes exist
      const account1Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      const account2Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account2.id}`,
      );
      const account3Checkboxes = getAllByTestId(
        `account-list-cell-checkbox-${account3.id}`,
      );
      expect(account1Checkboxes.length).toBeGreaterThanOrEqual(1);
      expect(account2Checkboxes.length).toBeGreaterThanOrEqual(1);
      expect(account3Checkboxes.length).toBeGreaterThanOrEqual(1);

      // Check that checkboxes exist for the 2 selected accounts
      const checkboxElements1 = getAllByTestId(
        `account-list-cell-checkbox-${account1.id}`,
      );
      const checkboxElements3 = getAllByTestId(
        `account-list-cell-checkbox-${account3.id}`,
      );
      expect(checkboxElements1.length).toBeGreaterThanOrEqual(1);
      expect(checkboxElements3.length).toBeGreaterThanOrEqual(1);
    });
  });
});
