import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes, type GetQuotesOptions } from './useRampsQuotes';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';
import {
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TAG,
} from '../constants/rampsBuyCufTags';

const mockGetBuyWidgetData = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getQuotes: jest.fn(),
      getBuyWidgetData: (...args: unknown[]) => mockGetBuyWidgetData(...args),
    },
  },
}));

const mockStartRampsBuyQuoteFetchTrace = jest.fn(() => 'quote-cuf-op-1');
const mockEndRampsBuyQuoteFetchTrace = jest.fn();
jest.mock('../utils/rampsBuyCufTrace', () => ({
  // Cast through a rest-param signature so tsc accepts the spread (TS2556).
  startRampsBuyQuoteFetchTrace: (...args: unknown[]) =>
    (mockStartRampsBuyQuoteFetchTrace as (...a: unknown[]) => string)(...args),
  endRampsBuyQuoteFetchTrace: (...args: unknown[]) =>
    (mockEndRampsBuyQuoteFetchTrace as (...a: unknown[]) => void)(...args),
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {},
        },
      }),
    },
  });

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store } as never,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );

  return { Wrapper, queryClient };
};

const mockQuotesResponse = {
  success: [{ provider: 'test', quote: { amountIn: 100 } }],
  sorted: [],
  error: [],
  customActions: [],
};

describe('useRampsQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  describe('return value structure', () => {
    it('returns getQuotes and getBuyWidgetData functions', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: Wrapper,
      });

      expect(typeof result.current.getQuotes).toBe('function');
      expect(typeof result.current.getBuyWidgetData).toBe('function');
    });
  });

  it('returns idle state when no options are provided', () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useRampsQuotes(), {
      wrapper: Wrapper,
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls Engine.context.RampsController.getQuotes with options', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    const { result } = renderHook(() => useRampsQuotes(), {
      wrapper: Wrapper,
    });

    (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue({
      success: [],
      sorted: [],
      error: [],
      customActions: [],
    });

    const options = {
      amount: 100,
      walletAddress: '0x123',
      assetId: 'eip155:1/slip44:60',
    };

    await act(async () => {
      await result.current.getQuotes(options);
    });

    expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledWith(
      options,
    );
  });

  describe('getBuyWidgetData', () => {
    it('calls Engine.context.RampsController.getBuyWidgetData with quote', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: Wrapper,
      });

      const testQuote: Quote = {
        provider: '/providers/test',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/card',
          buyURL: 'https://on-ramp.uat-api.cx.metamask.io/test/buy-widget',
        },
      } as Quote;

      const mockBuyWidget = {
        url: 'https://global.transak.com/?apiKey=test',
        orderId: null,
      };
      mockGetBuyWidgetData.mockResolvedValue(mockBuyWidget);

      let resolvedValue: Awaited<
        ReturnType<typeof result.current.getBuyWidgetData>
      > = null;
      await act(async () => {
        resolvedValue = await result.current.getBuyWidgetData(testQuote);
      });

      expect(mockGetBuyWidgetData).toHaveBeenCalledWith(testQuote);
      expect(resolvedValue).toEqual(mockBuyWidget);
    });
  });

  describe('fetch mode', () => {
    const options: GetQuotesOptions = {
      amount: 100,
      walletAddress: '0x123',
      assetId: 'eip155:1/slip44:60',
      paymentMethods: ['/payments/card'],
      providers: ['/providers/transak'],
    };

    it('fetches and updates data/loading when options are provided', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.status).toBe('loading');
      expect(result.current.data).toBeNull();
      expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockQuotesResponse);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      });
      expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          walletAddress: '0x123',
          assetId: 'eip155:1/slip44:60',
          paymentMethods: ['/payments/card'],
          providers: ['/providers/transak'],
        }),
      );
    });

    it('returns error when the request rejects', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      const networkError = new Error('Network error');
      (Engine.context.RampsController.getQuotes as jest.Mock).mockRejectedValue(
        networkError,
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(networkError);
      expect(result.current.data).toBeNull();
      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
        },
      });
    });

    it('preserves enriched error metadata when the request rejects', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      const circuitBreakerError = Object.assign(
        new Error('Execution prevented because the circuit breaker is open'),
        { errorKey: 'CIRCUIT_BREAKER_OPEN' },
      );
      (Engine.context.RampsController.getQuotes as jest.Mock).mockRejectedValue(
        circuitBreakerError,
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(circuitBreakerError);
      expect(result.current.data).toBeNull();
    });

    it('returns idle and clears data when options become null', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result, rerender } = renderHook<
        ReturnType<typeof useRampsQuotes>,
        { params: GetQuotesOptions | null }
      >(({ params }) => useRampsQuotes(params), {
        wrapper: Wrapper,
        initialProps: { params: options },
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      rerender({ params: null });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('starts a new quote CUF when amount changes while a fetch is in flight', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      let resolveFirst: (value: typeof mockQuotesResponse) => void = () =>
        undefined;
      let resolveSecond: (value: typeof mockQuotesResponse) => void = () =>
        undefined;
      const firstFetch = new Promise<typeof mockQuotesResponse>((resolve) => {
        resolveFirst = resolve;
      });
      const secondFetch = new Promise<typeof mockQuotesResponse>((resolve) => {
        resolveSecond = resolve;
      });

      (Engine.context.RampsController.getQuotes as jest.Mock)
        .mockImplementationOnce(() => firstFetch)
        .mockImplementationOnce(() => secondFetch);

      mockStartRampsBuyQuoteFetchTrace
        .mockReturnValueOnce('quote-cuf-op-1')
        .mockReturnValueOnce('quote-cuf-op-2');

      const { result, rerender } = renderHook<
        ReturnType<typeof useRampsQuotes>,
        { params: GetQuotesOptions }
      >(({ params }) => useRampsQuotes(params), {
        wrapper: Wrapper,
        initialProps: { params: options },
      });

      await waitFor(() => {
        expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(1);
      });

      rerender({
        params: {
          ...options,
          amount: 250,
        },
      });

      await waitFor(() => {
        expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        resolveFirst(mockQuotesResponse);
        resolveSecond(mockQuotesResponse);
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-2',
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      });
    });

    it('supersedes an in-flight quote CUF when switching to a cached amount', async () => {
      const store = createMockStore();
      const { Wrapper, queryClient } = createWrapper(store);

      let resolveSlow: (value: typeof mockQuotesResponse) => void = () =>
        undefined;
      const slowFetch = new Promise<typeof mockQuotesResponse>((resolve) => {
        resolveSlow = resolve;
      });

      (Engine.context.RampsController.getQuotes as jest.Mock)
        .mockResolvedValueOnce(mockQuotesResponse)
        .mockImplementationOnce(() => slowFetch);

      mockStartRampsBuyQuoteFetchTrace
        .mockReturnValueOnce('quote-cuf-op-1')
        .mockReturnValueOnce('quote-cuf-op-2');

      const { result, rerender } = renderHook<
        ReturnType<typeof useRampsQuotes>,
        { params: GetQuotesOptions }
      >(({ params }) => useRampsQuotes(params), {
        wrapper: Wrapper,
        initialProps: { params: options },
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });
      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      });
      mockEndRampsBuyQuoteFetchTrace.mockClear();

      // Seed cache for amount 100, then start a slow fetch for 250.
      rerender({
        params: {
          ...options,
          amount: 250,
        },
      });

      await waitFor(() => {
        expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(2);
      });

      // Revert to cached amount 100 while 250 is still in flight.
      rerender({ params: options });

      await waitFor(() => {
        expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
          id: 'quote-cuf-op-2',
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
            [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
          },
        });
      });

      // Cached key should not be recorded as a successful quote-fetch CUF.
      expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('success');

      // Background refetch of the settled cached key must not open another CUF.
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['ramps', 'quotes'] });
      });
      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });
      expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveSlow(mockQuotesResponse);
      });
    });

    it('does not end an in-flight quote CUF as success while the query is paused offline', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      let resolveFetch: (value: typeof mockQuotesResponse) => void = () =>
        undefined;
      const pendingFetch = new Promise<typeof mockQuotesResponse>((resolve) => {
        resolveFetch = resolve;
      });
      (
        Engine.context.RampsController.getQuotes as jest.Mock
      ).mockImplementation(() => pendingFetch);

      onlineManager.setOnline(true);

      renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(1);
      });
      mockEndRampsBuyQuoteFetchTrace.mockClear();

      await act(async () => {
        onlineManager.setOnline(false);
      });

      expect(mockEndRampsBuyQuoteFetchTrace).not.toHaveBeenCalled();

      await act(async () => {
        onlineManager.setOnline(true);
        resolveFetch(mockQuotesResponse);
      });

      await waitFor(() => {
        expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
          id: 'quote-cuf-op-1',
          data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
        });
      });
    });

    it('ends an in-flight quote CUF as cancelled on unmount', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      let resolveFetch: (value: typeof mockQuotesResponse) => void = () =>
        undefined;
      const pendingFetch = new Promise<typeof mockQuotesResponse>((resolve) => {
        resolveFetch = resolve;
      });
      (
        Engine.context.RampsController.getQuotes as jest.Mock
      ).mockImplementation(() => pendingFetch);

      const { unmount } = renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledTimes(1);
      });

      unmount();

      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.CANCELLED,
        },
      });

      await act(async () => {
        resolveFetch(mockQuotesResponse);
      });
    });
  });
});
