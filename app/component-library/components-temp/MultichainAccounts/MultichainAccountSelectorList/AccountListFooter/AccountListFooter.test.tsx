import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import AccountListFooter from './AccountListFooter';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { useWalletInfo } from '../../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo';
import { useAccountsOperationsLoadingStates } from '../../../../../util/accounts/useAccountsOperationsLoadingStates';
import Logger from '../../../../../util/Logger';
import { AccountWalletType } from '@metamask/account-api';
import { selectWalletsMap } from '../../../../../selectors/multichainAccounts/accountTreeController';

// Mock dependencies
jest.mock('../../../../../core/Engine');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock(
  '../../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo',
  () => ({
    useWalletInfo: jest.fn(),
  }),
);
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock AnimatedSpinner
jest.mock('../../../../../components/UI/AnimatedSpinner', () => ({
  __esModule: true,
  default: () => null,
  SpinnerSize: {
    SM: 'SM',
    MD: 'MD',
  },
}));

jest.mock(
  '../../../../../util/accounts/useAccountsOperationsLoadingStates',
  () => ({
    useAccountsOperationsLoadingStates: jest.fn(),
  }),
);

// Mock InteractionManager
const { InteractionManager } = jest.requireActual('react-native');
InteractionManager.runAfterInteractions = jest.fn();

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockUseAccountsOperationsLoadingStates =
  useAccountsOperationsLoadingStates as jest.MockedFunction<
    typeof useAccountsOperationsLoadingStates
  >;

describe('AccountListFooter', () => {
  const mockWalletId = 'keyring:test-wallet-id' as const;
  const mockKeyringId = 'test-keyring-id';

  const mockWallet = {
    id: mockWalletId,
    metadata: { name: 'Test Wallet' },
    groups: {},
    type: AccountWalletType.Entropy,
  };

  const mockWalletInfo = {
    keyringId: mockKeyringId,
  };

  const mockMultichainAccountService = {
    init: jest.fn(),
    createNextMultichainAccountGroup: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (mockEngine as unknown as { context: unknown }).context = {
      MultichainAccountService: mockMultichainAccountService,
    };

    // Always return the mock wallet by default
    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      // Check if this is the selectWalletsMap selector by comparing the function reference
      if (selector === selectWalletsMap) {
        return { [mockWalletId]: mockWallet };
      }
      return {};
    });

    (useWalletInfo as jest.Mock).mockReturnValue(mockWalletInfo);

    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      isAccountSyncingInProgress: false,
      areAnyOperationsLoading: false,
      loadingMessage: undefined,
    });

    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (callback: unknown) => {
        if (typeof callback === 'function') callback();
        return { done: Promise.resolve() };
      },
    );
  });

  describe('Rendering', () => {
    it('renders correctly with wallet info', () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );
      expect(getByText('Create account')).toBeOnTheScreen();
    });
  });

  describe('Button Interactions', () => {
    it('calls handlePress when button is pressed', async () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
      });
    });

    it('sets loading state immediately when pressed', async () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeOnTheScreen();
      });
    });
  });

  describe('Async Operations', () => {
    it('calls MultichainAccountService.createNextMultichainAccountGroup successfully', async () => {
      mockMultichainAccountService.createNextMultichainAccountGroup.mockResolvedValue(
        undefined,
      );

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(
          mockMultichainAccountService.createNextMultichainAccountGroup,
        ).toHaveBeenCalledWith({
          entropySource: mockKeyringId,
        });
      });
    });

    it('handles successful account creation and resets loading state', async () => {
      mockMultichainAccountService.createNextMultichainAccountGroup.mockResolvedValue(
        undefined,
      );

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeOnTheScreen();
      });

      await waitFor(() => {
        expect(getByText('Create account')).toBeOnTheScreen();
      });
    });
  });

  describe('Loading State Management', () => {
    it('shows spinner when loading', async () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeOnTheScreen();
      });
    });

    it('resets loading state after successful operation', async () => {
      mockMultichainAccountService.createNextMultichainAccountGroup.mockResolvedValue(
        undefined,
      );

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeOnTheScreen();
      });

      await waitFor(() => {
        expect(getByText('Create account')).toBeOnTheScreen();
      });
    });

    it('resets loading state after error', async () => {
      mockMultichainAccountService.createNextMultichainAccountGroup.mockRejectedValue(
        new Error('Test error'),
      );

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeOnTheScreen();
      });

      await waitFor(() => {
        expect(getByText('Create account')).toBeOnTheScreen();
      });
    });
  });

  describe('InteractionManager Integration', () => {
    it('uses InteractionManager to defer async work', async () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(InteractionManager.runAfterInteractions).toHaveBeenCalledWith(
          expect.any(Function),
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('logs error and sets loading to false when no keyring ID is found', async () => {
      (useWalletInfo as jest.Mock).mockReturnValue({ keyringId: undefined });

      const mockLogger = Logger as jest.Mocked<typeof Logger>;
      const onAccountCreated = jest.fn();

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={onAccountCreated}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.any(Error),
          'Cannot create account without keyring ID',
        );
      });

      await waitFor(() => {
        expect(getByText('Create account')).toBeOnTheScreen();
      });

      expect(
        mockMultichainAccountService.createNextMultichainAccountGroup,
      ).not.toHaveBeenCalled();
    });

    it('calls onAccountCreated when new account group has an ID', async () => {
      const mockNewAccountGroup = { id: 'new-account-group-id' };
      mockMultichainAccountService.createNextMultichainAccountGroup.mockResolvedValue(
        mockNewAccountGroup,
      );

      const onAccountCreated = jest.fn();

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={onAccountCreated}
        />,
      );

      fireEvent.press(getByText('Create account'));

      await waitFor(() => {
        expect(onAccountCreated).toHaveBeenCalledWith('new-account-group-id');
      });
    });
  });

  describe('Wallet Type Filtering', () => {
    it('renders create account button only for Entropy wallet type', () => {
      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(getByText('Create account')).toBeOnTheScreen();
    });

    it('handles loading state transitions correctly', () => {
      // Start with no loading
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: false,
        areAnyOperationsLoading: false,
        loadingMessage: undefined,
      });

      const { getByText, rerender } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(getByText('Create account')).toBeOnTheScreen();

      // Simulate account syncing starting
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      rerender(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(getByText('Syncing...')).toBeOnTheScreen();

      // Simulate syncing completing
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: false,
        areAnyOperationsLoading: false,
        loadingMessage: undefined,
      });

      rerender(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(getByText('Create account')).toBeOnTheScreen();
    });

    it('does not render create account button for non-Entropy wallet types', () => {
      const testCases = [
        {
          name: 'Keyring wallet type',
          walletType: AccountWalletType.Keyring,
        },
        {
          name: 'Snap wallet type',
          walletType: AccountWalletType.Snap,
        },
      ];

      testCases.forEach(({ walletType }) => {
        const mockNonEntropyWallet = {
          ...mockWallet,
          type: walletType,
        };

        // Override the selector mock for this test
        (useSelector as jest.Mock).mockImplementationOnce(
          (selector: unknown) => {
            if (selector === selectWalletsMap) {
              return { [mockWalletId]: mockNonEntropyWallet };
            }
            return {};
          },
        );

        const { queryByText } = render(
          <AccountListFooter
            walletId={mockWalletId}
            onAccountCreated={jest.fn()}
          />,
        );

        expect(queryByText('Create account')).not.toBeOnTheScreen();
      });
    });

    it('does not render create account button when wallet is undefined', () => {
      // Override the selector mock for this test
      (useSelector as jest.Mock).mockImplementationOnce((selector: unknown) => {
        if (selector === selectWalletsMap) {
          return { [mockWalletId]: undefined };
        }
        return {};
      });

      const { queryByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(queryByText('Create account')).not.toBeOnTheScreen();
    });
  });
});
