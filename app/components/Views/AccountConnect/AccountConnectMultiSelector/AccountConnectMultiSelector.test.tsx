import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { EthScope, SolScope } from '@metamask/keyring-api';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AccountConnectMultiSelector from './AccountConnectMultiSelector';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ConnectedAccountsSelectorsIDs } from '../ConnectedAccountModal.testIds';
import { AccountListBottomSheetSelectorsIDs } from '../../AccountSelector/AccountListBottomSheet.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../ConnectAccountBottomSheet.testIds';
import { KeyringTypes } from '@metamask/keyring-controller';
import { CaipAccountId } from '@metamask/utils';
import { WalletClientType } from '../../../../core/SnapKeyring/MultichainWalletSnapClient';

const mockNavigate = jest.fn();
const mockOnSubmit = jest.fn();
const mockOnBack = jest.fn();
const mockOnCreateAccount = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '0x1234': {
              address: '0x1234',
              name: 'Account 1',
              type: 'simple',
              metadata: {
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
            '0x5678': {
              address: '0x5678',
              name: 'Account 2',
              type: 'simple',
              metadata: {
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
        },
      },
    },
  },
}));

const mockAccounts = [
  {
    id: 'mock-account-id-1',
    address: '0x1234',
    name: 'Account 1',
    balance: '0x1',
    type: KeyringTypes.simple,
    yOffset: 0,
    isSelected: false,
    caipAccountId: 'eip155:0:0x1234' as const,
    isLoadingAccount: false,
    scopes: [EthScope.Eoa],
  },
  {
    id: 'mock-account-id-2',
    address: '0x5678',
    name: 'Account 2',
    balance: '0x2',
    type: KeyringTypes.simple,
    yOffset: 0,
    isSelected: false,
    caipAccountId: 'eip155:0:0x5678' as const,
    isLoadingAccount: false,
    scopes: [EthScope.Eoa],
  },
];

const mockEnsByAccountAddress = {
  '0x1234': 'test1.eth',
  '0x5678': 'test2.eth',
};

const defaultProps = {
  accounts: mockAccounts,
  ensByAccountAddress: mockEnsByAccountAddress,
  defaultSelectedAddresses: ['eip155:0:0x1234'] as CaipAccountId[],
  onSubmit: mockOnSubmit,
  onCreateAccount: mockOnCreateAccount,
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

  it('disables the select all button when loading', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        defaultSelectedAddresses={['eip155:0:0x1234']}
        isLoading
      />,
    );

    const selectAllbutton = getAllByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_ALL_BUTTON,
    );
    fireEvent.press(selectAllbutton[0]);

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:0:0x1234']);
  });

  it('handles the select all button when not loading', () => {
    const { getByTestId, getAllByTestId } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        defaultSelectedAddresses={['eip155:0:0x1234', 'eip155:0:0x5678']}
      />,
    );

    const selectAllbutton = getAllByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_ALL_BUTTON,
    );
    fireEvent.press(selectAllbutton[0]);
    fireEvent.press(selectAllbutton[0]);

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith([
      'eip155:0:0x1234',
      'eip155:0:0x5678',
    ]);
  });

  it('handles account selection correctly', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        defaultSelectedAddresses={['eip155:0:0x1234']}
      />,
      { state: { engine: { backgroundState } } },
    );

    const newAccount = getByText('test2.eth');
    fireEvent.press(newAccount);

    // tests removal of an already selected account
    const exstingAccount = getByText('test1.eth');
    fireEvent.press(exstingAccount);

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:0:0x5678']);
  });

  it('shows update button when accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        defaultSelectedAddresses={['eip155:0:0x1234']}
      />,
      { state: { engine: { backgroundState } } },
    );

    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    expect(updateButton).toBeTruthy();
    fireEvent.press(updateButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(['eip155:0:0x1234']);
  });

  it('shows disconnect button when no accounts are selected', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnectMultiSelector
        {...defaultProps}
        defaultSelectedAddresses={[]}
      />,
      { state: { engine: { backgroundState } } },
    );

    const disconnectButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT,
    );
    expect(disconnectButton).toBeTruthy();
    fireEvent.press(disconnectButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith([]);
  });

  it('handles add account button press', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <AccountConnectMultiSelector {...defaultProps} />,
      { state: { engine: { backgroundState } } },
    );

    const addButton = getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    fireEvent.press(addButton);

    const addEthereumAccount = getByText('Ethereum account');
    const addSolanaAccount = getByText('Solana account');

    // Will move into the add account action
    expect(addEthereumAccount).toBeDefined();
    expect(addSolanaAccount).toBeDefined();

    fireEvent.press(addSolanaAccount);

    expect(mockOnCreateAccount).toHaveBeenCalledWith(
      WalletClientType.Solana,
      SolScope.Mainnet,
    );
  });
});
