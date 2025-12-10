import { renderHook, act } from '@testing-library/react-native';
import { usePerpsFlipPosition } from './usePerpsFlipPosition';
import type { Position } from '../controllers/types';

const mockFlipPosition = jest.fn();
const mockShowToast = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    flipPosition: mockFlipPosition,
  }),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        market: {
          confirmed: jest.fn((direction, amount, symbol) => ({
            type: 'success',
            direction,
            amount,
            symbol,
          })),
          creationFailed: jest.fn((error) => ({
            type: 'error',
            error,
          })),
        },
      },
    },
  }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: (error: Error, context: unknown) =>
    mockCaptureException(error, context),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../utils/marketUtils', () => ({
  getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
}));

describe('usePerpsFlipPosition', () => {
  const mockLongPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const mockShortPosition: Position = {
    ...mockLongPosition,
    size: '-2.5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns handleFlipPosition function and isFlipping state', () => {
    const { result } = renderHook(() => usePerpsFlipPosition());

    expect(result.current.handleFlipPosition).toBeDefined();
    expect(typeof result.current.handleFlipPosition).toBe('function');
    expect(result.current.isFlipping).toBe(false);
  });

  it('sets isFlipping to true while flipping', async () => {
    let resolveFlip: (value: { success: boolean }) => void;
    mockFlipPosition.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFlip = resolve;
        }),
    );

    const { result } = renderHook(() => usePerpsFlipPosition());

    // Start the flip operation
    act(() => {
      result.current.handleFlipPosition(mockLongPosition);
    });

    // Check that isFlipping is true during the operation
    expect(result.current.isFlipping).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolveFlip({ success: true });
    });

    // Check that isFlipping is false after completion
    expect(result.current.isFlipping).toBe(false);
  });

  it('calls flipPosition with correct parameters for long position', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockFlipPosition).toHaveBeenCalledWith({
      coin: 'ETH',
      position: mockLongPosition,
    });
  });

  it('calls flipPosition with correct parameters for short position', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockShortPosition);
    });

    expect(mockFlipPosition).toHaveBeenCalledWith({
      coin: 'ETH',
      position: mockShortPosition,
    });
  });

  it('shows success toast and calls onSuccess callback on successful flip', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });
    const mockOnSuccess = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onSuccess: mockOnSuccess }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockShowToast).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('shows error toast and calls onError callback on failed flip', async () => {
    mockFlipPosition.mockResolvedValue({
      success: false,
      error: 'Insufficient margin',
    });
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockShowToast).toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith('Insufficient margin');
  });

  it('shows default error message when no error provided', async () => {
    mockFlipPosition.mockResolvedValue({ success: false });
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockOnError).toHaveBeenCalledWith('perps.errors.unknown');
  });

  it('handles exceptions and captures to Sentry', async () => {
    const testError = new Error('Network error');
    mockFlipPosition.mockRejectedValue(testError);
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockCaptureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        tags: expect.objectContaining({
          component: 'usePerpsFlipPosition',
          action: 'flip_position',
        }),
        extra: expect.objectContaining({
          positionContext: expect.objectContaining({
            coin: 'ETH',
            size: '2.5',
          }),
        }),
      }),
    );
    expect(mockOnError).toHaveBeenCalledWith('Network error');
  });

  it('handles non-Error exceptions', async () => {
    mockFlipPosition.mockRejectedValue('String error');
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.anything(),
    );
    expect(mockOnError).toHaveBeenCalledWith('perps.errors.unknown');
  });

  it('resets isFlipping to false after completion', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(result.current.isFlipping).toBe(false);
  });

  it('resets isFlipping to false after error', async () => {
    mockFlipPosition.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(result.current.isFlipping).toBe(false);
  });

  it('works without options provided', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    expect(mockFlipPosition).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('determines correct opposite direction for long position', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    // The toast should be called with 'short' as the opposite direction
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'short',
      }),
    );
  });

  it('determines correct opposite direction for short position', async () => {
    mockFlipPosition.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePerpsFlipPosition());

    await act(async () => {
      await result.current.handleFlipPosition(mockShortPosition);
    });

    // The toast should be called with 'long' as the opposite direction
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'long',
      }),
    );
  });
});
