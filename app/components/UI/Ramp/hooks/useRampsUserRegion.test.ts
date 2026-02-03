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
    it('returns userRegion and setUserRegion', () => {
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
