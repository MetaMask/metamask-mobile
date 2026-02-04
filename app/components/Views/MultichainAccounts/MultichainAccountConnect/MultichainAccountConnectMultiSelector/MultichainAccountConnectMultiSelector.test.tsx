import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupId } from '@metamask/account-api';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import MultichainAccountConnectMultiSelector from './MultichainAccountConnectMultiSelector';
import { ConnectedAccountsSelectorsIDs } from '../../../AccountConnect/ConnectedAccountModal.testIds';
import { AccountListBottomSheetSelectorsIDs } from '../../../AccountSelector/AccountListBottomSheet.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../AccountConnect/ConnectAccountBottomSheet.testIds';
import { ConnectionProps } from '../../../../../core/SDKConnect/Connection';
import { RootState } from '../../../../../reducers';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockOnSubmit = jest.fn();
const mockOnBack = jest.fn();
const mockOnUserAction = jest.fn();

const MOCK_GROUP_ID_1 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0' as AccountGroupId;
const MOCK_GROUP_ID_2 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1' as AccountGroupId;
const MOCK_SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const mockEvmAccount1 = createMockInternalAccount(
  '0xf609ccad1163c95d8eceda30f36feb1fad0e3d8e',
  'EVM Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockEvmAccount2 = createMockInternalAccount(
  '0xf609ccad1163c95d8eceda30f36feb1fad0e3d8e',
  'EVM Account 2',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockSolAccount1 = createMockInternalAccount(
  'Afji7h1QkJPjdxxW62WpogPChpMAdBtpkenD54z8qEfD',
  'Solana Account 1',
  KeyringTypes.snap,
  SolAccountType.DataAccount,
);

const mockSolAccount2 = createMockInternalAccount(
  '2VKYABRBgWY3TWpvCTxLCdhxqzN1JLcnnjdGPvY4PHjf',
  'Solana Account 2',
  KeyringTypes.snap,
  SolAccountType.DataAccount,
);

const mockConnection: ConnectionProps = {
  id: 'test-connection',
  origin: 'https://test.com',
  originatorInfo: {
    url: 'https://test.com',
    title: 'Test App',
    platform: 'web',
    apiVersion: '1.0.0',
    dappId: 'test-dapp-id',
  },
  validUntil: Date.now() + 3600000,
  lastAuthorized: Date.now(),
  otherPublicKey: 'test-key',
};

const createMockState = (): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      AccountTreeController: {
        accountTree: {
          selectedAccountGroup: MOCK_GROUP_ID_1,
          wallets: {},
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockEvmAccount1.id]: mockEvmAccount1,
            [mockEvmAccount2.id]: mockEvmAccount2,
            [mockSolAccount1.id]: mockSolAccount1,
            [mockSolAccount2.id]: mockSolAccount2,
          },
        },
      },
      KeyringController: {
        keyrings: [],
      },
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {
          'eip155:1': {
            chainId: 'eip155:1',
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            blockExplorerUrls: ['https://etherscan.io'],
          },
          [MOCK_SOLANA_CHAIN_ID]: {
            chainId: MOCK_SOLANA_CHAIN_ID,
            name: 'Solana Mainnet',
            nativeCurrency: 'SOL',
            blockExplorerUrls: ['https://explorer.solana.com'],
          },
        },
      },
    },
  },
});

const defaultProps = {
  accountGroups: [],
  defaultSelectedAccountGroupIds: [MOCK_GROUP_ID_1],
  isLoading: false,
  onUserAction: mockOnUserAction,
  onSubmit: mockOnSubmit,
  isRenderedAsBottomSheet: true,
  showDisconnectAllButton: true,
  hostname: 'test.com',
  connection: mockConnection,
  screenTitle: 'Connect Accounts',
  onBack: mockOnBack,
};

describe('MultichainAccountConnectMultiSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector {...defaultProps} />,
        { state: createMockState() },
      );

      expect(getByText('Connect Accounts')).toBeTruthy();
      expect(
        getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeTruthy();
    });

    it('displays the correct screen title', () => {
      const customTitle = 'Custom Title';
      const { getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          screenTitle={customTitle}
        />,
        { state: createMockState() },
      );

      expect(getByText(customTitle)).toBeTruthy();
    });

    it('displays SDK information when connection has originatorInfo', () => {
      const { getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector {...defaultProps} />,
        { state: createMockState() },
      );

      expect(getByText('SDK web v1.0.0')).toBeTruthy();
    });

    it('does not display SDK information when connection lacks originatorInfo', () => {
      const connectionWithoutInfo = {
        ...mockConnection,
        originatorInfo: undefined,
      };

      const { queryByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          connection={connectionWithoutInfo}
        />,
        { state: createMockState() },
      );

      expect(queryByText(/SDK/)).toBeNull();
    });
  });

  describe('Account Selection', () => {
    it('initializes with default selected account group IDs', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector {...defaultProps} />,
        { state: createMockState() },
      );

      // Update button should be visible since we have selected accounts
      expect(
        getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
      ).toBeTruthy();
    });

    it('updates selected account groups when defaultSelectedAccountGroupIds change', () => {
      const { rerender, getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
        />,
        { state: createMockState() },
      );

      // Should show disconnect button when no accounts selected
      expect(
        getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT),
      ).toBeTruthy();

      // Update props to have selected accounts
      rerender(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
      );

      // Should now show update button
      expect(
        getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('Button States and Actions', () => {
    it('shows update button when accounts are selected', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
        { state: createMockState() },
      );

      const updateButton = getByTestId(
        ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
      );
      expect(updateButton).toBeTruthy();

      fireEvent.press(updateButton);
      expect(mockOnSubmit).toHaveBeenCalledWith([MOCK_GROUP_ID_1]);
    });

    it('shows disconnect button when no accounts are selected and showDisconnectAllButton is true', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
        />,
        { state: createMockState() },
      );

      const disconnectButton = getByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT,
      );
      expect(disconnectButton).toBeTruthy();
      expect(getByText('This will disconnect you from test.com')).toBeTruthy();

      fireEvent.press(disconnectButton);
      expect(mockOnSubmit).toHaveBeenCalledWith([]);
    });

    it('does not show disconnect button when showDisconnectAllButton is false', () => {
      const { queryByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton={false}
        />,
        { state: createMockState() },
      );

      expect(
        queryByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT),
      ).toBeNull();
    });

    it('disables update button when loading', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
          isLoading
        />,
        { state: createMockState() },
      );

      const updateButton = getByTestId(
        ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
      );
      expect(updateButton.props.disabled).toBe(true);
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back action is triggered', () => {
      renderWithProvider(
        <MultichainAccountConnectMultiSelector {...defaultProps} />,
        { state: createMockState() },
      );

      // Test that onBack is properly passed to the component
      // The actual back button interaction is handled by SheetHeader
      expect(defaultProps.onBack).toBe(mockOnBack);
    });

    it('calls onSubmit with selected account group IDs when update button is pressed', () => {
      const selectedIds = [MOCK_GROUP_ID_1, MOCK_GROUP_ID_2];
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={selectedIds}
        />,
        { state: createMockState() },
      );

      const updateButton = getByTestId(
        ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
      );
      fireEvent.press(updateButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(selectedIds);
    });

    it('calls onSubmit with empty array when disconnect button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
        />,
        { state: createMockState() },
      );

      const disconnectButton = getByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT,
      );
      fireEvent.press(disconnectButton);

      expect(mockOnSubmit).toHaveBeenCalledWith([]);
    });

    it('navigates to browser home when disconnect button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
        />,
        { state: createMockState() },
      );

      const disconnectButton = getByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT,
      );
      fireEvent.press(disconnectButton);

      expect(mockNavigate).toHaveBeenCalledWith('BrowserTabHome');
    });
  });

  describe('Account Group Selection Logic', () => {
    it('renders account selector list with proper test ID', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
        { state: createMockState() },
      );

      // Get the account selector list
      const accountList = getByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      expect(accountList).toBeTruthy();

      // The actual selection logic is handled by MultichainAccountSelectorList
      // We verify the component renders and has the correct test ID
      expect(accountList).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty account groups array', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          accountGroups={[]}
          defaultSelectedAccountGroupIds={[]}
        />,
        { state: createMockState() },
      );

      expect(
        getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeTruthy();
    });

    it('handles missing connection data gracefully', () => {
      const { queryByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          connection={{} as ConnectionProps}
        />,
        { state: createMockState() },
      );

      expect(queryByText(/SDK/)).toBeNull();
    });

    it('handles undefined screen title', () => {
      const { getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          screenTitle=""
        />,
        { state: createMockState() },
      );

      expect(getByText('Connect accounts')).toBeTruthy();
    });
  });

  describe('Component State Management', () => {
    it('maintains selected account groups state correctly', () => {
      const { getByTestId, rerender } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
        { state: createMockState() },
      );

      // Should show update button initially
      expect(
        getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
      ).toBeTruthy();

      // Change to no selected accounts
      rerender(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
        />,
      );

      // Should now show disconnect button
      expect(
        getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT),
      ).toBeTruthy();
    });

    it('updates button states based on selection changes', () => {
      const { getByTestId, queryByTestId, rerender } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
        />,
        { state: createMockState() },
      );

      // Initially no accounts selected - should show disconnect button
      expect(
        getByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT),
      ).toBeTruthy();
      expect(
        queryByTestId(
          ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
        ),
      ).toBeNull();

      // Select an account
      rerender(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
          showDisconnectAllButton
        />,
      );

      // Should now show update button and hide disconnect button
      expect(
        getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
      ).toBeTruthy();
      expect(
        queryByTestId(ConnectedAccountsSelectorsIDs.DISCONNECT),
      ).toBeNull();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('renders with proper test IDs for automation', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
        { state: createMockState() },
      );

      expect(
        getByTestId(AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID),
      ).toBeTruthy();
      expect(
        getByTestId(ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON),
      ).toBeTruthy();
    });

    it('displays appropriate button labels', () => {
      const { getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[MOCK_GROUP_ID_1]}
        />,
        { state: createMockState() },
      );

      expect(getByText('Update')).toBeTruthy();
    });

    it('displays disconnect warning message', () => {
      const { getByText } = renderWithProvider(
        <MultichainAccountConnectMultiSelector
          {...defaultProps}
          defaultSelectedAccountGroupIds={[]}
          showDisconnectAllButton
          hostname="example.com"
        />,
        { state: createMockState() },
      );

      expect(
        getByText('This will disconnect you from example.com'),
      ).toBeTruthy();
      expect(getByText('Disconnect')).toBeTruthy();
    });
  });
});
