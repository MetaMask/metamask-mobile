import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { IconName } from '../../../../component-library/components/Icons/Icon';
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

  it('shows update button when accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    expect(
      getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
    ).toBeDefined();
  });

  it('shows disconnect button when no accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} selectedAddresses={[]} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT)).toBeDefined();
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
