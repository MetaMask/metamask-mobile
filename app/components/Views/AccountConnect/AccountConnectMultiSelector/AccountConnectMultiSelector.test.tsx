import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { Account } from '../../../../components/hooks/useAccounts';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockNavigate = jest.fn();
const mockOnSelectAddress = jest.fn();
const mockOnUserAction = jest.fn();
const mockOnBack = jest.fn();
const mockOnPrimaryActionButtonPress = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PermissionController: {
      revokeAllPermissions: jest.fn(),
    },
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
  selectedAddresses: ['0x1234'],
  onSelectAddress: mockOnSelectAddress,
  isLoading: false,
  onUserAction: mockOnUserAction,
  urlWithProtocol: 'https://test.com',
  hostname: 'test.com',
  onBack: mockOnBack,
  isRenderedAsBottomSheet: true,
  showDisconnectAllButton: true,
  favicon: { uri: 'https://test.com/favicon.ico' } as ImageSourcePropType,
  secureIcon: 'LockIcon' as IconName,
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

  xit('handles select all checkbox correctly', () => {
    const { getByText } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    const selectAllCheckbox = getByText('accounts.select_all');
    fireEvent.press(selectAllCheckbox);

    expect(mockOnSelectAddress).toHaveBeenCalledWith(['0x1234', '0x5678']);
  });

  xit('handles unselect all correctly', () => {
    const { getByText } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        selectedAddresses={['0x1234', '0x5678']}
      />,
      { state: { engine: { backgroundState } } },
    );

    const selectAllCheckbox = getByText('accounts.select_all');
    fireEvent.press(selectAllCheckbox);

    expect(mockOnSelectAddress).toHaveBeenCalledWith([]);
  });

  it('shows update button when accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    expect(
      getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
    ).toBeDefined();
  });

  xit('shows disconnect button when no accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} selectedAddresses={[]} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT)).toBeDefined();
  });

  xit('handles disconnect all action', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} selectedAddresses={[]} />,
      { state: { engine: { backgroundState } } },
    );

    const disconnectButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT,
    );
    fireEvent.press(disconnectButton);

    expect(mockNavigate).toHaveBeenCalledWith('Modal.RootModal', {
      screen: 'Sheet.RevokeAllAccountPermissions',
      params: expect.any(Object),
    });
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

  it('handles primary action button press when provided', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        onPrimaryActionButtonPress={mockOnPrimaryActionButtonPress}
      />,
      { state: { engine: { backgroundState } } },
    );

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockOnPrimaryActionButtonPress).toHaveBeenCalled();
    expect(mockOnUserAction).not.toHaveBeenCalled();
  });

  xit('handles back button press', () => {
    const { getByText } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    // Assuming SheetHeader renders a back button with text "back"
    const backButton = getByText('back');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('disables update button when no changes are made', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );

    expect(updateButton.props.disabled).toBe(true);
  });
});
