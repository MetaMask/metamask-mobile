import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import MultichainAccountActions from './MultichainAccountActions';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import {
  MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS,
  MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME,
  MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES,
} from './MultichainAccountActions.testIds';
import { TraceName, TraceOperation } from '../../../../../util/trace';

const mockAccountGroup: AccountGroupObject = {
  type: AccountGroupType.SingleAccount,
  id: 'keyring:test-group/ethereum' as const,
  accounts: ['account-1'],
  metadata: {
    name: 'Test Account Group',
    pinned: false,
    hidden: false,
  },
};

const mockInternalAccount: InternalAccount = {
  id: 'account-1',
  address: '0x1234567890123456789012345678901234567890',
  type: 'eip155:eoa',
  options: {},
  metadata: {
    name: 'Test Account',
    importTime: 1234567890,
    keyring: { type: 'HD Key Tree' },
    lastSelected: 0,
  },
  scopes: [],
  methods: [],
};

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock trace
const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      accountGroup: mockAccountGroup,
    },
  }),
}));

// Mock trace functions
jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: (options: unknown) => mockTrace(options),
  endTrace: (options: unknown) => mockEndTrace(options),
}));

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getAccount: jest.fn().mockReturnValue(mockInternalAccount),
      listAccounts: jest.fn(),
      listMultichainAccounts: jest.fn(),
      getSelectedAccount: jest.fn(),
      getAccountByAddress: jest.fn(),
    },
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

// Mock BottomSheetHeader
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View testID="header">
        <TouchableOpacity testID="header-close-button" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <Text>{children}</Text>
      </View>
    );
  },
);

describe('MultichainAccountActions', () => {
  const mockEngine = jest.mocked(Engine);

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.context.AccountsController.getAccount.mockReturnValue(
      mockInternalAccount,
    );
  });

  it('renders account actions menu with correct options', () => {
    const { getByText } = renderWithProvider(<MultichainAccountActions />);

    expect(getByText('Test Account Group')).toBeTruthy();
    expect(getByText('Account Details')).toBeTruthy();
    expect(getByText('Rename account')).toBeTruthy();
    expect(getByText('Addresses')).toBeTruthy();
  });

  it('renders action buttons with correct test IDs', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    expect(
      getByTestId(MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS),
    ).toBeTruthy();
    expect(getByTestId(MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME)).toBeTruthy();
    expect(getByTestId(MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES)).toBeTruthy();
  });

  it('navigates to account details when account details button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    const accountDetailsButton = getByTestId(
      MULTICHAIN_ACCOUNT_ACTIONS_ACCOUNT_DETAILS,
    );
    accountDetailsButton.props.onPress();

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS,
      {
        accountGroup: mockAccountGroup,
      },
    );
  });

  it('navigates to address list when addresses button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    const addressesButton = getByTestId(MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES);
    addressesButton.props.onPress();

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
      {
        groupId: mockAccountGroup.id,
        title: `Addresses / ${mockAccountGroup.metadata.name}`,
        onLoad: expect.any(Function),
      },
    );

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.ShowAccountAddressList,
      op: TraceOperation.AccountUi,
      tags: {
        screen: 'account.actions',
      },
    });
  });

  it('calls endTrace when onLoad callback is invoked', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    const addressesButton = getByTestId(MULTICHAIN_ACCOUNT_ACTIONS_ADDRESSES);
    addressesButton.props.onPress();

    // Get the onLoad callback from the navigation call
    const navigationCallArgs = mockNavigate.mock.calls[0];
    const navigationParams = navigationCallArgs[1];
    const onLoadCallback = navigationParams.onLoad;

    // Invoke the onLoad callback
    onLoadCallback();

    // Verify endTrace was called with correct parameters
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.ShowAccountAddressList,
    });
  });

  it('navigates to edit account name when rename account button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    const renameAccountButton = getByTestId(
      MULTICHAIN_ACCOUNT_ACTIONS_EDIT_NAME,
    );
    renameAccountButton.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
      {
        accountGroup: mockAccountGroup,
      },
    );
  });

  it('closes modal when close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MultichainAccountActions />);

    const closeButton = getByTestId('header-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
