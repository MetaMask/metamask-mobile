import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsQuotes } from './useRampsQuotes';
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
});
