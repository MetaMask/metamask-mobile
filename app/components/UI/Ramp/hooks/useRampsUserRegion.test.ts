import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsUserRegion } from './useRampsUserRegion';
import { UserRegion } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

const mockUserRegion: UserRegion = {
  country: {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: { buy: true, sell: true },
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

jest.mock('../../../../core/Engine', () => {
  const mockUserRegionValue: UserRegion = {
    country: {
      isoCode: 'US',
      name: 'United States',
      flag: '🇺🇸',
      phone: {
        prefix: '+1',
        placeholder: '(XXX) XXX-XXXX',
        template: 'XXX-XXX-XXXX',
      },
      currency: 'USD',
      supported: { buy: true, sell: true },
    },
    state: { stateId: 'CA', name: 'California' },
    regionCode: 'us-ca',
  };

  return {
    context: {
      RampsController: {
        init: jest.fn().mockResolvedValue(mockUserRegionValue),
        setUserRegion: jest.fn().mockResolvedValue(mockUserRegionValue),
      },
    },
  };
});

const createMockStore = (userRegionState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: {
              data: null,
              selected: null,
              isLoading: false,
              error: null,
              ...userRegionState,
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

describe('useRampsUserRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns userRegion, isLoading, error, fetchUserRegion, and setUserRegion', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        userRegion: null,
      });
      expect(typeof result.current.setUserRegion).toBe('function');
    });
  });

  describe('userRegion state', () => {
    it('returns userRegion from state', () => {
      const store = createMockStore({ data: mockUserRegion });
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current.userRegion).toEqual(mockUserRegion);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when isLoading is true', () => {
      const store = createMockStore({
        isLoading: true,
      });
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from state', () => {
      const store = createMockStore({
        error: 'Network error',
      });
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchUserRegion', () => {
    it('calls init without options when called with no arguments', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion();
      expect(Engine.context.RampsController.init).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('calls init with forceRefresh true when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion({ forceRefresh: true });
      expect(Engine.context.RampsController.init).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });

    it('calls init with forceRefresh false when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion({ forceRefresh: false });
      expect(Engine.context.RampsController.init).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });

    it('rejects with error when init fails', async () => {
      const store = createMockStore();
      const mockInit = Engine.context.RampsController.init as jest.Mock;
      mockInit.mockReset();
      mockInit.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchUserRegion()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('setUserRegion', () => {
    it('calls setUserRegion on controller', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });

      await act(async () => {
        await result.current.setUserRegion('US-CA');
      });

      expect(Engine.context.RampsController.setUserRegion).toHaveBeenCalledWith(
        'US-CA',
        undefined,
      );
    });

    it('calls setUserRegion with options when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });

      await act(async () => {
        await result.current.setUserRegion('US-CA', { forceRefresh: true });
      });

      expect(Engine.context.RampsController.setUserRegion).toHaveBeenCalledWith(
        'US-CA',
        { forceRefresh: true },
      );
    });
  });
});
