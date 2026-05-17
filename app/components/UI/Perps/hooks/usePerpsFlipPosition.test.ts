import { renderHook, act } from '@testing-library/react-native';
import { usePerpsFlipPosition } from './usePerpsFlipPosition';
import { type Position } from '@metamask/perps-controller';
import Logger from '../../../../util/Logger';

const mockFlipPosition = jest.fn();
const mockShowToast = jest.fn();

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

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('@metamask/perps-controller', () => ({
  ...jest.requireActual('@metamask/perps-controller'),
  getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
}));

describe('usePerpsFlipPosition', () => {
  const mockLongPosition: Position = {
    symbol: 'ETH',
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
      symbol: 'ETH',
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
      symbol: 'ETH',
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

  it('surfaces exception via toast and onError without double-reporting to Sentry', async () => {
    const testError = new Error('Network error');
    mockFlipPosition.mockRejectedValue(testError);
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    // Sentry reporting is handled at the controller layer; the UI hook must not duplicate it
    expect(Logger.error).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith('Network error');
  });

  it('handles non-Error exceptions with fallback message without double-reporting to Sentry', async () => {
    mockFlipPosition.mockRejectedValue('String error');
    const mockOnError = jest.fn();

    const { result } = renderHook(() =>
      usePerpsFlipPosition({ onError: mockOnError }),
    );

    await act(async () => {
      await result.current.handleFlipPosition(mockLongPosition);
    });

    // Sentry reporting is handled at the controller layer; the UI hook must not duplicate it
    expect(Logger.error).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
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
