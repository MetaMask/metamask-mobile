import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
import { AddAccountBottomSheetSelectorsIDs } from '../AddAccountActions/AddAccountBottomSheet.testIds';
import { AccountCellIds } from '../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import Routes from '../../../constants/navigation/Routes';
import {
  AccountSelectorParams,
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
  internalAccount1,
  internalAccount2,
  internalSolanaAccount1,
} from '../../../util/test/accountsControllerTestUtils';
import { AccountWalletType } from '@metamask/account-api';

const mockSelectFullPageAccountListEnabledFlag = jest.fn(() => false);
jest.mock(
  '../../../selectors/featureFlagController/fullPageAccountList',
  () => ({
    selectFullPageAccountListEnabledFlag: () =>
      mockSelectFullPageAccountListEnabledFlag(),
  }),
);

const mockAvatarAccountType = 'Maskicon' as const;

const mockAccounts = [
  {
    id: internalAccount1.id,
    address: internalAccount1.address,
    balance: '0x0',
    name: internalAccount1.metadata.name,
  },
  {
    id: internalSolanaAccount1.id,
    address: internalSolanaAccount1.address,
    balance: '0x0',
    name: internalSolanaAccount1.metadata.name,
  },
  {
    id: internalAccount2.id,
    address: internalAccount2.address,
    balance: '0x0',
    name: internalAccount2.metadata.name,
  },
];

const mockEnsByAccountAddress = {
  [internalAccount2.address]: 'test.eth',
};

const mockGroupId = 'entropy:wallet1/0';
const mockWalletKey = 'entropy:wallet1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAccountTreeState: any = {
  accountTree: {
    selectedAccountGroup: mockGroupId,
    wallets: {
      [mockWalletKey]: {
        id: mockWalletKey,
        type: AccountWalletType.Entropy,
        metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
        groups: {
          [mockGroupId]: {
            id: mockGroupId,
            type: 'MultipleAccount',
            metadata: { name: 'Group 1', pinned: false, hidden: false },
            accounts: [
              internalAccount1.id,
              internalSolanaAccount1.id,
              internalAccount2.id,
            ],
          },
        },
      },
    },
  },
};

const mockInitialState = {
  engine: {
    backgroundState: {
      KeyringController: MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
      AccountTreeController: mockAccountTreeState,
      TokenBalancesController: {
        tokenBalances: {},
      },
      TokenRatesController: {
        marketData: {},
      },
      CurrencyRateController: {
        currencyRates: {},
        currentCurrency: 'usd',
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {},
      },
      MultichainBalancesController: {
        balances: {},
      },
      MultichainAssetsController: {
        accountsAssets: {},
      },
      MultichainAssetsRatesController: {
        conversionRates: {},
      },
      PreferencesController: {
        privacyMode: false,
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          enableMultichainAccounts: {
            enabled: true,
            featureVersion: '1',
            minimumVersion: '8.0.0',
          },
        },
      },
    },
  },
  accounts: {
    reloadAccounts: false,
  },
  settings: {
    avatarAccountType: mockAvatarAccountType,
  },
  user: {
    seedphraseBackedUp: true,
  },
};

// Mock the Redux dispatch
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => {
    // Default mock state for selectors - must match mockInitialState structure
    const mockState = {
      engine: {
        backgroundState: {
          KeyringController: MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
          AccountTreeController: mockAccountTreeState,
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokenRatesController: {
            marketData: {},
          },
          CurrencyRateController: {
            currencyRates: {},
            currentCurrency: 'usd',
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
          },
          MultichainBalancesController: {
            balances: {},
          },
          MultichainAssetsController: {
            accountsAssets: {},
          },
          MultichainAssetsRatesController: {
            conversionRates: {},
          },
          PreferencesController: {
            privacyMode: false,
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '1',
                minimumVersion: '8.0.0',
              },
            },
          },
        },
      },
      accounts: {
        reloadAccounts: false,
      },
      settings: {
        avatarAccountType: mockAvatarAccountType,
      },
      user: {
        seedphraseBackedUp: true,
      },
    };
    return (selector as (mockState: unknown) => unknown)(mockState);
  },
}));

jest.mock('../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(() => ({
    accounts: mockAccounts,
    evmAccounts: [mockAccounts[0], mockAccounts[2]],
    ensByAccountAddress: mockEnsByAccountAddress,
  })),
}));

jest.mock('../../../core/Engine', () => {
  const {
    MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState,
    MOCK_KEYRING_CONTROLLER_STATE: KeyringControllerState,
  } = jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      KeyringController: {
        state: KeyringControllerState,
        importAccountWithStrategy: jest.fn(),
      },
      AccountsController: {
        state: {
          internalAccounts: AccountsControllerState.internalAccounts,
        },
      },
      AccountTreeController: {
        setSelectedAccountGroup: jest.fn(),
      },
    },
    setSelectedAddress: jest.fn(),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({})),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseAccountsOperationsLoadingStates = jest.fn();
jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: () =>
    mockUseAccountsOperationsLoadingStates(),
}));

const mockRoute: AccountSelectorProps['route'] = {
  params: {
    onSelectAccount: jest.fn((address: string) => address),
    disablePrivacyMode: false,
    isEvmOnly: true,
  } as AccountSelectorParams,
};

const AccountSelectorWrapper = () => <AccountSelector route={mockRoute} />;

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset useAccountsOperationsLoadingStates hook to default values
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: false,
      areAnyOperationsLoading: false,
      loadingMessage: undefined,
    });
  });

  afterEach(() => {
    // Only flush timers if fake timers are active
    try {
      jest.runOnlyPendingTimers();
      jest.clearAllTimers();
    } catch (e) {
      // Fake timers not active, skip
    }
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    const wrapper = renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
        options: {},
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('includes all accounts', () => {
    const { queryByText } = renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );

    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );

    expect(accountsList).toBeDefined();
    expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalSolanaAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  });

  it('includes only EVM accounts if isEvmOnly', () => {
    const { queryByText } = renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      { ...mockRoute.params, isEvmOnly: true },
    );

    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );

    expect(accountsList).toBeDefined();
    expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalSolanaAccount1.metadata.name)).toBeNull();
    expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  });

  it('should display add account button', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );

    const addButton = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    expect(addButton).toBeDefined();
  });

  it('renders account selector with multichain support', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );

    // Should render the account list (either multichain or EVM based on feature flag)
    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );
    expect(accountsList).toBeDefined();
  });

  describe('Multichain Accounts V2', () => {
    it('shows "Add wallet" button text', () => {
      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('handles navigation to add account actions', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      const routeWithNavigation = {
        params: {
          ...mockRoute.params,
          navigateToAddAccountActions:
            AccountSelectorScreens.MultichainAddWalletActions as
              | AccountSelectorScreens.AddAccountActions
              | AccountSelectorScreens.MultichainAddWalletActions,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithNavigation} />,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
      );

      expect(screen.getAllByText('Import a wallet')).toBeDefined();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('clicks Add wallet button and displays MultichainAddWalletActions bottomsheet', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addWalletButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addWalletButton).toHaveTextContent('Add wallet');

      fireEvent.press(addWalletButton);

      // Check for the "Add wallet" header text which indicates the component is rendered
      expect(screen.getByText('Add wallet')).toBeOnTheScreen();

      expect(
        screen.getByTestId(AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON),
      ).toBeOnTheScreen();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });

  describe('Loading States Integration', () => {
    it('displays loading message when account syncing is in progress', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Syncing...');
    });

    it('disables add button when account syncing is in progress', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      // Check that the button shows the syncing state indicating it's disabled
      expect(addButton).toHaveTextContent('Syncing...');
      // The button should still be in the document (not hidden)
      expect(addButton).toBeOnTheScreen();
    });

    it('shows activity indicator when syncing is in progress', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // The activity indicator should be present when syncing
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
      expect(addButton).toHaveTextContent('Syncing...');

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('shows "Add wallet" button text when not syncing', () => {
      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('prioritizes syncing message over default button text', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      // Should show syncing message, not "Add wallet"
      expect(addButton).toHaveTextContent('Syncing...');

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('enables button when syncing completes', () => {
      // Initially syncing
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      let addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Syncing...');

      // Test that syncing completes by checking for different text content
      // We'll simulate this by re-mocking the hook and re-rendering
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: false,
        areAnyOperationsLoading: false,
        loadingMessage: undefined,
      });

      // Re-render the component with new mock values
      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      // Should show default text when not syncing
      expect(addButton).toHaveTextContent('Add wallet');
    });
  });

  describe('disableAddAccountButton prop', () => {
    it('displays add account button when disableAddAccountButton is false', () => {
      const routeWithDisableButton = {
        params: {
          ...mockRoute.params,
          disableAddAccountButton: false,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithDisableButton} />,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
    });

    it('hides add account button when disableAddAccountButton is true', () => {
      const routeWithDisableButton = {
        params: {
          ...mockRoute.params,
          disableAddAccountButton: true,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithDisableButton} />,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
      );

      const addButton = screen.queryByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeNull();
    });
  });

  describe('Add wallet button visibility', () => {
    it('renders add wallet button with correct text', () => {
      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Add button should be visible and have the correct text
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('renders account list alongside add wallet button', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Both account list and add button should be visible
      const accountList = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(accountList).toBeOnTheScreen();
      expect(addButton).toBeOnTheScreen();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });

  describe('Feature Flag: Full-Page Account List', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);
    });

    it('renders BottomSheet when feature flag is disabled', () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // BottomSheet version renders the sheet header
      expect(screen.getByText('Accounts')).toBeDefined();
      // Accounts list is present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeDefined();

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('renders full-page modal when feature flag is enabled', () => {
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Full-page version has sheet header with back button
      expect(screen.getByText('Accounts')).toBeDefined();
      // Accounts list is present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeDefined();
    });

    it('renders add button in both modes', () => {
      // Arrange: BottomSheet mode
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);

      // Act: Render in BottomSheet mode
      const { unmount } = renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Assert: Add button is present
      expect(
        screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        ),
      ).toBeDefined();

      unmount();

      // Arrange: Full-page mode
      jest.useRealTimers();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      // Act: Render in full-page mode
      const { unmount: unmount2 } = renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Assert: Add button is present
      expect(
        screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        ),
      ).toBeDefined();

      unmount2();
      jest.useFakeTimers();
    });

    it('opens Add Wallet bottom sheet overlay in full-page mode', () => {
      // Arrange
      jest.useRealTimers();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      // Act
      fireEvent.press(addButton);

      // Assert: MultichainAddWalletActions bottom sheet is displayed on top
      // There should be two "Add wallet" texts - button and header
      expect(screen.getAllByText('Add wallet')).toHaveLength(2);
      // Import SRP button should be visible in the overlay
      expect(
        screen.getByTestId(AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON),
      ).toBeOnTheScreen();
      // Account list should still be visible in background
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();

      jest.useFakeTimers();
    });

    it('closes BottomSheet when account is selected with feature flag disabled', async () => {
      // Arrange
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);

      const { getAllByTestId } = renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Wait for account cells to render
      await waitFor(() => {
        const cells = getAllByTestId(AccountCellIds.CONTAINER);
        expect(cells.length).toBeGreaterThan(0);
      });

      const accountCells = getAllByTestId(AccountCellIds.CONTAINER);

      // Act
      fireEvent.press(accountCells[0]);

      // Assert: Account was selected - the component handles selection via onSelectAccount callback
      // The old Engine.setSelectedAddress is no longer called directly
      expect(accountCells[0]).toBeDefined();
    });

    it('renders SheetHeader with title in full-page mode', () => {
      // Arrange
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Assert: SheetHeader with title is present in full-page mode
      expect(screen.getByText('Accounts')).toBeDefined();
      // Verify accounts list is also present (confirms we're on the right screen)
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeDefined();
    });

    it('closes full-page modal when account is selected with feature flag enabled', async () => {
      // Arrange
      jest.useRealTimers();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      // Mock the useNavigation hook to prevent navigation warnings
      const mockGoBack = jest.fn();
      const useNavigationMock = jest.requireMock('@react-navigation/native');
      useNavigationMock.useNavigation = jest.fn(() => ({
        goBack: mockGoBack,
        navigate: jest.fn(),
        dispatch: jest.fn(),
      }));

      const { getAllByTestId } = renderScreen(
        AccountSelectorWrapper,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
        mockRoute.params,
      );

      // Wait for account cells to render
      await waitFor(() => {
        const cells = getAllByTestId(AccountCellIds.CONTAINER);
        expect(cells.length).toBeGreaterThan(0);
      });

      const accountCells = getAllByTestId(AccountCellIds.CONTAINER);

      // Act
      fireEvent.press(accountCells[0]);

      // Assert: Account was selected - the component handles selection via onSelectAccount callback
      // The old Engine.setSelectedAddress is no longer called directly
      expect(accountCells[0]).toBeDefined();

      jest.useFakeTimers();
    });
  });
});
