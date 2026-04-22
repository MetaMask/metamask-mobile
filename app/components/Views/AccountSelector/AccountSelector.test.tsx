import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
import { AddAccountBottomSheetSelectorsIDs } from '../AddAccountActions/AddAccountBottomSheet.testIds';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import {
  AccountSelectorParams,
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import {
  createMockAccountGroup,
  createMockEntropyWallet,
  createMockInternalAccountsFromGroups,
  createMockState,
} from '../../../component-library/components-temp/MultichainAccounts/test-utils';
import { AccountGroupObject } from '@metamask/account-tree-controller';

// Feature flag mocks
const mockSelectFullPageAccountListEnabledFlag = jest.fn(() => false);
jest.mock(
  '../../../selectors/featureFlagController/fullPageAccountList',
  () => ({
    selectFullPageAccountListEnabledFlag: () =>
      mockSelectFullPageAccountListEnabledFlag(),
  }),
);

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: { isUnlocked: true, keyrings: [] },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
    AccountTreeController: {
      setSelectedAccountGroup: jest.fn(),
    },
    MultichainAccountService: {
      createNextMultichainAccountGroup: jest.fn().mockResolvedValue({
        id: 'new-account-group-id',
        metadata: { name: 'New Account' },
        accounts: [],
      }),
    },
  },
  setSelectedAddress: jest.fn(),
}));

// Mock useAnalytics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({})),
}));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock useSyncSRPs
jest.mock('../../hooks/useSyncSRPs', () => ({
  useSyncSRPs: jest.fn(),
}));

// Mock useAccountsOperationsLoadingStates
const mockUseAccountsOperationsLoadingStates = jest.fn();
jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: () =>
    mockUseAccountsOperationsLoadingStates(),
}));

// Mock useAccounts hook
jest.mock('../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(() => ({
    accounts: [],
    evmAccounts: [],
    ensByAccountAddress: {},
  })),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    dispatch: mockDispatch,
    isFocused: jest.fn(() => true),
  }),
}));

// Mock whenEngineReady
jest.mock('../../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

// Mock analytics
jest.mock('../../../util/analytics/analytics', () => ({
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

// Helper to create mock state with wallets and accounts
const createTestState = (
  accountGroups: AccountGroupObject[],
  selectedGroupId?: string,
) => {
  const wallets = accountGroups.map((group, index) => {
    // Extract wallet ID from group ID (e.g., 'entropy:wallet1/group1' -> 'entropy:wallet1')
    const groupIdStr = group.id as string;
    const slashIndex = groupIdStr.indexOf('/');
    const walletId =
      slashIndex !== -1
        ? groupIdStr.substring(0, slashIndex)
        : `wallet${index + 1}`;
    return createMockEntropyWallet(walletId, `Wallet ${index + 1}`, [group]);
  });

  const internalAccounts = createMockInternalAccountsFromGroups(accountGroups);
  const baseState = createMockState(wallets, internalAccounts);

  // Update selected account group if provided
  if (selectedGroupId) {
    (
      baseState.engine.backgroundState.AccountTreeController as {
        selectedAccountGroup: string;
      }
    ).selectedAccountGroup = selectedGroupId;
  }

  return baseState;
};

const defaultRouteParams: AccountSelectorParams = {
  onSelectAccount: jest.fn((address: string) => address),
  disablePrivacyMode: false,
};

const mockRoute: AccountSelectorProps['route'] = {
  params: defaultRouteParams,
};

const AccountSelectorWrapper = (props?: {
  route?: AccountSelectorProps['route'];
}) => <AccountSelector route={props?.route ?? mockRoute} />;

describe('AccountSelector', () => {
  // Create default test data
  let mockAccountGroup1: AccountGroupObject;
  let mockAccountGroup2: AccountGroupObject;
  let mockState: ReturnType<typeof createTestState>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset feature flags
    mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);

    // Reset loading states to default
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: false,
      areAnyOperationsLoading: false,
      loadingMessage: undefined,
    });

    // Create fresh mock data for each test
    mockAccountGroup1 = createMockAccountGroup(
      'entropy:wallet1/group1',
      'Account 1',
      ['account1'],
      true,
    );
    mockAccountGroup2 = createMockAccountGroup(
      'entropy:wallet2/group2',
      'Account 2',
      ['account2'],
      true,
    );
    mockState = createTestState(
      [mockAccountGroup1, mockAccountGroup2],
      mockAccountGroup1.id,
    );
  });

  describe('Rendering', () => {
    it('renders the component with account list', () => {
      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      // Account list should be rendered
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();

      // Header title should be present
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
    });

    it('renders add wallet button by default', () => {
      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
      expect(addButton).toHaveTextContent('Add wallet');
    });
  });

  describe('Add Wallet Button', () => {
    it('displays "Add wallet" text on the button', () => {
      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('navigates to AddWallet page when Add wallet button is pressed', () => {
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      fireEvent.press(addButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_WALLET);

      jest.useFakeTimers();
    });
  });

  describe('Loading States', () => {
    it('displays loading message when account syncing is in progress', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Syncing...');
    });

    it('shows disabled state when syncing is in progress', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );

      // Button should have syncing message and be in disabled state
      expect(addButton).toHaveTextContent('Syncing...');
      // Verify the button is disabled
      expect(addButton).toBeDisabled();
    });

    it('shows "Add wallet" text when syncing completes', () => {
      // Start with syncing
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      const { unmount } = renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      let addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Syncing...');

      unmount();

      // Syncing completes
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: false,
        areAnyOperationsLoading: false,
        loadingMessage: undefined,
      });

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('prioritizes loading message over default button text', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Creating account...',
      });

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      // Should show loading message, not "Add wallet"
      expect(addButton).toHaveTextContent('Creating account...');
    });
  });

  describe('disableAddAccountButton prop', () => {
    it('hides add button when disableAddAccountButton is true', () => {
      const routeWithDisabledButton: AccountSelectorProps['route'] = {
        params: {
          ...defaultRouteParams,
          disableAddAccountButton: true,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithDisabledButton} />,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
      );

      const addButton = screen.queryByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeNull();
    });

    it('shows add button when disableAddAccountButton is false', () => {
      const routeWithEnabledButton: AccountSelectorProps['route'] = {
        params: {
          ...defaultRouteParams,
          disableAddAccountButton: false,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithEnabledButton} />,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
    });

    it('shows add button when disableAddAccountButton is undefined', () => {
      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
    });
  });

  describe('Navigation to Add Account Actions', () => {
    it('navigates directly to AddWallet page when navigateToAddAccountActions is set', async () => {
      jest.useRealTimers();

      const routeWithNavigation: AccountSelectorProps['route'] = {
        params: {
          ...defaultRouteParams,
          navigateToAddAccountActions:
            AccountSelectorScreens.MultichainAddWalletActions,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithNavigation} />,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
      );

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith(
          StackActions.replace(Routes.SHEET.ADD_WALLET),
        ),
      );

      expect(
        screen.queryByTestId(
          AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
        ),
      ).not.toBeOnTheScreen();

      jest.useFakeTimers();
    });

    it('navigates directly to AddAccountActions when specified', () => {
      jest.useRealTimers();

      const routeWithNavigation: AccountSelectorProps['route'] = {
        params: {
          ...defaultRouteParams,
          navigateToAddAccountActions: AccountSelectorScreens.AddAccountActions,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithNavigation} />,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
      );

      // Should be on the add account actions screen
      // AddAccountActions shows "Add Ethereum account" button
      expect(
        screen.getByTestId(
          AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON,
        ),
      ).toBeOnTheScreen();

      jest.useFakeTimers();
    });
  });

  describe('Account Selection', () => {
    it('calls setSelectedAccountGroup when an account is selected', async () => {
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      // Wait for the account list to render
      await waitFor(() => {
        expect(screen.getByText('Account 1')).toBeOnTheScreen();
      });

      // Find and press an account cell
      const accountCell = screen.getByText('Account 1');
      fireEvent.press(accountCell);

      // Verify setSelectedAccountGroup was called
      await waitFor(() => {
        expect(
          Engine.context.AccountTreeController.setSelectedAccountGroup,
        ).toHaveBeenCalled();
      });

      jest.useFakeTimers();
    });

    it('tracks account switch event when account is selected', async () => {
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      await waitFor(() => {
        expect(screen.getByText('Account 1')).toBeOnTheScreen();
      });

      const accountCell = screen.getByText('Account 1');
      fireEvent.press(accountCell);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalled();
        expect(mockTrackEvent).toHaveBeenCalled();
      });

      jest.useFakeTimers();
    });
  });

  describe('Full-Page Account List Feature Flag', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders BottomSheet when feature flag is disabled', () => {
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(false);

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      // Should render header with title
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
      // Account list should be present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();
    });

    it('renders full-page modal when feature flag is enabled', () => {
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      // Should render header with title
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
      // Account list should be present
      expect(
        screen.getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeOnTheScreen();
    });

    it('renders add button in full-page mode', () => {
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeOnTheScreen();
    });

    it('navigates to AddWallet page in full-page mode', () => {
      jest.useRealTimers();

      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      fireEvent.press(addButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_WALLET);

      jest.useFakeTimers();
    });

    it('hides add button in full-page mode when disableAddAccountButton is true', () => {
      mockSelectFullPageAccountListEnabledFlag.mockReturnValue(true);

      const routeWithDisabledButton: AccountSelectorProps['route'] = {
        params: {
          ...defaultRouteParams,
          disableAddAccountButton: true,
        },
      };

      renderScreen(
        () => <AccountSelector route={routeWithDisabledButton} />,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
      );

      const addButton = screen.queryByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeNull();
    });
  });

  describe('Screen Navigation', () => {
    it('navigates to AddWallet page when button is pressed', () => {
      jest.useRealTimers();

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: mockState },
        mockRoute.params,
      );

      // Navigate to add wallet actions
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      fireEvent.press(addButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_WALLET);

      jest.useFakeTimers();
    });
  });

  describe('Empty State', () => {
    it('handles missing selectedAccountGroup gracefully', () => {
      // Create state without a selected account group
      const emptyState = createTestState([mockAccountGroup1]);
      (
        emptyState.engine.backgroundState.AccountTreeController as {
          selectedAccountGroup: string;
        }
      ).selectedAccountGroup = '';

      renderScreen(
        AccountSelectorWrapper,
        { name: Routes.SHEET.ACCOUNT_SELECTOR },
        { state: emptyState },
        mockRoute.params,
      );

      // Component should still render without crashing
      expect(screen.getByText('Accounts')).toBeOnTheScreen();
    });
  });
});
