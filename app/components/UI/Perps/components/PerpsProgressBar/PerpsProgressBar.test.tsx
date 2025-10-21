import React from 'react';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PerpsProgressBar } from './PerpsProgressBar';

import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useWithdrawalRequests } from '../../hooks';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
import {
  HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS,
  PROGRESS_BAR_COMPLETION_DELAY_MS,
  WITHDRAWAL_PROGRESS_STAGES,
  ZERO_BALANCE,
} from '../../constants/hyperLiquidConfig';

// Mock dependencies
jest.mock('../../hooks/usePerpsDepositProgress');
jest.mock('../../hooks/useWithdrawalRequests');
jest.mock('../../hooks/usePerpsSelector');
jest.mock('../../../../../core/Engine');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

const mockUsePerpsDepositProgress =
  usePerpsDepositProgress as jest.MockedFunction<
    typeof usePerpsDepositProgress
  >;
const mockUseWithdrawalRequests = useWithdrawalRequests as jest.MockedFunction<
  typeof useWithdrawalRequests
>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('PerpsProgressBar', () => {
  let mockController: {
    updateWithdrawalProgress: jest.MockedFunction<
      (progress: number, withdrawalId?: string) => void
    >;
  };
  let mockControllerMessenger: {
    subscribe: jest.MockedFunction<
      (event: string, handler: (event: unknown) => void) => void
    >;
    unsubscribe: jest.MockedFunction<
      (event: string, handler: (event: unknown) => void) => void
    >;
  };

  const defaultProps = {
    progressAmount: 50,
  };

  const mockWithdrawalRequests = [
    {
      id: 'withdrawal1',
      timestamp: 1640995200000,
      amount: '100',
      asset: 'USDC',
      txHash: '0x123',
      status: 'pending' as const,
      destination: '0x456',
      withdrawalId: 'withdrawal123',
    },
    {
      id: 'withdrawal2',
      timestamp: 1640995201000,
      amount: '200',
      asset: 'USDC',
      txHash: '0x789',
      status: 'completed' as const,
      destination: '0xabc',
      withdrawalId: 'withdrawal456',
    },
  ];

  const mockPersistentWithdrawalProgress = {
    progress: 0,
    lastUpdated: 0,
    activeWithdrawalId: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock controller
    mockController = {
      updateWithdrawalProgress: jest.fn(),
    };

    // Mock controller messenger
    mockControllerMessenger = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    // Mock Engine
    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };
    (
      mockEngine as unknown as { controllerMessenger: unknown }
    ).controllerMessenger = mockControllerMessenger;

    // Mock hooks
    mockUsePerpsDepositProgress.mockReturnValue({
      isDepositInProgress: false,
    });

    mockUseWithdrawalRequests.mockReturnValue({
      withdrawalRequests: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePerpsSelector.mockReturnValue(mockPersistentWithdrawalProgress);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('returns null when not showing and no active transactions', () => {
      mockUsePerpsDepositProgress.mockReturnValue({
        isDepositInProgress: false,
      });

      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(queryByTestId('perps-progress-bar')).toBeNull();
    });

    it('shows progress bar when deposit is in progress', () => {
      mockUsePerpsDepositProgress.mockReturnValue({
        isDepositInProgress: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });

    it('shows progress bar when withdrawal is active', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });
  });

  describe('deposit progress', () => {
    it('shows progress bar when deposit is in progress', () => {
      mockUsePerpsDepositProgress.mockReturnValue({
        isDepositInProgress: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });

    it('animates progress when deposit progress changes', () => {
      mockUsePerpsDepositProgress.mockReturnValue({
        isDepositInProgress: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      // Progress should be animated
      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });
  });

  describe('withdrawal progress', () => {
    it('shows progress bar when withdrawal is active', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });

    it('calls onWithdrawalAmountChange when withdrawal amount is available', () => {
      const onWithdrawalAmountChange = jest.fn();
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PerpsProgressBar
          {...defaultProps}
          onWithdrawalAmountChange={onWithdrawalAmountChange}
        />,
      );

      expect(onWithdrawalAmountChange).toHaveBeenCalledWith('100');
    });

    it('starts fresh withdrawal progress for new withdrawal', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(<PerpsProgressBar {...defaultProps} />);

      // Should start fresh progress
      expect(mockController.updateWithdrawalProgress).toHaveBeenCalledWith(
        25,
        'withdrawal1',
      );
    });

    it('simulates withdrawal progress stages', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(<PerpsProgressBar {...defaultProps} />);

      // Fast-forward time to trigger progress stages
      act(() => {
        jest.advanceTimersByTime(HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS);
      });

      // Should update progress to next stage
      expect(mockController.updateWithdrawalProgress).toHaveBeenCalledWith(
        WITHDRAWAL_PROGRESS_STAGES[1],
        'withdrawal1',
      );
    });

    it('stops at 98% until withdrawal is completed', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(<PerpsProgressBar {...defaultProps} />);

      // Fast-forward through all stages
      act(() => {
        WITHDRAWAL_PROGRESS_STAGES.forEach(() => {
          jest.advanceTimersByTime(HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS);
        });
      });

      // Should stop at 98%
      expect(mockController.updateWithdrawalProgress).toHaveBeenCalledWith(
        98,
        'withdrawal1',
      );
    });
  });

  describe('withdrawal completion', () => {
    it('hides progress bar after completion animation', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[1]], // completed withdrawal
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      // Fast-forward completion delay
      act(() => {
        jest.advanceTimersByTime(PROGRESS_BAR_COMPLETION_DELAY_MS);
      });

      // Should hide after completion
      expect(queryByTestId('perps-progress-bar')).toBeNull();
    });
  });

  describe('transaction status updates', () => {
    it('subscribes to transaction status updates', () => {
      renderWithProvider(<PerpsProgressBar {...defaultProps} />);

      expect(mockControllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      const { unmount } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      unmount();

      expect(mockControllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('handles perps deposit transaction updates', () => {
      const onTransactionAmountChange = jest.fn();
      renderWithProvider(
        <PerpsProgressBar
          {...defaultProps}
          onTransactionAmountChange={onTransactionAmountChange}
        />,
      );

      // Get the handler that was subscribed
      const subscribeCall = mockControllerMessenger.subscribe.mock.calls[0];
      const handler = subscribeCall[1];

      // Simulate transaction status update
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.confirmed,
        metamaskPay: { totalFiat: '$100.00' },
        txParams: { value: '0x0' },
      };

      act(() => {
        handler({ transactionMeta });
      });

      expect(onTransactionAmountChange).toHaveBeenCalledWith('$100.00');
    });

    it('handles ETH transfer transaction updates', () => {
      const onTransactionAmountChange = jest.fn();
      renderWithProvider(
        <PerpsProgressBar
          {...defaultProps}
          onTransactionAmountChange={onTransactionAmountChange}
        />,
      );

      // Get the handler that was subscribed
      const subscribeCall = mockControllerMessenger.subscribe.mock.calls[0];
      const handler = subscribeCall[1];

      // Simulate ETH transfer transaction
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.confirmed,
        metamaskPay: undefined,
        txParams: { value: '0xde0b6b3a7640000' }, // 1 ETH in wei
      };

      act(() => {
        handler({ transactionMeta });
      });

      expect(onTransactionAmountChange).toHaveBeenCalledWith(
        '0xde0b6b3a7640000',
      );
    });

    it('logs when no transaction amount is found', () => {
      renderWithProvider(<PerpsProgressBar {...defaultProps} />);

      // Get the handler that was subscribed
      const subscribeCall = mockControllerMessenger.subscribe.mock.calls[0];
      const handler = subscribeCall[1];

      // Simulate transaction without amount
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.confirmed,
        metamaskPay: undefined,
        txParams: { value: ZERO_BALANCE },
      };

      act(() => {
        handler({ transactionMeta });
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'No transaction amount found',
      );
    });

    it('ignores non-perps deposit transactions', () => {
      const onTransactionAmountChange = jest.fn();
      renderWithProvider(
        <PerpsProgressBar
          {...defaultProps}
          onTransactionAmountChange={onTransactionAmountChange}
        />,
      );

      // Get the handler that was subscribed
      const subscribeCall = mockControllerMessenger.subscribe.mock.calls[0];
      const handler = subscribeCall[1];

      // Simulate non-perps transaction
      const transactionMeta = {
        type: TransactionType.simpleSend,
        status: TransactionStatus.confirmed,
        metamaskPay: { totalFiat: '$100.00' },
        txParams: { value: '0x0' },
      };

      act(() => {
        handler({ transactionMeta });
      });

      expect(onTransactionAmountChange).not.toHaveBeenCalled();
    });
  });

  describe('animation and cleanup', () => {
    it('cleans up intervals on unmount', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { unmount } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      // Fast-forward to create interval
      act(() => {
        jest.advanceTimersByTime(HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS);
      });

      unmount();

      // Should clean up properly
      expect(mockControllerMessenger.unsubscribe).toHaveBeenCalled();
    });

    it('cleans up timeouts on unmount', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[1]], // completed withdrawal
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { unmount } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      unmount();

      // Should clean up properly
      expect(mockControllerMessenger.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles missing controller gracefully', () => {
      (mockEngine as unknown as { context: unknown }).context = {};

      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [mockWithdrawalRequests[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      expect(() => {
        renderWithProvider(<PerpsProgressBar {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles empty withdrawal requests', () => {
      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { queryByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(queryByTestId('perps-progress-bar')).toBeNull();
    });

    it('handles withdrawal requests without amount', () => {
      const withdrawalWithoutAmount = {
        ...mockWithdrawalRequests[0],
        amount: '',
      };

      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: [withdrawalWithoutAmount],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const onWithdrawalAmountChange = jest.fn();

      renderWithProvider(
        <PerpsProgressBar
          {...defaultProps}
          onWithdrawalAmountChange={onWithdrawalAmountChange}
        />,
      );

      expect(onWithdrawalAmountChange).not.toHaveBeenCalled();
    });

    it('handles multiple active withdrawals', () => {
      const multipleWithdrawals = [
        mockWithdrawalRequests[0],
        {
          ...mockWithdrawalRequests[0],
          id: 'withdrawal3',
          status: 'bridging' as const,
        },
      ];

      mockUseWithdrawalRequests.mockReturnValue({
        withdrawalRequests: multipleWithdrawals,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has proper test ID for testing', () => {
      mockUsePerpsDepositProgress.mockReturnValue({
        isDepositInProgress: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsProgressBar {...defaultProps} />,
      );

      expect(getByTestId('perps-progress-bar')).toBeTruthy();
    });
  });
});
