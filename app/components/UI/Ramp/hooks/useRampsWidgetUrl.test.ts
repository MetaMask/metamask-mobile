import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsWidgetUrl } from './useRampsWidgetUrl';

const mockBuyWidget = {
  url: 'https://global.transak.com/?apiKey=test',
  browser: 'in-app',
  orderId: 'order-123',
};

const createMockStore = (widgetUrlState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            widgetUrl: {
              data: null,
              selected: null,
              isLoading: false,
              error: null,
              ...widgetUrlState,
            },
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsWidgetUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns widgetUrl, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toMatchObject({
        widgetUrl: null,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('widgetUrl state', () => {
    it('returns widgetUrl from state', () => {
      const store = createMockStore({ data: mockBuyWidget });
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.widgetUrl).toEqual(mockBuyWidget);
    });

    it('returns null when widgetUrl is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.widgetUrl).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when widget URL is being fetched', () => {
      const store = createMockStore({ isLoading: true });
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false when widget URL is not being fetched', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error when widget URL fetch fails', () => {
      const store = createMockStore({ error: 'Failed to fetch widget URL' });
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBe('Failed to fetch widget URL');
    });

    it('returns null when there is no error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsWidgetUrl(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBeNull();
    });
  });
});
