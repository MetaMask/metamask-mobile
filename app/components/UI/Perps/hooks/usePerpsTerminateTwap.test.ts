import { renderHook, act } from '@testing-library/react-hooks';
import type { TwapOrder } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTerminateTwap } from './usePerpsTerminateTwap';

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const mockShowToast = jest.fn();
const mockCancellationSuccess = jest.fn(() => ({ id: 'success' }));
jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        shared: {
          cancellationSuccess: mockCancellationSuccess,
          cancellationFailed: { id: 'failed' },
        },
      },
    },
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      cancelOrder: jest.fn(),
    },
  },
}));

const twapOrder: TwapOrder = {
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 60_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_000,
  lastUpdated: 2_000,
  fills: [],
  providerId: 'hyperliquid',
};

const mockCancelOrder = Engine.context.PerpsController.cancelOrder as jest.Mock;

describe('usePerpsTerminateTwap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelOrder.mockResolvedValue({ success: true });
  });

  it('cancels through the venue TWAP path', async () => {
    // Arrange
    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onSuccess }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: orderType discriminates the strategy cancel path
    expect(mockCancelOrder).toHaveBeenCalledWith({
      orderId: 'twap-1',
      symbol: 'BTC',
      orderType: 'twap',
      providerId: 'hyperliquid',
    });
    expect(onSuccess).toHaveBeenCalledWith(twapOrder);
    expect(result.current.terminatingOrderId).toBeNull();
  });

  it('routes cancellation to the provider that owns the schedule', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());
    const routedOrder = { ...twapOrder, providerId: 'myx' as const };

    // Act
    await act(async () => {
      await result.current.terminateTwap(routedOrder);
    });

    // Assert
    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'myx' }),
    );
  });

  it('names the filled size in the success toast', async () => {
    // Arrange: a partially filled opening schedule
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: passing direction/amount/symbol keeps the shared copy off
    // "funds are available to trade", which would contradict the sheet's
    // warning that filled size stays as a position
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      false,
      undefined,
      'long',
      '4',
      'BTC',
    );
  });

  it('omits fill details when nothing executed', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap({ ...twapOrder, executedSize: '0' });
    });

    // Assert
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      false,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('omits directional fill copy for a reduce-only schedule', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap({ ...twapOrder, reduceOnly: true });
    });

    // Assert
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      true,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('treats an unsuccessful result as a failure', async () => {
    // Arrange
    mockCancelOrder.mockResolvedValue({ success: false, error: 'rejected' });
    const onError = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onError }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0].message).toBe('rejected');
  });

  it('does not throw when the controller rejects', async () => {
    // Arrange
    mockCancelOrder.mockRejectedValue(new Error('network down'));
    const onError = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onError }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: the failure surfaces through the callback, not a rejection
    expect(onError.mock.calls[0][0].message).toBe('network down');
    expect(result.current.terminatingOrderId).toBeNull();
  });
});
