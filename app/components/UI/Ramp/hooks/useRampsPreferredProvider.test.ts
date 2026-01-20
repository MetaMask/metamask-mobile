import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsPreferredProvider } from './useRampsPreferredProvider';
import type { Provider as RampProvider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

const mockProvider: RampProvider = {
  id: 'test-provider',
  name: 'Test Provider',
  environmentType: 'PRODUCTION',
  description: 'Test Provider Description',
  hqAddress: '123 Test St, Test City, TC 12345',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 79,
  },
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setPreferredProvider: jest.fn(),
    },
  },
}));

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            preferredProvider: null,
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

describe('useRampsPreferredProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns preferredProvider and setPreferredProvider', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPreferredProvider(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        preferredProvider: null,
      });
      expect(typeof result.current.setPreferredProvider).toBe('function');
    });
  });

  describe('preferredProvider state', () => {
    it('returns preferredProvider from state', () => {
      const store = createMockStore({ preferredProvider: mockProvider });
      const { result } = renderHook(() => useRampsPreferredProvider(), {
        wrapper: wrapper(store),
      });
      expect(result.current.preferredProvider).toEqual(mockProvider);
    });

    it('returns null when preferredProvider is not set', () => {
      const store = createMockStore({ preferredProvider: null });
      const { result } = renderHook(() => useRampsPreferredProvider(), {
        wrapper: wrapper(store),
      });
      expect(result.current.preferredProvider).toBeNull();
    });
  });

  describe('setPreferredProvider', () => {
    it('calls setPreferredProvider on controller with provider', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPreferredProvider(), {
        wrapper: wrapper(store),
      });
      result.current.setPreferredProvider(mockProvider);
      expect(
        Engine.context.RampsController.setPreferredProvider,
      ).toHaveBeenCalledWith(mockProvider);
    });

    it('calls setPreferredProvider on controller with null', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsPreferredProvider(), {
        wrapper: wrapper(store),
      });
      result.current.setPreferredProvider(null);
      expect(
        Engine.context.RampsController.setPreferredProvider,
      ).toHaveBeenCalledWith(null);
    });
  });
});
