import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictOrderPreview } from './usePredictOrderPreview';
import { OrderPreview, PreviewOrderParams, Side } from '../types';
import { DEFAULT_FEE_COLLECTION_FLAG } from '../constants/flags';
import Logger from '../../../../util/Logger';

const mockPreviewOrder = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      previewOrder: (...args: unknown[]) => mockPreviewOrder(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.error_messages.preview_failed': 'Failed to preview order',
      'predict.error_messages.unknown_error': 'An unknown error occurred',
    };
    return translations[key] || key;
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictOrderPreview', () => {
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
      totalFeePercentage: 4,
      collector: DEFAULT_FEE_COLLECTION_FLAG.collector,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPreviewOrder.mockResolvedValue(mockPreview);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParams: PreviewOrderParams = {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    side: Side.BUY,
    size: 100,
  };

  describe('basic functionality', () => {
    it('initializes with null preview and loading state', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      expect(result.current.preview).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('initializes with initialPreview when provided', () => {
      const { result } = renderHook(() =>
        usePredictOrderPreview({
          ...defaultParams,
          initialPreview: mockPreview,
        }),
      );

      expect(result.current.preview).toEqual(mockPreview);
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('replaces initialPreview when new preview loads from API', async () => {
      const updatedPreview: OrderPreview = {
        ...mockPreview,
        sharePrice: 0.75,
        maxAmountSpent: 200,
      };
      mockPreviewOrder.mockResolvedValue(updatedPreview);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictOrderPreview({
          ...defaultParams,
          initialPreview: mockPreview,
        }),
      );

      expect(result.current.preview).toEqual(mockPreview);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitForNextUpdate();

      expect(result.current.preview).toEqual(updatedPreview);
      expect(result.current.isLoading).toBe(false);
    });

    it('calculates preview when size is valid', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      // Advance past debounce timer
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toEqual(mockPreview);
      });

      expect(mockPreviewOrder).toHaveBeenCalledWith({
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        side: Side.BUY,
        size: 100,
        positionId: undefined,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does not calculate preview when size is 0', async () => {
      const { Wrapper } = createWrapper();
      const params = { ...defaultParams, size: 0 };
      const { result } = renderHook(() => usePredictOrderPreview(params), {
        wrapper: Wrapper,
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockPreviewOrder).not.toHaveBeenCalled();
      expect(result.current.preview).toBeNull();
    });

    it('does not calculate preview when size is negative', async () => {
      const { Wrapper } = createWrapper();
      const params = { ...defaultParams, size: -10 };
      const { result } = renderHook(() => usePredictOrderPreview(params), {
        wrapper: Wrapper,
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockPreviewOrder).not.toHaveBeenCalled();
      expect(result.current.preview).toBeNull();
    });

    it('calculates preview for SELL side', async () => {
      const { Wrapper } = createWrapper();
      mockPreviewOrder.mockResolvedValue({ ...mockPreview, side: Side.SELL });

      const params = { ...defaultParams, side: Side.SELL };
      const { result } = renderHook(() => usePredictOrderPreview(params), {
        wrapper: Wrapper,
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toBeTruthy();
      });

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ side: Side.SELL }),
      );
      expect(result.current.preview?.side).toBe(Side.SELL);
    });
  });

  describe('isLoading state', () => {
    it('returns true when preview is null and no error', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      expect(result.current.preview).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when preview exists', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toEqual(mockPreview);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('returns false when error exists', async () => {
      const { Wrapper } = createWrapper();
      mockPreviewOrder.mockRejectedValue(new Error('API Error'));

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.preview).toBeNull();
      expect(result.current.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('returns true when size is invalid', async () => {
      const { Wrapper } = createWrapper();
      const params = { ...defaultParams, size: 0 };
      const { result } = renderHook(() => usePredictOrderPreview(params), {
        wrapper: Wrapper,
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.preview).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('auto-refresh', () => {
    it('does not auto-refresh when autoRefreshTimeout is not provided', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toBeTruthy();
      });

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);
    });

    it('auto-refreshes when autoRefreshTimeout is provided', async () => {
      const { Wrapper } = createWrapper();
      const params = { ...defaultParams, autoRefreshTimeout: 2000 };
      const { result } = renderHook(() => usePredictOrderPreview(params), {
        wrapper: Wrapper,
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toBeTruthy();
      });

      expect(mockPreviewOrder).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockPreviewOrder).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('handles preview calculation errors with localized message', async () => {
      const { Wrapper } = createWrapper();
      mockPreviewOrder.mockRejectedValue(new Error('Failed to calculate'));

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to preview order');
      });

      expect(result.current.preview).toBeNull();
      expect(result.current.isLoading).toBe(false);

      // Verify Sentry logging via Logger
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: { feature: 'Predict', component: 'usePredictOrderPreview' },
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exceptions with localized message', async () => {
      const { Wrapper } = createWrapper();
      mockPreviewOrder.mockRejectedValue('String error');

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to preview order');
      });

      expect(result.current.isLoading).toBe(false);

      // Verify Logger is called even for non-Error exceptions
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: { feature: 'Predict', component: 'usePredictOrderPreview' },
        }),
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles known error codes with specific localized message', async () => {
      const { Wrapper } = createWrapper();
      mockPreviewOrder.mockRejectedValue(new Error('PREDICT_PREVIEW_FAILED'));

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const { result } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to preview order');
      });

      expect(result.current.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('parameter changes', () => {
    it('reacts to outcomeTokenId changes', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          usePredictOrderPreview({
            ...defaultParams,
            outcomeTokenId: 'new-token',
          }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toBeTruthy();
      });

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ outcomeTokenId: 'new-token' }),
      );
    });

    it('reacts to marketId changes', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          usePredictOrderPreview({
            ...defaultParams,
            marketId: 'market-2',
          }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.preview).toBeTruthy();
      });

      expect(mockPreviewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ marketId: 'market-2' }),
      );
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount', () => {
      const { Wrapper } = createWrapper();
      const { unmount } = renderHook(
        () => usePredictOrderPreview(defaultParams),
        { wrapper: Wrapper },
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
