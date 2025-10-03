import { renderHook, act } from '@testing-library/react-native';
import { usePerpsWithdrawProgress } from './usePerpsWithdrawProgress';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { useSelector } from 'react-redux';

// Mock dependencies
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsWithdrawProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for usePerpsLiveAccount
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      },
      isInitialLoading: false,
    });

    // Default mock for useSelector
    mockUseSelector.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns false for isWithdrawInProgress initially', () => {
      // Act
      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(false);
    });

    it('subscribes to controller state on mount', () => {
      // Act
      renderHook(() => usePerpsWithdrawProgress());

      // Assert
      expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Controller State Handling', () => {
    it('sets withdrawal in progress when controller withdrawInProgress is true', () => {
      // Arrange
      mockUseSelector.mockReturnValue(true);
      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Act
      act(() => {
        // Trigger re-render with new selector value
        mockUseSelector.mockReturnValue(true);
      });

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(true);
    });

    it('clears withdrawal in progress when controller withdrawInProgress is false', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // First set withdrawal in progress
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);

      // Act - Now clear the withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(false);
      });

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(false);
    });

    it('captures balance when withdrawal starts', () => {
      // Arrange
      const mockAccount = {
        availableBalance: '500.00',
        totalBalance: '10000.00',
        marginUsed: '9500.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      };
      mockUsePerpsLiveAccount.mockReturnValue({
        account: mockAccount,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Act - Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(true);
    });
  });

  describe('Balance Change Detection', () => {
    it('completes withdrawal when balance decreases', () => {
      // Arrange
      const initialAccount = {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      };

      const updatedAccount = {
        availableBalance: '500.00', // Balance decreased
        totalBalance: '9500.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '9600.00',
      };

      mockUsePerpsLiveAccount.mockReturnValue({
        account: initialAccount,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);

      // Act - Update account with decreased balance
      act(() => {
        mockUsePerpsLiveAccount.mockReturnValue({
          account: updatedAccount,
          isInitialLoading: false,
        });
      });

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(false);
    });

    it('does not complete withdrawal when balance increases', () => {
      // Arrange
      const initialAccount = {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      };

      const updatedAccount = {
        availableBalance: '1500.00', // Balance increased
        totalBalance: '10500.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10600.00',
      };

      mockUsePerpsLiveAccount.mockReturnValue({
        account: initialAccount,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);

      // Act - Update account with increased balance
      act(() => {
        mockUsePerpsLiveAccount.mockReturnValue({
          account: updatedAccount,
          isInitialLoading: false,
        });
      });

      // Assert - Should still be in progress
      expect(result.current.isWithdrawInProgress).toBe(true);
    });

    it('does not complete withdrawal when balance stays the same', () => {
      // Arrange
      const account = {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      };

      mockUsePerpsLiveAccount.mockReturnValue({
        account,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);

      // Act - Update account with same balance
      act(() => {
        mockUsePerpsLiveAccount.mockReturnValue({
          account,
          isInitialLoading: false,
        });
      });

      // Assert - Should still be in progress
      expect(result.current.isWithdrawInProgress).toBe(true);
    });

    it('handles missing account gracefully', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });

      // Act - Update with null account
      act(() => {
        mockUsePerpsLiveAccount.mockReturnValue({
          account: null,
          isInitialLoading: false,
        });
      });

      // Assert - Should not crash and should still be in progress
      expect(result.current.isWithdrawInProgress).toBe(true);
    });

    it('handles missing availableBalance gracefully', () => {
      // Arrange
      const accountWithoutBalance = {
        availableBalance: '',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      };

      mockUsePerpsLiveAccount.mockReturnValue({
        account: accountWithoutBalance,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Start withdrawal
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });

      // Act - Update with account without balance
      act(() => {
        mockUsePerpsLiveAccount.mockReturnValue({
          account: accountWithoutBalance,
          isInitialLoading: false,
        });
      });

      // Assert - Should not crash and should still be in progress
      expect(result.current.isWithdrawInProgress).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid state changes correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsWithdrawProgress());

      // Act - Rapid state changes
      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);

      act(() => {
        mockUseSelector.mockReturnValue(false);
      });
      expect(result.current.isWithdrawInProgress).toBe(false);

      act(() => {
        mockUseSelector.mockReturnValue(true);
      });
      expect(result.current.isWithdrawInProgress).toBe(true);
    });

    it('maintains state consistency across re-renders', () => {
      // Arrange
      mockUseSelector.mockReturnValue(true);
      const { result, rerender } = renderHook(() => usePerpsWithdrawProgress());

      // Act - Re-render
      rerender({});

      // Assert
      expect(result.current.isWithdrawInProgress).toBe(true);
    });
  });
});
