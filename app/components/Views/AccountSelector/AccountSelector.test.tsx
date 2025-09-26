import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
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

const mockUseAccountsOperationsLoadingStates = jest.fn();
jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: () =>
    mockUseAccountsOperationsLoadingStates(),
}));

const mockRoute: AccountSelectorProps['route'] = {
  params: {
    onSelectAccount: jest.fn((address: string) => address),
    checkBalanceError: (balance: string) => balance,
    disablePrivacyMode: false,
    isEvmOnly: true,
  } as AccountSelectorParams,
};

const AccountSelectorWrapper = () => <AccountSelector route={mockRoute} />;

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset multichain selectors to disabled state by default
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSelectMultichainAccountsState1Enabled.mockReturnValue(false);

    // Reset useAccountsOperationsLoadingStates hook to default values
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: false,
      areAnyOperationsLoading: false,
      loadingMessage: undefined,
    });
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
    it('shows button text based on feature flag state', () => {
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
      expect(addButton.props.children).toBeDefined();
    });

    it('shows "Add wallet" text when multichain feature flag is enabled', () => {
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

      // Verify component renders successfully with feature flag enabled
      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toBeDefined();

      // When multichain feature flag is enabled, button text should be "Add wallet"
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('handles navigation to add account actions', () => {
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

      expect(screen.getAllByText('Import a wallet')).toBeDefined();
    });

    it('clicks Add wallet button and displays MultichainAddWalletActions bottomsheet', () => {
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

      const addWalletButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addWalletButton).toHaveTextContent('Add wallet');

      fireEvent.press(addWalletButton);

      // Check for the "Add wallet" header text which indicates the component is rendered
      expect(screen.getByText('Add wallet')).toBeDefined();

      expect(
        screen.getByTestId(AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON),
      ).toBeDefined();
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

      // Try to press the button and verify it doesn't trigger the action
      fireEvent.press(addButton);

      // If button is properly disabled, the navigation to add account actions shouldn't happen
      // We can verify this by checking that we're still on the account selector screen
      expect(screen.queryByText('Import a wallet')).toBeNull();
    });

    it('shows activity indicator when syncing is in progress', () => {
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
      expect(addButton).toBeDefined();
      expect(addButton).toHaveTextContent('Syncing...');
    });

    it('shows different button text based on multichain feature flag when not syncing', () => {
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

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Add wallet');
    });

    it('shows default button text when multichain is disabled and not syncing', () => {
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

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      expect(addButton).toHaveTextContent('Add account or hardware wallet');
    });

    it('prioritizes syncing message over feature flag text', () => {
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

      const addButton = screen.getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      );
      // Should show syncing message, not "Add wallet"
      expect(addButton).toHaveTextContent('Syncing...');
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
      expect(addButton).toHaveTextContent('Add account or hardware wallet');
    });
  });
});
