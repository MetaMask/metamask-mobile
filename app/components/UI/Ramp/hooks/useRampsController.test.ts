import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsController } from './useRampsController';
import { useRampsProviders } from './useRampsProviders';
import { useRampsTokens } from './useRampsTokens';
import { useRampsCountries } from './useRampsCountries';

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupWithInternalAccountsAddresses: () => ['0x123'],
  }),
);

jest.mock('./useRampsUserRegion', () => ({
  useRampsUserRegion: jest.fn(() => ({
    userRegion: null,
    isLoading: false,
    error: null,
    fetchUserRegion: jest.fn(),
    setUserRegion: jest.fn(),
  })),
}));

jest.mock('./useRampsPreferredProvider', () => ({
  useRampsPreferredProvider: jest.fn(() => ({
    preferredProvider: null,
    setPreferredProvider: jest.fn(),
  })),
}));

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: jest.fn(() => ({
    providers: [],
    isLoading: false,
    error: null,
    fetchProviders: jest.fn(),
  })),
}));

jest.mock('./useRampsTokens', () => ({
  useRampsTokens: jest.fn(() => ({
    tokens: null,
    isLoading: false,
    error: null,
    fetchTokens: jest.fn(),
  })),
}));

jest.mock('./useRampsCountries', () => ({
  useRampsCountries: jest.fn(() => ({
    countries: [],
    isLoading: false,
    error: null,
  })),
}));

jest.mock('./useRampsPreferredProviderAutoSet', () => ({
  useRampsPreferredProviderAutoSet: jest.fn(),
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {},
        },
      }),
      fiatOrders: () => ({
        orders: [],
      }),
      multichainAccounts: () => ({
        accountTree: {
          selectedAccountGroup: {
            accounts: [{ address: '0x123' }],
          },
        },
      }),
      network: () => ({
        selectedNetworkClientId: 'mainnet',
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all ramps controller functionality', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsController(), {
      wrapper: wrapper(store),
    });

    expect(result.current).toMatchObject({
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      preferredProvider: null,
      providers: [],
      providersLoading: false,
      providersError: null,
      tokens: null,
      tokensLoading: false,
      tokensError: null,
      countries: null,
      countriesLoading: false,
      countriesError: null,
    });

    expect(typeof result.current.fetchUserRegion).toBe('function');
    expect(typeof result.current.setUserRegion).toBe('function');
    expect(typeof result.current.setPreferredProvider).toBe('function');
    expect(typeof result.current.fetchProviders).toBe('function');
    expect(typeof result.current.fetchTokens).toBe('function');
  });

  it('passes options to child hooks', () => {
    const store = createMockStore();
    renderHook(
      () =>
        useRampsController({
          region: 'us-ny',
          action: 'sell',
          providerFilters: {
            provider: 'test-provider',
            crypto: 'ETH',
          },
        }),
      {
        wrapper: wrapper(store),
      },
    );

    expect(useRampsProviders).toHaveBeenCalledWith('us-ny', {
      provider: 'test-provider',
      crypto: 'ETH',
    });
    expect(useRampsTokens).toHaveBeenCalledWith('us-ny', 'sell');
    expect(useRampsCountries).toHaveBeenCalledWith('sell');
  });

  it('passes undefined options when not provided', () => {
    const store = createMockStore();
    renderHook(() => useRampsController(), {
      wrapper: wrapper(store),
    });

    expect(useRampsProviders).toHaveBeenCalledWith(undefined, undefined);
    expect(useRampsTokens).toHaveBeenCalledWith(undefined, undefined);
    expect(useRampsCountries).toHaveBeenCalledWith(undefined);
  });
});
