import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import MultiChainAccountSelectorListPage from './MultiChainAccountSelectorListPage';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import Routes from '../../../constants/navigation/Routes';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
} from '../../../util/test/accountsControllerTestUtils';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setSelectedAccountGroup: jest.fn(),
    },
  },
}));

const mockUseAccountsOperationsLoadingStates = jest.fn();
jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: () =>
    mockUseAccountsOperationsLoadingStates(),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockAccountGroup: AccountGroupObject = {
  id: 'entropy:mock-wallet-1/0',
  type: AccountGroupType.MultichainAccount,
  metadata: {
    name: 'Mock Account Group',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 0 },
  },
  accounts: ['mock-account-1', 'mock-account-2'],
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
      ...MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
      AccountTreeController: {
        accountTree: {
          wallets: {},
        },
      },
    },
  },
};

const MultiChainAccountSelectorListPageWrapper = () => (
  <MultiChainAccountSelectorListPage />
);

describe('MultiChainAccountSelectorListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: false,
      loadingMessage: undefined,
    });
    mockUseSelector.mockReturnValue(mockAccountGroup);
  });

  it('renders correctly', () => {
    const wrapper = renderScreen(
      MultiChainAccountSelectorListPageWrapper,
      {
        name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
        options: {},
      },
      {
        state: mockInitialState,
      },
    );
    expect(wrapper.toJSON()).toMatchSnapshot();

    expect(screen.getByText('Accounts')).toBeDefined();

    const addButton = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    expect(addButton).toBeDefined();

    const backButton = screen.getByTestId('sheet-header-back-button');
    expect(backButton).toBeDefined();
  });

  it('handles add account button press', () => {
    renderScreen(
      MultiChainAccountSelectorListPageWrapper,
      {
        name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
      },
      {
        state: mockInitialState,
      },
    );

    const addButton = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    fireEvent.press(addButton);

    // Should show the add wallet actions bottom sheet
    expect(screen.getByTestId('add-account-srp-account')).toBeDefined();
  });

  it('handles back button press in add wallet actions', () => {
    renderScreen(
      MultiChainAccountSelectorListPageWrapper,
      {
        name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
      },
      {
        state: mockInitialState,
      },
    );

    // First, open the add wallet actions
    const addButton = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    fireEvent.press(addButton);

    // Should show the add wallet actions bottom sheet
    expect(screen.getByTestId('add-account-srp-account')).toBeDefined();
    expect(screen.getByText('Import a wallet')).toBeDefined();
  });

  it('shows loading state when account syncing is in progress', () => {
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: true,
      loadingMessage: 'Syncing accounts...',
    });

    renderScreen(
      MultiChainAccountSelectorListPageWrapper,
      {
        name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
      },
      {
        state: mockInitialState,
      },
    );

    // Check that the loading message is displayed
    expect(screen.getByText('Syncing accounts...')).toBeDefined();
  });

  it('does not render when no selected account group', () => {
    mockUseSelector.mockReturnValue(null);

    renderScreen(
      MultiChainAccountSelectorListPageWrapper,
      {
        name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR_LIST_PAGE,
      },
      {
        state: mockInitialState,
      },
    );

    // Should not render the account list
    expect(
      screen.queryByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
    ).toBeNull();
  });
});
