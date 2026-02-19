import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes } from './useRampsQuotes';
import type { QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      fetchQuotesForSelection: jest.fn(),
      getQuotes: jest.fn(),
      setSelectedQuote: jest.fn(),
      getWidgetUrl: jest.fn(),
    },
  },
}));

const mockQuote: Quote = {
  provider: 'test-provider',
  quote: {
    amountIn: 100,
    amountOut: 95,
    paymentMethod: 'debit-card',
  },
} as Quote;

const mockQuotesResponse: QuotesResponse = {
  success: [mockQuote],
  sorted: [],
  error: [],
  customActions: [],
};

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            quotes: {
              data: null,
              selected: null,
              isLoading: false,
              error: null,
            },
            ...rampsControllerState,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns quotes, selectedQuote, fetchQuotesForSelection, getWidgetUrl, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toMatchObject({
        quotes: null,
        selectedQuote: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchQuotesForSelection).toBe('function');
      expect(typeof result.current.getQuotes).toBe('function');
      expect(typeof result.current.setSelectedQuote).toBe('function');
      expect(typeof result.current.getWidgetUrl).toBe('function');
    });
  });

  describe('quotes state', () => {
    it('returns quotes from state', () => {
      const store = createMockStore({
        quotes: {
          data: mockQuotesResponse,
          selected: null,
          isLoading: false,
          error: null,
        },
      });
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.quotes).toEqual(mockQuotesResponse);
    });

    it('returns null when quotes are not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.quotes).toBeNull();
    });
  });

  describe('selectedQuote state', () => {
    it('returns selectedQuote from state', () => {
      const store = createMockStore({
        quotes: {
          data: mockQuotesResponse,
          selected: mockQuote,
          isLoading: false,
          error: null,
        },
      });
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.selectedQuote).toEqual(mockQuote);
    });

    it('returns null when no quote is selected', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.selectedQuote).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when quotes are being fetched', () => {
      const store = createMockStore({
        quotes: {
          data: null,
          selected: null,
          isLoading: true,
          error: null,
        },
      });
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false when quotes are not being fetched', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error when quote fetch fails', () => {
      const store = createMockStore({
        quotes: {
          data: null,
          selected: null,
          isLoading: false,
          error: 'Failed to fetch quotes',
        },
      });
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBe('Failed to fetch quotes');
    });

    it('returns null when there is no error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchQuotesForSelection', () => {
    it('calls Engine.context.RampsController.fetchQuotesForSelection with options', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      const options = {
        walletAddress: '0x123',
        amount: 100,
        redirectUrl: 'https://example.com',
      };

      act(() => {
        result.current.fetchQuotesForSelection(options);
      });

      expect(
        Engine.context.RampsController.fetchQuotesForSelection,
      ).toHaveBeenCalledWith(options);
    });

    it('calls fetchQuotesForSelection without redirectUrl when not provided', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      const options = {
        walletAddress: '0x123',
        amount: 100,
      };

      act(() => {
        result.current.fetchQuotesForSelection(options);
      });

      expect(
        Engine.context.RampsController.fetchQuotesForSelection,
      ).toHaveBeenCalledWith(options);
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
});
