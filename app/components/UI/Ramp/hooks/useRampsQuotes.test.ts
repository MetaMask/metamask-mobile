import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes } from './useRampsQuotes';
import type { Quote, QuotesResponse } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      startQuotePolling: jest.fn(),
      stopQuotePolling: jest.fn(),
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
    it('returns quotes, selectedQuote, startQuotePolling, stopQuotePolling, isLoading, and error', () => {
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
      expect(typeof result.current.startQuotePolling).toBe('function');
      expect(typeof result.current.stopQuotePolling).toBe('function');
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

  describe('startQuotePolling', () => {
    it('calls Engine.context.RampsController.startQuotePolling with options', () => {
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
        result.current.startQuotePolling(options);
      });

      expect(
        Engine.context.RampsController.startQuotePolling,
      ).toHaveBeenCalledWith(options);
    });

    it('calls startQuotePolling without redirectUrl when not provided', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      const options = {
        walletAddress: '0x123',
        amount: 100,
      };

      act(() => {
        result.current.startQuotePolling(options);
      });

      expect(
        Engine.context.RampsController.startQuotePolling,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('stopQuotePolling', () => {
    it('calls Engine.context.RampsController.stopQuotePolling', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsQuotes(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.stopQuotePolling();
      });

      expect(
        Engine.context.RampsController.stopQuotePolling,
      ).toHaveBeenCalled();
    });
  });
});
