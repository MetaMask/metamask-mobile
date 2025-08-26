import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

import MultichainAccountsConnectedList from './MultichainAccountsConnectedList';
import { createMockAccountGroup } from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

jest.mock('../../../../selectors/assets/balances', () => {
  const actual = jest.requireActual('../../../../selectors/assets/balances');
  return {
    ...actual,
    selectBalanceByAccountGroup: (groupId: string) => () => ({
      walletId: groupId.split('/')[0],
      groupId,
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    }),
  };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const MOCK_ACCOUNT_GROUP_1 = createMockAccountGroup('group-1', 'Account 1', [
  'account-1',
]);

const MOCK_ACCOUNT_GROUP_2 = createMockAccountGroup('group-2', 'Account 2', [
  'account-2',
]);

const MOCK_ACCOUNT_GROUP_3 = createMockAccountGroup(
  'group-3',
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
const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      AccountTreeController: {
        accountTree: {
          wallets: {},
        },
      },
    },
  },
};

const renderMultichainAccountsConnectedList = (propOverrides = {}) => {
  const props = { ...DEFAULT_PROPS, ...propOverrides };
  const store = mockStore(mockInitialState);
  return render(
    <Provider store={store}>
      <MultichainAccountsConnectedList {...props} />
    </Provider>,
  );
};

const renderWithMultipleAccounts = () =>
  renderMultichainAccountsConnectedList({
    selectedAccountGroups: MOCK_MULTICHAIN_ACCOUNT_GROUPS,
  });

const renderWithEmptyAccountGroups = () =>
  renderMultichainAccountsConnectedList({
    selectedAccountGroups: [],
  });

describe('MultichainAccountsConnectedList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with account groups', () => {
      const { getByText } = renderMultichainAccountsConnectedList();

      expect(getByText('Edit accounts')).toBeTruthy();
    });

    it('renders with empty account groups list', () => {
      const { getByText } = renderWithEmptyAccountGroups();

      expect(getByText('Edit accounts')).toBeTruthy();
    });

    it('renders with multiple account groups', () => {
      const { getByText } = renderWithMultipleAccounts();

      expect(getByText('Edit accounts')).toBeTruthy();
    });
  });

  it('renders component with selected account groups', () => {
    const { getByText } = renderMultichainAccountsConnectedList();

    expect(getByText('Edit accounts')).toBeTruthy();
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
});
