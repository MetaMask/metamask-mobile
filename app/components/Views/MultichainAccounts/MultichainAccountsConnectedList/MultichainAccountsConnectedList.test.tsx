import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';

import MultichainAccountsConnectedList from './MultichainAccountsConnectedList';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';

const mockSetSelectedAccountGroup = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setSelectedAccountGroup: (id: string) => mockSetSelectedAccountGroup(id),
    },
    GatorPermissionsController: {
      getState: () => ({}),
    },
  },
}));

jest.mock('../../../../selectors/assets/balances', () => ({
  selectBalanceByAccountGroup: (groupId: string) => () => ({
    walletId: groupId.split('/')[0],
    groupId,
    totalBalanceInUserCurrency: 0,
    userCurrency: 'usd',
  }),
}));

jest.mock('../../../../selectors/multichain/multichain', () => ({
  selectMultichainIsMainnet: () => true,
  selectIsEvmNetworkSelected: () => true,
  selectShowFiatInTestnets: () => false,
  selectMultichainShouldShowFiat: () => true,
}));

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: () => ({}),
  selectSelectedInternalAccountAddress: () => '0x123',
  selectAddressHasTokenBalances: () => false,
}));

jest.mock('../../../../reducers/swaps', () => ({
  default: {},
}));

jest.mock('../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: () => false,
}));

jest.mock('../../../../selectors/multichain/evm', () => ({
  selectHideZeroBalanceTokens: () => false,
  selectAccountTokensAcrossChains: () => [],
  selectTokensBalances: () => ({}),
  selectEvmTokensWithZeroBalanceFilter: () => [],
}));

jest.mock('../../../../core/SDKConnectV2', () => ({
  default: {
    initialize: jest.fn(),
  },
}));

jest.mock('../../../../core/DeeplinkManager/DeeplinkManager', () => ({
  default: {
    init: jest.fn(),
  },
}));

jest.mock('../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: () => [],
  selectPendingSmartTransactionsBySender: () => [],
  selectSortedTransactions: () => [],
}));

jest.mock('../../../../selectors/gasFeeController', () => ({
  selectGasFeeEstimates: () => ({}),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  default: {},
}));

jest.mock('../../../../util/test/initial-root-state', () => ({
  backgroundState: {
    AccountsController: {
      internalAccounts: {
        accounts: {},
        selectedAccount: '',
      },
    },
    AccountTreeController: {
      accountTree: {
        selectedAccountGroup: '',
        wallets: {},
      },
    },
    RemoteFeatureFlagController: {
      remoteFeatureFlags: {
        enableMultichainAccounts: {
          enabled: true,
          featureVersion: '1',
          minimumVersion: '1.0.0',
        },
      },
    },
  },
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectIconSeedAddressByAccountGroupId: () => () => 'mock-address',
  selectIconSeedAddressesByAccountGroupIds: () => ({
    'keyring:test-group/group-1': 'mock-address',
    'keyring:test-group/group-2': 'mock-address',
    'keyring:test-group/group-3': 'mock-address',
  }),
  selectSelectedInternalAccountByScope: () => () => ({
    address: '0x1234567890123456789012345678901234567890',
    id: 'mock-account-id',
  }),
  selectInternalAccountByAccountGroupAndScope: () => () => ({
    address: '0x1234567890123456789012345678901234567890',
    id: 'mock-account-id',
  }),
}));

jest.mock('../../../../selectors/settings', () => ({
  selectAvatarAccountType: () => 'MaskIcon',
  selectBasicFunctionalityEnabled: () => true,
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroups: () => [
      {
        id: 'keyring:test-group/group-1',
        metadata: { name: 'Account 1' },
      },
      {
        id: 'keyring:test-group/group-2',
        metadata: { name: 'Account 2' },
      },
    ],
    selectSelectedAccountGroup: () => ({
      id: 'keyring:test-group/group-1',
      metadata: { name: 'Account 1' },
    }),
  }),
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

const MOCK_ACCOUNT_GROUP_1 = createMockAccountGroup(
  'keyring:test-group/group-1',
  'Account 1',
  ['account-1'],
);

const MOCK_ACCOUNT_GROUP_2 = createMockAccountGroup(
  'keyring:test-group/group-2',
  'Account 2',
  ['account-2'],
);

const MOCK_ACCOUNT_GROUP_3 = createMockAccountGroup(
  'keyring:test-group/group-3',
  'Multichain Account',
  ['account-3a', 'account-3b'],
);

const MOCK_SELECTED_ACCOUNT_GROUPS: AccountGroupObject[] = [
  MOCK_ACCOUNT_GROUP_1,
  MOCK_ACCOUNT_GROUP_2,
];

const MOCK_MULTICHAIN_ACCOUNT_GROUPS: AccountGroupObject[] = [
  MOCK_ACCOUNT_GROUP_1,
  MOCK_ACCOUNT_GROUP_2,
  MOCK_ACCOUNT_GROUP_3,
];
const DEFAULT_PROPS = {
  privacyMode: false,
  selectedAccountGroups: MOCK_SELECTED_ACCOUNT_GROUPS,
  handleEditAccountsButtonPress: jest.fn(),
};

const mockStore = configureStore([]);
const buildState = (groups: AccountGroupObject[]) => {
  const wallet = createMockWallet('keyring:test-group', 'Test Wallet', groups);
  const internalAccounts = createMockInternalAccountsFromGroups(groups);
  return createMockState([wallet], internalAccounts);
};

const renderMultichainAccountsConnectedList = (propOverrides = {}) => {
  const props = { ...DEFAULT_PROPS, ...propOverrides };
  const groups = (props.selectedAccountGroups || []) as AccountGroupObject[];
  const state = buildState(groups);
  const store = mockStore(state as unknown as Record<string, unknown>);
  return render(
    <Provider store={store}>
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <MultichainAccountsConnectedList {...props} />
      </ToastContext.Provider>
    </Provider>,
  );
};

describe('MultichainAccountsConnectedList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders component with different account group configurations', () => {
    const { toJSON, getByText } = renderMultichainAccountsConnectedList();
    // Assert visible content (robust behavior check)
    expect(getByText('Account 1')).toBeTruthy();
    expect(getByText('Account 2')).toBeTruthy();
    expect(getByText('Edit accounts')).toBeTruthy();
    // Snapshot for structural regressions
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls handleEditAccountsButtonPress when edit button is pressed', () => {
    const mockHandleEdit = jest.fn();
    const { getByText } = renderMultichainAccountsConnectedList({
      handleEditAccountsButtonPress: mockHandleEdit,
    });

    const editButton = getByText('Edit accounts');
    fireEvent.press(editButton);

    expect(mockHandleEdit).toHaveBeenCalledTimes(1);
  });

  it('has correct testID for edit accounts button', () => {
    const { getByTestId } = renderMultichainAccountsConnectedList();

    const editButton = getByTestId(
      ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
    );
    expect(editButton).toBeTruthy();
  });

  it('displays correct edit accounts text', () => {
    const { getByText } = renderMultichainAccountsConnectedList();

    expect(getByText('Edit accounts')).toBeTruthy();
  });

  it('handles empty selectedAccountGroups', () => {
    const { getByText } = renderMultichainAccountsConnectedList({
      selectedAccountGroups: [],
    });

    expect(getByText('Edit accounts')).toBeTruthy();
  });

  it('handles null handleEditAccountsButtonPress', () => {
    const { getByText } = renderMultichainAccountsConnectedList({
      handleEditAccountsButtonPress: null,
    });

    const editButton = getByText('Edit accounts');

    expect(() => fireEvent.press(editButton)).not.toThrow();
  });

  describe('ListFooterComponent - Edit Accounts Button', () => {
    it('renders edit accounts button with correct structure', () => {
      const { getByTestId, getByText } =
        renderMultichainAccountsConnectedList();

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );
      expect(editButton).toBeTruthy();

      expect(getByText('Edit accounts')).toBeTruthy();
    });

    it('calls handleEditAccountsButtonPress when button is pressed', () => {
      const mockHandleEdit = jest.fn();
      const { getByTestId } = renderMultichainAccountsConnectedList({
        handleEditAccountsButtonPress: mockHandleEdit,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );

      fireEvent.press(editButton);

      expect(mockHandleEdit).toHaveBeenCalledTimes(1);
      expect(mockHandleEdit).toHaveBeenCalledWith();
    });

    it('calls handleEditAccountsButtonPress multiple times when pressed multiple times', () => {
      const mockHandleEdit = jest.fn();
      const { getByTestId } = renderMultichainAccountsConnectedList({
        handleEditAccountsButtonPress: mockHandleEdit,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );

      fireEvent.press(editButton);
      fireEvent.press(editButton);
      fireEvent.press(editButton);

      expect(mockHandleEdit).toHaveBeenCalledTimes(3);
    });

    it('maintains button functionality with different account group configurations', () => {
      const mockHandleEdit = jest.fn();

      const { getByTestId: getByTestIdEmpty } =
        renderMultichainAccountsConnectedList({
          selectedAccountGroups: [],
          handleEditAccountsButtonPress: mockHandleEdit,
        });

      const editButtonEmpty = getByTestIdEmpty(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );
      fireEvent.press(editButtonEmpty);

      expect(mockHandleEdit).toHaveBeenCalledTimes(1);

      const { getByTestId: getByTestIdMultiple } =
        renderMultichainAccountsConnectedList({
          selectedAccountGroups: MOCK_MULTICHAIN_ACCOUNT_GROUPS,
          handleEditAccountsButtonPress: mockHandleEdit,
        });

      const editButtonMultiple = getByTestIdMultiple(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );
      fireEvent.press(editButtonMultiple);

      expect(mockHandleEdit).toHaveBeenCalledTimes(2);
    });

    it('renders consistently with privacy mode enabled', () => {
      const { getByTestId, getByText } = renderMultichainAccountsConnectedList({
        privacyMode: true,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );
      expect(editButton).toBeTruthy();
      expect(getByText('Edit accounts')).toBeTruthy();
    });

    it('renders consistently with privacy mode disabled', () => {
      const { getByTestId, getByText } = renderMultichainAccountsConnectedList({
        privacyMode: false,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );
      expect(editButton).toBeTruthy();
      expect(getByText('Edit accounts')).toBeTruthy();
    });
  });

  describe('ListFooterComponent - Error Handling', () => {
    it('handles undefined handleEditAccountsButtonPress', () => {
      const { getByTestId } = renderMultichainAccountsConnectedList({
        handleEditAccountsButtonPress: undefined,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );

      expect(() => fireEvent.press(editButton)).not.toThrow();
    });

    it('handles function that throws error', () => {
      const mockHandleEditWithError = jest.fn(() => {
        throw new Error('Test error');
      });

      const { getByTestId } = renderMultichainAccountsConnectedList({
        handleEditAccountsButtonPress: mockHandleEditWithError,
      });

      const editButton = getByTestId(
        ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
      );

      expect(() => fireEvent.press(editButton)).toThrow('Test error');
      expect(mockHandleEditWithError).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSelectAccount functionality', () => {
    it('calls setSelectedAccountGroup when account is selected (not in connection flow)', () => {
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: false,
      });

      const accountCell = getByText('Account 1');

      fireEvent.press(accountCell);

      expect(mockSetSelectedAccountGroup).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccountGroup).toHaveBeenCalledWith(
        'keyring:test-group/group-1',
      );
    });

    it('calls setSelectedAccountGroup with correct account ID for different accounts', () => {
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: false,
      });

      const account1Cell = getByText('Account 1');
      const account2Cell = getByText('Account 2');

      fireEvent.press(account1Cell);

      expect(mockSetSelectedAccountGroup).toHaveBeenCalledWith(
        'keyring:test-group/group-1',
      );

      fireEvent.press(account2Cell);

      expect(mockSetSelectedAccountGroup).toHaveBeenCalledWith(
        'keyring:test-group/group-2',
      );

      expect(mockSetSelectedAccountGroup).toHaveBeenCalledTimes(2);
    });

    it('only calls setSelectedAccountGroup when account is selected in connection flow', () => {
      const mockHandleEdit = jest.fn();
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: true,
        handleEditAccountsButtonPress: mockHandleEdit,
      });

      const accountCell = getByText('Account 1');
      fireEvent.press(accountCell);

      // Should only call set selected account group instead of navigating
      expect(mockSetSelectedAccountGroup).toHaveBeenCalledTimes(1);
      expect(mockHandleEdit).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Toast Functionality', () => {
    beforeEach(() => {
      mockShowToast.mockClear();
      mockNavigate.mockClear();
      mockSetSelectedAccountGroup.mockClear();
    });

    it('shows toast when account is selected (not in connection flow)', () => {
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: false,
      });

      const accountCell = getByText('Account 1');
      fireEvent.press(accountCell);

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Account,
        labelOptions: [
          {
            label: 'Account 1 ',
            isBold: true,
          },
          { label: 'now active.' },
        ],
        accountAddress: 'mock-address',
        accountAvatarType: 'MaskIcon',
        hasNoTimeout: false,
      });
    });

    it('navigates to browser home after showing toast (not in connection flow)', () => {
      // Given a connected account (not in connection flow)
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: false,
      });

      // When selecting an account
      const accountCell = getByText('Account 1');
      fireEvent.press(accountCell);

      // Then should navigate to browser home
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME);
    });

    it('does not show toast or navigate when in connection flow', () => {
      const mockHandleEdit = jest.fn();
      const { getByText } = renderMultichainAccountsConnectedList({
        isConnectionFlow: true,
        handleEditAccountsButtonPress: mockHandleEdit,
      });

      const accountCell = getByText('Account 1');
      fireEvent.press(accountCell);

      // Should not show toast or navigate
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
