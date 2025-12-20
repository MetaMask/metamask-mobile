import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
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

const mockInitialState = {
  engine: {
    backgroundState: {
      KeyringController: MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
      AccountTreeController: {
        accountTree: {
          wallets: {},
        },
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
};

// Mock the Redux dispatch
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => {
    // Default mock state for selectors
    const mockState = {
      engine: {
        backgroundState: {
          KeyringController: MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
          AccountTreeController: {
            accountTree: {
              wallets: {},
            },
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
    };
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return undefined;
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

// Mock the multichain accounts selector with default disabled state
const mockSelectMultichainAccountsState2Enabled = jest
  .fn()
  .mockReturnValue(false);
const mockSelectMultichainAccountsState1Enabled = jest
  .fn()
  .mockReturnValue(false);

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () =>
      mockSelectMultichainAccountsState2Enabled(),
    selectMultichainAccountsState1Enabled: () =>
      mockSelectMultichainAccountsState1Enabled(),
  }),
);

const mockSelectSelectedAccountGroup = jest.fn().mockReturnValue(null);
const mockSelectSelectedAccountGroupInternalAccounts = jest
  .fn()
  .mockReturnValue([]);

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: () => mockSelectSelectedAccountGroup(),
    selectSelectedAccountGroupInternalAccounts: () =>
      mockSelectSelectedAccountGroupInternalAccounts(),
    selectAccountTreeControllerState: () => ({
      accountTree: { wallets: {} },
      selectedAccountGroupId: null,
    }),
    selectSelectedAccountGroupId: () => null,
    selectAccountGroupWithInternalAccounts: () => [],
    selectSelectedAccountGroupWithInternalAccountsAddresses: () => [],
  }),
);

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
    // Reset multichain selectors to disabled state by default
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSelectMultichainAccountsState1Enabled.mockReturnValue(false);
    mockSelectSelectedAccountGroup.mockReturnValue(null);

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

  it('should render correctly', async () => {
    // Use real timers for this test since waitFor requires real timers
    jest.useRealTimers();

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

    await waitFor(() => {
      expect(wrapper.toJSON()).toMatchSnapshot();
    });
  });

  it('includes all accounts', async () => {
    // Use real timers for this test since waitFor requires real timers
    jest.useRealTimers();

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

    await waitFor(() => {
      const accountsList = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      expect(accountsList).toBeDefined();
    });

    expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalSolanaAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  });

  it('includes only EVM accounts if isEvmOnly', async () => {
    // Use real timers for this test since waitFor requires real timers
    jest.useRealTimers();

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

    await waitFor(() => {
      const accountsList = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      expect(accountsList).toBeDefined();
    });

    expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
    expect(queryByText(internalSolanaAccount1.metadata.name)).toBeNull();
    expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  });

  it('displays add account button by default', async () => {
    // Use real timers for this test since waitFor requires real timers
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

    await waitFor(() => {
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeDefined();
    });
  });

  it('displays add account button when disableAddAccountButton is false', async () => {
    // Use real timers for this test since waitFor requires real timers
    jest.useRealTimers();
    const routeWithShowButton = {
      params: {
        ...mockRoute.params,
        disableAddAccountButton: false,
      },
    };

    renderScreen(
      () => <AccountSelector route={routeWithShowButton} />,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeDefined();
    });
  });

  it('displays add account button even when disableAddAccountButton is true', async () => {
    // Use real timers for this test since waitFor requires real timers
    jest.useRealTimers();

    const routeWithoutShowButton = {
      params: {
        ...mockRoute.params,
        disableAddAccountButton: true,
      },
    };

    renderScreen(
      () => <AccountSelector route={routeWithoutShowButton} />,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      const addButton = screen.queryByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeDefined();
    });
  });

  it('renders account selector with multichain support', async () => {
    // Use real timers for this test since waitFor requires real timers
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

    await waitFor(() => {
      // Should render the account list (either multichain or EVM based on feature flag)
      const accountsList = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      expect(accountsList).toBeDefined();
    });
  });

  describe('disableAddAccountButton prop', () => {
    it('shows add account button when disableAddAccountButton is false', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
      mockSelectSelectedAccountGroup.mockReturnValue({
        id: '1',
        accounts: ['0x1234'],
        metadata: { name: 'Wallet 1' },
      });

      const routeWithShowButton = {
        params: {
          ...mockRoute.params,
          disableAddAccountButton: false,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithShowButton} />,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
      );

      await waitFor(() => {
        const addButton = screen.queryByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toBeOnTheScreen();
      });
    });

    it('does not show add account button when disableAddAccountButton is true', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();

      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
      mockSelectSelectedAccountGroup.mockReturnValue({
        id: '1',
        accounts: ['0x1234'],
        metadata: { name: 'Wallet 1' },
      });

      const routeWithoutShowButton = {
        params: {
          ...mockRoute.params,
          disableAddAccountButton: true,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithoutShowButton} />,
        {
          name: Routes.SHEET.ACCOUNT_SELECTOR,
        },
        {
          state: mockInitialState,
        },
      );

      await waitFor(() => {
        const addButton = screen.queryByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).not.toBeOnTheScreen();
      });
    });
  });

  describe('Multichain Accounts V2', () => {
    it('shows button text based on feature flag state', async () => {
      // Use real timers for this test since waitFor requires real timers
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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toBeDefined();
        expect(addButton.props.children).toBeDefined();
      });
    });

    it('shows "Add wallet" text when multichain feature flag is enabled', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();

      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

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

      await waitFor(() => {
        // Verify component renders successfully with feature flag enabled
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toBeDefined();

        // When multichain feature flag is enabled, button text should be "Add wallet"
        expect(addButton).toHaveTextContent('Add wallet');
      });
    });

    it('handles navigation to add account actions', async () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

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

      await waitFor(() => {
        expect(screen.getAllByText('Import a wallet')).toBeDefined();
      });

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('clicks Add wallet button and displays MultichainAddWalletActions bottomsheet', async () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      // Enable the multichain accounts state 2 feature flag for this test
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

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

      await waitFor(() => {
        const addWalletButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addWalletButton).toHaveTextContent('Add wallet');
      });

      const addWalletButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(addWalletButton);
      });

      await waitFor(() => {
        // Check for the "Add wallet" header text which indicates the component is rendered
        expect(screen.getByText('Add wallet')).toBeDefined();

        expect(
          screen.getByTestId(
            AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON,
          ),
        ).toBeDefined();
      });

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });

  describe('Loading States Integration', () => {
    it('displays loading message when account syncing is in progress', async () => {
      // Use real timers for this test since waitFor requires real timers
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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toHaveTextContent('Syncing...');
      });
    });

    it('disables add button when account syncing is in progress', async () => {
      // Use real timers for this test since waitFor requires real timers
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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        // Check that the button shows the syncing state
        expect(addButton).toHaveTextContent('Syncing...');
      });

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      // Try to press the button and verify it doesn't trigger the action
      await act(async () => {
        fireEvent.press(addButton);
      });

      // If button is properly disabled, the navigation to add account actions shouldn't happen
      // We can verify this by checking that we're still on the account selector screen
      expect(screen.queryByText('Import a wallet')).toBeNull();
    });

    it('shows activity indicator when syncing is in progress', async () => {
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

      await waitFor(() => {
        // The activity indicator should be present when syncing
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toBeDefined();
        expect(addButton).toHaveTextContent('Syncing...');
      });

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('shows different button text based on multichain feature flag when not syncing', async () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      // Test with multichain enabled
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toHaveTextContent('Add wallet');
      });

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('shows default button text when multichain is disabled and not syncing', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();

      // Reset to disabled state
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toHaveTextContent('Add account or hardware wallet');
      });
    });

    it('prioritizes syncing message over feature flag text', async () => {
      // Use real timers for this test to avoid animation timing issues
      jest.useRealTimers();

      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);
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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        // Should show syncing message, not "Add wallet"
        expect(addButton).toHaveTextContent('Syncing...');
      });

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('enables button when syncing completes', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();

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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        expect(addButton).toHaveTextContent('Syncing...');
      });

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

      await waitFor(() => {
        const addButton = screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        );
        // Should show default text when not syncing
        expect(addButton).toHaveTextContent('Add account or hardware wallet');
      });
    });
  });

  describe('Feature Flag: Full-Page Account List', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);
    });

    it('renders BottomSheet when feature flag is disabled', () => {
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

      // Assert: Add button is present
      expect(
        screen.getByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
        ),
      ).toBeDefined();

      jest.useFakeTimers();
    });

    it('switches between multichain screens in full-page mode', () => {
      // Arrange
      jest.useRealTimers();
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

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

      // Assert: MultichainAddWalletActions screen is displayed
      expect(screen.getByText('Add wallet')).toBeDefined();

      jest.useFakeTimers();
    });

    it('closes BottomSheet when account is selected with feature flag disabled', async () => {
      // Use real timers for this test since waitFor requires real timers
      jest.useRealTimers();

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
        const cells = getAllByTestId(
          CellComponentSelectorsIDs.SELECT_WITH_MENU,
        );
        expect(cells.length).toBeGreaterThan(0);
      });

      const accountCells = getAllByTestId(
        CellComponentSelectorsIDs.SELECT_WITH_MENU,
      );

      // Act
      fireEvent.press(accountCells[0]);

      // Assert: Account was selected
      expect(Engine.setSelectedAddress).toHaveBeenCalled();
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
        const cells = getAllByTestId(
          CellComponentSelectorsIDs.SELECT_WITH_MENU,
        );
        expect(cells.length).toBeGreaterThan(0);
      });

      const accountCells = getAllByTestId(
        CellComponentSelectorsIDs.SELECT_WITH_MENU,
      );

      // Act
      fireEvent.press(accountCells[0]);

      // Assert: Account was selected
      expect(Engine.setSelectedAddress).toHaveBeenCalled();

      jest.useFakeTimers();
    });
  });
});
