import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictOrderPreview } from './usePredictOrderPreview';
import { usePredictTrading } from './usePredictTrading';
import { OrderPreview, PreviewOrderParams } from '../providers/types';
import { Side } from '../types';

jest.mock('./usePredictTrading');

describe('usePredictOrderPreview', () => {
  const mockPreviewOrder = jest.fn();
  const mockPreview: OrderPreview = {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: Date.now(),
    side: Side.BUY,
    sharePrice: 0.5,
    maxAmountSpent: 100,
    minAmountReceived: 200,
    slippage: 0.005,
    tickSize: 0.01,
    minOrderSize: 0.01,
    negRisk: false,
    fees: {
      metamaskFee: 1,
      providerFee: 1,
      totalFee: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (usePredictTrading as jest.Mock).mockReturnValue({
      previewOrder: mockPreviewOrder,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParams: PreviewOrderParams = {
    providerId: 'polymarket',
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    side: Side.BUY,
    size: 100,
  };

  describe('basic functionality', () => {
    it('initializes with null preview and not calculating', () => {
      const { result } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      expect(result.current.preview).toBeNull();
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('calculates preview when size is valid', async () => {
      mockPreviewOrder.mockResolvedValue(mockPreview);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledWith({
        providerId: 'polymarket',
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        side: Side.BUY,
        size: 100,
      });

      expect(result.current.preview).toEqual(mockPreview);
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does not calculate preview when size is 0', () => {
      const params = { ...defaultParams, size: 0 };
      const { result } = renderHook(() => usePredictOrderPreview(params));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockPreviewOrder).not.toHaveBeenCalled();
      expect(result.current.preview).toBeNull();
      expect(result.current.isCalculating).toBe(false);
    });

    it('does not calculate preview when size is negative', () => {
      const params = { ...defaultParams, size: -10 };
      const { result } = renderHook(() => usePredictOrderPreview(params));

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockPreviewOrder).not.toHaveBeenCalled();
      expect(result.current.preview).toBeNull();
      expect(result.current.isCalculating).toBe(false);
    });

    it('calculates preview for SELL side', async () => {
      mockPreviewOrder.mockResolvedValue({ ...mockPreview, side: Side.SELL });

      const params = { ...defaultParams, side: Side.SELL };
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(params),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ side: Side.SELL }),
      );
      expect(result.current.preview?.side).toBe(Side.SELL);
    });
  });

  describe('auto-refresh', () => {
    it('does not auto-refresh when autoRefreshTimeout is not provided', async () => {
      mockPreviewOrder.mockResolvedValue(mockPreview);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);
    });

    it('auto-refreshes preview at specified interval', async () => {
      mockPreviewOrder.mockResolvedValue(mockPreview);

      const params = { ...defaultParams, autoRefreshTimeout: 2000 };
      const { waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(params),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledTimes(2);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('handles preview calculation errors', async () => {
      const errorMessage = 'Failed to calculate preview';
      mockPreviewOrder.mockRejectedValue(new Error(errorMessage));

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console.error output during test
        });

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.preview).toBeNull();
      expect(result.current.isCalculating).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exceptions', async () => {
      mockPreviewOrder.mockRejectedValue('String error');

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console.error output during test
        });

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(result.current.error).toBe('String error');
      expect(result.current.isCalculating).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('sets isCalculating to false after error', async () => {
      mockPreviewOrder.mockRejectedValue(new Error('Error'));

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console.error output during test
        });

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.error).toBe('Error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('parameter changes', () => {
    it('reacts to outcomeTokenId changes', async () => {
      mockPreviewOrder.mockResolvedValue(mockPreview);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview({
          ...defaultParams,
          outcomeTokenId: 'new-token',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ outcomeTokenId: 'new-token' }),
      );
    });

    it('reacts to providerId changes', async () => {
      mockPreviewOrder.mockResolvedValue(mockPreview);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview({
          ...defaultParams,
          providerId: 'another-provider',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'another-provider' }),
      );
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() =>
        usePredictOrderPreview(defaultParams),
      );

      expect(() => unmount()).not.toThrow();
    });

    it('clears timers on unmount', () => {
      const { unmount } = renderHook(() =>
        usePredictOrderPreview({ ...defaultParams, autoRefreshTimeout: 1000 }),
      );

      unmount();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockPreviewOrder).not.toHaveBeenCalled();
    });
  });
});
