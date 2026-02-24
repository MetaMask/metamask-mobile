import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import {
  useRampsQuotes,
  type GetQuotesOptions,
  type UseRampsQuotesOptions,
} from './useRampsQuotes';
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

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
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

  describe('return value structure', () => {
    it('returns getQuotes and getWidgetUrl functions', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(typeof result.current.getQuotes).toBe('function');
      expect(typeof result.current.getWidgetUrl).toBe('function');
    });

    it('returns data, loading, error with default values when no options', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('getQuotes', () => {
    it('calls Engine.context.RampsController.getQuotes with options', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        { success: [], sorted: [], error: [], customActions: [] },
      );

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
  });

  describe('getWidgetUrl', () => {
    it('calls Engine.context.RampsController.getWidgetUrl with quote', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
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
  });

  describe('fetch mode', () => {
    const options = {
      amount: 100,
      walletAddress: '0x123',
      assetId: 'eip155:1/slip44:60',
    };

    it('fetches and updates data/loading when options is provided', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: wrapper(store),
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockQuotesResponse);
      expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledWith(
        options,
      );
    });

    it('skips fetch when options is null', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(null), {
        wrapper: wrapper(store),
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(Engine.context.RampsController.getQuotes).not.toHaveBeenCalled();
    });

    it('always sets loading to false in finally when effect cleanup runs', async () => {
      const store = createMockStore();
      let resolve: ((value: typeof mockQuotesResponse) => void) | undefined;
      const fetchPromise = new Promise<typeof mockQuotesResponse>((r) => {
        resolve = r;
      });
      (Engine.context.RampsController.getQuotes as jest.Mock).mockReturnValue(
        fetchPromise,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: GetQuotesOptions | null }) =>
          useRampsQuotes(params),
        {
          wrapper: wrapper(store),
          initialProps: { params: options } as {
            params: GetQuotesOptions | null;
          },
        },
      );

      expect(result.current.loading).toBe(true);

      rerender({ params: null });

      await act(async () => {
        if (resolve) resolve(mockQuotesResponse);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('does not apply stale data when cancelled', async () => {
      const store = createMockStore();
      let resolveFirst:
        | ((value: typeof mockQuotesResponse) => void)
        | undefined;
      const firstPromise = new Promise<typeof mockQuotesResponse>((r) => {
        resolveFirst = r;
      });
      (Engine.context.RampsController.getQuotes as jest.Mock).mockReturnValue(
        firstPromise,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: GetQuotesOptions | null }) =>
          useRampsQuotes(params),
        {
          wrapper: wrapper(store),
          initialProps: { params: options } as {
            params: GetQuotesOptions | null;
          },
        },
      );

      rerender({ params: null });

      await act(async () => {
        if (resolveFirst) resolveFirst(mockQuotesResponse);
      });

      expect(result.current.data).toBeNull();
    });

    it('populates error when fetch rejects', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useRampsQuotes(options), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.data).toBeNull();
    });

    it('clears data when options becomes null', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: GetQuotesOptions | null }) =>
          useRampsQuotes(params),
        {
          wrapper: wrapper(store),
          initialProps: { params: options } as {
            params: GetQuotesOptions | null;
          },
        },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockQuotesResponse);
      });

      rerender({ params: null });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('enableFetching', () => {
    const baseOptions: UseRampsQuotesOptions = {
      amount: 100,
      walletAddress: '0x123',
      assetId: 'eip155:1/slip44:60',
    };

    it('skips fetch when enableFetching is false', () => {
      const store = createMockStore();
      const { result } = renderHook(
        () => useRampsQuotes({ ...baseOptions, enableFetching: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(Engine.context.RampsController.getQuotes).not.toHaveBeenCalled();
    });

    it('fetches when enableFetching is true', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result } = renderHook(
        () => useRampsQuotes({ ...baseOptions, enableFetching: true }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockQuotesResponse);
    });

    it('does not pass enableFetching to the controller', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      renderHook(
        () => useRampsQuotes({ ...baseOptions, enableFetching: true }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledTimes(
          1,
        );
      });

      const calledWith = (Engine.context.RampsController.getQuotes as jest.Mock)
        .mock.calls[0][0];
      expect(calledWith).not.toHaveProperty('enableFetching');
    });

    it('clears data when enableFetching transitions from true to false', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: UseRampsQuotesOptions }) =>
          useRampsQuotes(params),
        {
          wrapper: wrapper(store),
          initialProps: {
            params: { ...baseOptions, enableFetching: true },
          },
        },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockQuotesResponse);
      });

      rerender({ params: { ...baseOptions, enableFetching: false } });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does not re-fetch when options object is a new reference with same values', async () => {
      const store = createMockStore();
      (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue(
        mockQuotesResponse,
      );

      const { result, rerender } = renderHook(
        ({ params }: { params: UseRampsQuotesOptions }) =>
          useRampsQuotes(params),
        {
          wrapper: wrapper(store),
          initialProps: { params: { ...baseOptions } },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender({ params: { ...baseOptions } });

      expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledTimes(1);
    });
  });
});
