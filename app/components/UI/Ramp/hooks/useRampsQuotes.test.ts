import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes, type GetQuotesOptions } from './useRampsQuotes';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';
import {
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_PATH,
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
jest.mock('../utils/rampsBuyCufTrace', () => {
  const actual = jest.requireActual('../utils/rampsBuyCufTrace') as typeof import('../utils/rampsBuyCufTrace');
  return {
    ...actual,
    startRampsBuyQuoteFetchTrace: (...args: unknown[]) =>
      mockStartRampsBuyQuoteFetchTrace(...args),
    endRampsBuyQuoteFetchTrace: (...args: unknown[]) =>
      mockEndRampsBuyQuoteFetchTrace(...args),
  };
});

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
  success: [{ provider: '/providers/transak', quote: { amountIn: 100 } }],
  sorted: [],
  error: [],
  customActions: [],
};

describe('useRampsQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        tags: { [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/transak' },
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockQuotesResponse);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
          [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/transak',
          [RAMPS_BUY_CUF_TAG.CUSTOM_ACTION]: false,
        },
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
          [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/transak',
        },
      });
    });

    it('records PayPal custom-action quote success with provider + path tags (TRAM-3805)', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      const paypalOptions: GetQuotesOptions = {
        ...options,
        providers: ['/providers/paypal'],
        paymentMethods: ['/payments/paypal'],
      };
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue({
        success: [
          {
            provider: '/providers/paypal',
            quote: { amountIn: 100, isCustomAction: true },
          },
        ],
        sorted: [],
        error: [],
        customActions: [],
      });

      const { result } = renderHook(() => useRampsQuotes(paypalOptions), {
        wrapper: Wrapper,
      });

      expect(mockStartRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        tags: { [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/paypal' },
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
          [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/paypal',
          [RAMPS_BUY_CUF_TAG.PATH]: RAMPS_BUY_CUF_PATH.CUSTOM_ACTION,
          [RAMPS_BUY_CUF_TAG.CUSTOM_ACTION]: true,
        },
      });
    });

    it('records provider-level PayPal quote miss as CUF failure (TRAM-3805)', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      const paypalOptions: GetQuotesOptions = {
        ...options,
        providers: ['/providers/paypal'],
        paymentMethods: ['/payments/paypal'],
      };
      // Quotes API returns HTTP 200 with the provider error in error[] — the
      // query layer succeeds, but BuildQuote shows "no quotes" for PayPal.
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue({
        success: [],
        sorted: [],
        error: [
          { provider: '/providers/paypal', error: 'PayPal unavailable' },
        ],
        customActions: [],
      });

      const { result } = renderHook(() => useRampsQuotes(paypalOptions), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(mockEndRampsBuyQuoteFetchTrace).toHaveBeenCalledWith({
        id: 'quote-cuf-op-1',
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.NO_QUOTE,
          [RAMPS_BUY_CUF_TAG.PROVIDER]: '/providers/paypal',
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
  });
});
