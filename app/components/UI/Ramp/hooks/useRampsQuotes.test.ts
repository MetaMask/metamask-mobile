import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes, type GetQuotesOptions } from './useRampsQuotes';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getQuotes: jest.fn(),
      getWidgetUrl: jest.fn(),
    },
  },
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
      { store },
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
  });

  it('returns getQuotes and getWidgetUrl functions', () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useRampsQuotes(), {
      wrapper: Wrapper,
    });

    expect(typeof result.current.getQuotes).toBe('function');
    expect(typeof result.current.getWidgetUrl).toBe('function');
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

  it('calls Engine.context.RampsController.getWidgetUrl with quote', async () => {
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

    (
      Engine.context.RampsController.getWidgetUrl as jest.Mock
    ).mockResolvedValue('https://global.transak.com/?apiKey=test');

    await act(async () => {
      await result.current.getWidgetUrl(testQuote);
    });

    expect(Engine.context.RampsController.getWidgetUrl).toHaveBeenCalledWith(
      testQuote,
    );
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

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockQuotesResponse);
      expect(result.current.isSuccess).toBe(true);
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
      (Engine.context.RampsController.getQuotes as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.data).toBeNull();
    });

    it('returns idle and clears data when options become null', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: GetQuotesOptions | null }) =>
          useRampsQuotes(params),
        {
          wrapper: Wrapper,
          initialProps: { params: options },
        },
      );

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
