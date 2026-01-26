import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
import { AddAccountBottomSheetSelectorsIDs } from '../AddAccountActions/AddAccountBottomSheet.testIds';
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
import { createMockAccountGroup } from '../../../component-library/components-temp/MultichainAccounts/test-utils';
import { AccountGroupObject } from '@metamask/account-tree-controller';

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

// Create mock account group for testing
const mockAccountGroup: AccountGroupObject = createMockAccountGroup(
  'mock-group-1',
  'Account 1',
  [internalAccount1.id],
);

// Mock the selectSelectedAccountGroup selector
const mockSelectSelectedAccountGroup = jest.fn(
  (): AccountGroupObject | null => mockAccountGroup,
);
jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(() => mockSelectSelectedAccountGroup()),
    selectSelectedAccountGroupId: jest.fn(() => 'mock-group-1'),
    selectSelectedAccountGroupInternalAccounts: jest.fn(() => []),
    selectSelectedAccountGroupWithInternalAccountsAddresses: jest.fn(() => []),
    selectAccountGroupWithInternalAccounts: jest.fn(() => []),
    selectAccountGroups: jest.fn(() => []),
    selectAccountTreeControllerState: jest.fn(() => ({
      accountTree: { wallets: {}, selectedAccountGroup: 'mock-group-1' },
    })),
    selectWalletsMap: jest.fn(() => ({})),
    selectAccountToWalletMap: jest.fn(() => ({})),
    selectAccountToGroupMap: jest.fn(() => ({})),
    selectMultichainAccountGroups: jest.fn(() => []),
    selectSingleAccountGroups: jest.fn(() => []),
    selectAccountGroupsByWallet: jest.fn(() => []),
    selectWalletByAccount: jest.fn(() => null),
    selectWalletStatus: jest.fn(() => ({})),
    selectResolvedSelectedAccountGroup: jest.fn(() => null),
    selectAccountGroupById: jest.fn(() => null),
    selectWalletById: jest.fn(() => null),
    selectAccountSections: jest.fn(() => []),
    selectInternalAccountFromAccountGroup: jest.fn(() => null),
  }),
);

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

  it('renders MultichainAccountSelectorList when selectedAccountGroup exists', () => {
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

    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );

    expect(accountsList).toBeOnTheScreen();
  });

  it('does not render account list when selectedAccountGroup is null', () => {
    // Temporarily return null for selectedAccountGroup
    mockSelectSelectedAccountGroup.mockReturnValueOnce(null);

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

    const accountsList = screen.queryByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );

    expect(accountsList).toBeNull();
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

    // renders the multichain account selector list
    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );
    expect(accountsList).toBeOnTheScreen();
  }, 10000);

  describe('Multichain Accounts', () => {
    it('displays Add wallet button', () => {
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

    it('navigates to MultichainAddWalletActions when route param is set', () => {
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

    it('displays MultichainAddWalletActions bottomsheet when Add wallet button is pressed', () => {
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

      // Check that the button shows the syncing state
      expect(addButton).toHaveTextContent('Syncing...');

      // Check button is disabled
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
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

    it('displays Add wallet button text when not syncing', () => {
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
      // syncing message takes precedence over "Add wallet"
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

      // Simulate syncing completion by re-mocking the hook and re-rendering
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

      // displays "Add wallet" when not syncing
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
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
      // Accounts list is present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();
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
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
      // Accounts list is present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();
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
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
      // Verify accounts list is also present (confirms we're on the right screen)
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();
    });
  });
});
