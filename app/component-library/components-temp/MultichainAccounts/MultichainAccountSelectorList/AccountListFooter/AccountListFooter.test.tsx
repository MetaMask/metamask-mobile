import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import AccountListFooter from './AccountListFooter';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { useWalletInfo } from '../../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo';
import { useAccountsOperationsLoadingStates } from '../../../../../util/accounts/useAccountsOperationsLoadingStates';
import Logger from '../../../../../util/Logger';

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
    type: 'keyring' as const,
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

    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      if (
        typeof selector === 'function' &&
        selector.name === 'selectWalletsMap'
      ) {
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

  describe('Loading States Integration', () => {
    it('shows syncing message when account syncing is in progress', () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      expect(getByText('Syncing...')).toBeOnTheScreen();
    });

    it('shows creating account message when local loading is active', async () => {
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

    it('prioritizes syncing message over local loading', async () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      fireEvent.press(getByText('Syncing...'));

      // Should still show syncing message, not creating account message
      expect(getByText('Syncing...')).toBeOnTheScreen();
    });

    it('shows spinner when any loading state is active', async () => {
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        isAccountSyncingInProgress: true,
        areAnyOperationsLoading: true,
        loadingMessage: 'Syncing...',
      });

      const { getByText } = render(
        <AccountListFooter
          walletId={mockWalletId}
          onAccountCreated={jest.fn()}
        />,
      );

      // When account syncing is in progress, should show spinner
      expect(getByText('Syncing...')).toBeOnTheScreen();
    });

    it('shows default create account text when no loading states are active', () => {
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
  });
});
