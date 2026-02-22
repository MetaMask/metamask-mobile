import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { usePerpsCloseAllPositions } from './usePerpsCloseAllPositions';
import Engine from '../../../../core/Engine';
import type { Position } from '../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      closePositions: jest.fn(),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.close_all_modal.error_message' && params?.count) {
      return `Failed to close ${params.count} positions`;
    }
    return key;
  }),
}));

const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '0.5',
  entryPrice: '50000',
  positionValue: '25000',
  unrealizedPnl: '100',
  marginUsed: '1000',
  leverage: { type: 'cross', value: 25 },
  liquidationPrice: '48000',
  maxLeverage: 50,
  returnOnEquity: '10',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('usePerpsCloseAllPositions', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  it('initializes with correct default state', () => {
    // Arrange
    const positions = [
      createMockPosition(),
      createMockPosition({ symbol: 'ETH' }),
    ];

    // Act
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Assert
    expect(result.current.isClosing).toBe(false);
    expect(result.current.positionCount).toBe(2);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.handleCloseAll).toBe('function');
    expect(typeof result.current.handleKeepPositions).toBe('function');
  });

  it('handles empty positions array', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePerpsCloseAllPositions([]));

    // Assert
    expect(result.current.positionCount).toBe(0);
  });

  it('handles null positions', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePerpsCloseAllPositions(null));

    // Assert
    expect(result.current.positionCount).toBe(0);
  });

  it('closes all positions successfully', async () => {
    // Arrange
    const positions = [
      createMockPosition(),
      createMockPosition({ symbol: 'ETH' }),
    ];
    const mockResult = {
      success: true,
      successCount: 2,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(Engine.context.PerpsController.closePositions).toHaveBeenCalledWith({
      closeAll: true,
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles partial success (some positions close, some fail)', async () => {
    // Arrange
    const positions = [
      createMockPosition(),
      createMockPosition({ symbol: 'ETH' }),
    ];
    const mockResult = {
      success: false,
      successCount: 1,
      failureCount: 1,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles complete failure (all positions fail)', async () => {
    // Arrange
    const positions = [
      createMockPosition(),
      createMockPosition({ symbol: 'ETH' }),
    ];
    const mockResult = {
      success: false,
      successCount: 0,
      failureCount: 2,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain(
      'Failed to close 2 positions',
    );
  });

  it('handles network errors', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const networkError = new Error('Network request failed');
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockRejectedValue(networkError);
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(result.current.error).toEqual(networkError);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('manages loading state correctly', async () => {
    // Arrange
    const positions = [createMockPosition()];
    let resolveClose: (value: unknown) => void;
    const closePromise = new Promise((resolve) => {
      resolveClose = resolve;
    });
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockReturnValue(closePromise);
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act - Start closing
    act(() => {
      result.current.handleCloseAll();
    });

    // Assert - Should be closing
    await waitFor(() => {
      expect(result.current.isClosing).toBe(true);
    });

    // Act - Resolve the promise
    await act(async () => {
      resolveClose({
        success: true,
        successCount: 1,
        failureCount: 0,
        results: [],
      });
      await closePromise;
    });

    // Assert - Should no longer be closing
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
  });

  it('invokes onSuccess callback when provided', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const mockResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      usePerpsCloseAllPositions(positions, { onSuccess }),
    );

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResult);
    });
  });

  it('invokes onError callback when provided', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const error = new Error('Close failed');
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockRejectedValue(error);
    const onError = jest.fn();
    const { result } = renderHook(() =>
      usePerpsCloseAllPositions(positions, { onError }),
    );

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('does not navigate back when navigateBackOnSuccess is false', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const mockResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const { result } = renderHook(() =>
      usePerpsCloseAllPositions(positions, { navigateBackOnSuccess: false }),
    );

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('handles keepPositions action', () => {
    // Arrange
    const positions = [createMockPosition()];
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act
    act(() => {
      result.current.handleKeepPositions();
    });

    // Assert
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('does nothing when handleCloseAll called with no positions', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsCloseAllPositions(null));

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    expect(
      Engine.context.PerpsController.closePositions,
    ).not.toHaveBeenCalled();
    expect(result.current.isClosing).toBe(false);
  });

  it('clears error state on subsequent successful close', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const error = new Error('First close failed');
    (Engine.context.PerpsController.closePositions as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        success: true,
        successCount: 1,
        failureCount: 0,
        results: [],
      });
    const { result } = renderHook(() => usePerpsCloseAllPositions(positions));

    // Act - First close fails
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert - Error is set
    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    // Act - Second close succeeds
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert - Error is cleared
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('logs calculation metadata when provided', async () => {
    // Arrange
    const positions = [createMockPosition()];
    const mockResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    };
    (
      Engine.context.PerpsController.closePositions as jest.Mock
    ).mockResolvedValue(mockResult);
    const calculations = {
      totalMargin: '1000',
      totalPnl: '100',
      totalFees: '10',
      receiveAmount: '1090',
    };
    const { result } = renderHook(() =>
      usePerpsCloseAllPositions(positions, { calculations }),
    );

    // Act
    await act(async () => {
      await result.current.handleCloseAll();
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isClosing).toBe(false);
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
