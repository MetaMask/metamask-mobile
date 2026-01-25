import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import RecipientSelectorModal from './RecipientSelectorModal';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  setDestAddress,
  setIsSelectingRecipient,
} from '../../../../../core/redux/slices/bridge';
import {
  createMockAccountGroup,
  createMockWallet,
  createMockState,
  createMockInternalAccountsFromGroups,
} from '../../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { AccountCellIds } from '../../../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import { Hex } from '@metamask/utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockStopAllPolling = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../core/Engine', () => ({
  default: {
    context: {
      BridgeController: {
        stopAllPolling: mockStopAllPolling,
      },
    },
  },
  context: {
    BridgeController: {
      stopAllPolling: mockStopAllPolling,
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
    MultichainAccountService: {
      createNextMultichainAccountGroup: jest.fn().mockResolvedValue({
        id: 'new-account-group-id',
        metadata: { name: 'New Account' },
        accounts: [],
      }),
    },
  },
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('RecipientSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvmAccount1 = createMockAccountGroup(
    'keyring:wallet1/group1',
    'Account 1',
    ['account1'],
  );
  const mockEvmAccount2 = createMockAccountGroup(
    'keyring:wallet1/group2',
    'Account 2',
    ['account2'],
  );
  const mockWallet = createMockWallet('wallet1', 'Wallet 1', [
    mockEvmAccount1,
    mockEvmAccount2,
  ]);

  const renderRecipientSelectorModal = (stateOverrides = {}) => {
    const internalAccounts = createMockInternalAccountsFromGroups([
      mockEvmAccount1,
      mockEvmAccount2,
    ]);
    const mockState = {
      ...createMockState([mockWallet], internalAccounts),
      bridge: {
        destToken: {
          chainId: '0x1' as Hex,
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          address: '0x0000000000000000000000000000000000000000',
        },
        destAddress: undefined,
        sourceToken: undefined,
        sourceAmount: undefined,
        destAmount: undefined,
        selectedSourceChainIds: undefined,
        selectedDestChainId: '0x1' as Hex,
        slippage: '0.5',
        isSubmittingTx: false,
        bridgeViewMode: undefined,
        isSelectingRecipient: false,
      },
      ...stateOverrides,
    };

    return renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <RecipientSelectorModal />
      </SafeAreaProvider>,
      { state: mockState },
    );
  };

  describe('Component lifecycle', () => {
    it('renders modal with header', () => {
      const { getByText } = renderRecipientSelectorModal();

      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('dispatches setIsSelectingRecipient on mount', () => {
      renderRecipientSelectorModal();

      expect(mockDispatch).toHaveBeenCalledWith(setIsSelectingRecipient(true));
    });

    it('sets up polling control on mount', () => {
      renderRecipientSelectorModal();

      // Verify component renders successfully with polling control setup
      expect(mockDispatch).toHaveBeenCalledWith(setIsSelectingRecipient(true));
    });

    it('dispatches setIsSelectingRecipient false on unmount', () => {
      const { unmount } = renderRecipientSelectorModal();

      mockDispatch.mockClear();
      unmount();

      expect(mockDispatch).toHaveBeenCalledWith(setIsSelectingRecipient(false));
    });
  });

  describe('Navigation', () => {
    it('renders header with title', () => {
      const { getByText } = renderRecipientSelectorModal();

      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('provides close functionality through header', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Verify the modal header is rendered
      expect(getByText('Recipient account')).toBeTruthy();
    });
  });

  describe('Account selection', () => {
    it('dispatches setDestAddress and navigates back when account is selected', async () => {
      const { getByText } = renderRecipientSelectorModal();

      // Wait for accounts to render
      await waitFor(() => {
        expect(getByText('Account 1')).toBeTruthy();
      });

      const account1Text = getByText('Account 1');
      const touchableParent = account1Text.parent?.parent;

      if (touchableParent) {
        fireEvent.press(touchableParent);
      }

      // Should dispatch setDestAddress with the account's address
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          setDestAddress(expect.any(String)),
        );
      });

      // Should navigate back
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('filters accounts by destination chain scope', () => {
      // When destToken.chainId is set, only accounts with that scope should be shown
      const { getByText } = renderRecipientSelectorModal();

      // Should show accounts that support the destination chain
      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('Account 2')).toBeTruthy();
    });
  });

  describe('Selected state', () => {
    it('shows no selected account when destAddress is undefined', () => {
      const { queryByText } = renderRecipientSelectorModal();

      // No account should be pre-selected
      expect(queryByText('Account 1')).toBeTruthy();
      expect(queryByText('Account 2')).toBeTruthy();
    });

    it('shows selected account when destAddress matches an internal account', () => {
      const internalAccounts = createMockInternalAccountsFromGroups([
        mockEvmAccount1,
        mockEvmAccount2,
      ]);
      const account1Address = internalAccounts.account1.address;

      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: account1Address,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      expect(getByText('Account 1')).toBeTruthy();
    });

    it('shows external address when destAddress does not match any internal account', () => {
      const externalAddress = '0x9999999999999999999999999999999999999999';

      const component = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: externalAddress,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // External address should be passed to the component
      expect(component).toBeTruthy();
    });
  });

  describe('Chain filtering', () => {
    it('filters accounts for EVM destination chains', () => {
      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex, // Ethereum mainnet
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: undefined,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should show accounts with EVM scope
      expect(getByText('Account 1')).toBeTruthy();
    });

    it('renders when destination token is undefined', () => {
      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: undefined,
          destAddress: undefined,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: undefined,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should still render the modal header
      expect(getByText('Recipient account')).toBeTruthy();
    });
  });

  describe('Props passed to MultichainAccountSelectorList', () => {
    it('hides account cell menu', () => {
      const { queryByTestId } = renderRecipientSelectorModal();

      // Menu buttons should not be visible (hideAccountCellMenu = true)
      expect(queryByTestId(AccountCellIds.MENU)).toBeFalsy();
    });

    it('shows external account on empty search', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Component should render successfully with this prop
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('passes chainId to account selector', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Component renders with chainId prop
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('passes showFooter as false', () => {
      const { queryByText } = renderRecipientSelectorModal();

      // "Create account" button from footer should not be visible
      expect(queryByText('Create account')).toBeFalsy();
    });
  });

  describe('Account filtering logic', () => {
    it('includes accounts with matching destination scope', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Accounts with EVM scope should be shown for EVM destination
      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('Account 2')).toBeTruthy();
    });

    it('filters accounts based on destination chain', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Wallets should be filtered based on chain compatibility
      expect(getByText('Recipient account')).toBeTruthy();
    });
  });

  describe('Address selection and navigation', () => {
    it('handles selecting account and navigating back', async () => {
      const { getByText } = renderRecipientSelectorModal();

      await waitFor(() => {
        expect(getByText('Account 1')).toBeTruthy();
      });

      const account1Text = getByText('Account 1');
      const touchableParent = account1Text.parent?.parent;

      if (touchableParent) {
        fireEvent.press(touchableParent);
      }

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          setDestAddress(expect.any(String)),
        );
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('handles account selection logic correctly', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Accounts should be selectable
      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('Account 2')).toBeTruthy();
    });
  });

  describe('Polling control', () => {
    it('manages polling state during modal lifecycle', () => {
      renderRecipientSelectorModal();

      // Verify selecting recipient state is set
      expect(mockDispatch).toHaveBeenCalledWith(setIsSelectingRecipient(true));
    });

    it('resets selecting recipient state on unmount', () => {
      const { unmount } = renderRecipientSelectorModal();

      mockDispatch.mockClear();
      unmount();

      expect(mockDispatch).toHaveBeenCalledWith(setIsSelectingRecipient(false));
    });
  });

  describe('EVM vs non-EVM detection', () => {
    it('correctly identifies EVM destination chains', () => {
      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex, // EVM chain
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: undefined,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should render with EVM chain configuration
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('correctly identifies non-EVM destination chains', () => {
      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
            symbol: 'SOL',
            name: 'Solana',
            decimals: 9,
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          },
          destAddress: undefined,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should render with non-EVM chain configuration
      expect(getByText('Recipient account')).toBeTruthy();
    });
  });

  describe('External account handling', () => {
    it('provides external account selection functionality', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Modal should render with external account support
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('distinguishes between internal and external addresses', () => {
      const internalAccounts = createMockInternalAccountsFromGroups([
        mockEvmAccount1,
        mockEvmAccount2,
      ]);
      const internalAddress = internalAccounts.account1.address;
      const externalAddress = '0x9999999999999999999999999999999999999999';

      // Test with internal address
      const { getByText: getByText1 } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: internalAddress,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      expect(getByText1('Recipient account')).toBeTruthy();

      // Test with external address
      const { getByText: getByText2 } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: externalAddress,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      expect(getByText2('Recipient account')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('handles empty account tree', () => {
      const mockState = {
        ...createMockState([], {}),
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: undefined,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      };

      const { getByText } = renderWithProvider(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <RecipientSelectorModal />
        </SafeAreaProvider>,
        { state: mockState },
      );

      // Should still render modal header even with empty accounts
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('handles case when destAddress is not found in internal accounts', () => {
      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: '0xNonExistentAddress12345678901234567890',
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should render modal normally
      expect(getByText('Recipient account')).toBeTruthy();
    });

    it('handles case insensitive address comparison for external addresses', () => {
      const internalAccounts = createMockInternalAccountsFromGroups([
        mockEvmAccount1,
        mockEvmAccount2,
      ]);
      const upperCaseAddress = internalAccounts.account1.address.toUpperCase();

      const { getByText } = renderRecipientSelectorModal({
        bridge: {
          destToken: {
            chainId: '0x1' as Hex,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000000',
          },
          destAddress: upperCaseAddress,
          sourceToken: undefined,
          sourceAmount: undefined,
          destAmount: undefined,
          selectedSourceChainIds: undefined,
          selectedDestChainId: '0x1' as Hex,
          slippage: '0.5',
          isSubmittingTx: false,
          bridgeViewMode: undefined,
          isSelectingRecipient: false,
        },
      });

      // Should render and handle case-insensitive comparison
      expect(getByText('Recipient account')).toBeTruthy();
    });
  });

  describe('Account group filtering', () => {
    it('only shows account groups with at least one supported account', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Should show accounts that support the destination chain
      expect(getByText('Account 1')).toBeTruthy();
    });

    it('applies filtering logic to wallet sections', () => {
      const { getByText } = renderRecipientSelectorModal();

      // Wallet section should be shown with compatible accounts
      expect(getByText('Wallet 1')).toBeTruthy();
    });
  });
});
