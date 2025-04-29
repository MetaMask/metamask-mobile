import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockNavigate = jest.fn();
const mockOnSubmit = jest.fn();
const mockOnBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '0x1234': {
              address: '0x1234',
              name: 'Account 1',
              type: 'simple',
            },
            '0x5678': {
              address: '0x5678',
              name: 'Account 2',
              type: 'simple',
            },
          },
        },
      },
    },
  },
}));

const mockAccounts = [
  {
    address: '0x1234',
    name: 'Account 1',
    balance: '0x1',
    type: KeyringTypes.simple,
    yOffset: 0,
    isSelected: false,
  },
  {
    address: '0x5678',
    name: 'Account 2',
    balance: '0x2',
    type: KeyringTypes.simple,
    yOffset: 0,
    isSelected: false,
  },
];

const mockEnsByAccountAddress = {
  '0x1234': 'test1.eth',
  '0x5678': 'test2.eth',
};

const defaultProps = {
  accounts: mockAccounts,
  ensByAccountAddress: mockEnsByAccountAddress,
  defaultSelectedAddresses: ['0x1234'],
  onSubmit: mockOnSubmit,
  isLoading: false,
  hostname: 'test.com',
  onBack: mockOnBack,
  isRenderedAsBottomSheet: true,
  showDisconnectAllButton: true,
};

describe('AccountConnectMultiSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays accounts list', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    expect(
      getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
    ).toBeDefined();
  });

  it('handles account selection correctly', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} defaultSelectedAddresses={['0x1234']} />,
      { state: { engine: { backgroundState } } },
    );

    const account = getByText('test2.eth');
    fireEvent.press(account);

    const updateButton = getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON);
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['0x1234', '0x5678'])
  })

  it('shows update button when accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} defaultSelectedAddresses={['0x1234']} />,
      { state: { engine: { backgroundState } } },
    );

    const updateButton = getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON);
    expect(updateButton).toBeTruthy()
    fireEvent.press(updateButton)

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['0x1234']);
  });

  it('shows disconnect button when no accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} defaultSelectedAddresses={[]} />,
      { state: { engine: { backgroundState } } },
    );

    const disconnectButton = getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT);
    expect(disconnectButton).toBeTruthy()
    fireEvent.press(disconnectButton)

    expect(defaultProps.onSubmit).toHaveBeenCalledWith([]);
  });

  it('handles add account button press', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    const addButton = getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    fireEvent.press(addButton);

    // Verify that the screen changes to AddAccountActions
    expect(mockNavigate).not.toHaveBeenCalled(); // Since this is handled internally
  });
});
