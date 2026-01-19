import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsTokens } from './useRampsTokens';
import { RequestStatus, type UserRegion } from '@metamask/ramps-controller';
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
    supported: true,
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

const mockTokens = {
  topTokens: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BTC', name: 'Bitcoin' },
  ],
  allTokens: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getTokens: jest.fn().mockResolvedValue(mockTokens),
    },
  },
}));

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: null,
            tokens: null,
            requests: {},
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

describe('useRampsTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.RampsController.getTokens as jest.Mock).mockResolvedValue(
      mockTokens,
    );
  });

  describe('return value structure', () => {
    it('returns tokens, isLoading, error, and fetchTokens', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        tokens: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchTokens).toBe('function');
    });
  });

  describe('region parameter', () => {
    it('uses provided region when specified', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ny","buy",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ny', 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('uses userRegion from state when region not provided', () => {
      const store = createMockStore({
        userRegion: mockUserRegion,
        requests: {
          'getTokens:["us-ca","buy",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens(undefined, 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('uses empty string when region and userRegion are not available', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["","buy",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('action parameter', () => {
    it('defaults to buy when not provided', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toBeDefined();
    });

    it('uses buy action when provided', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ca', 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('uses sell action when provided', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","sell",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ca', 'sell'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('tokens state', () => {
    it('returns tokens from state', () => {
      const store = createMockStore({ tokens: mockTokens });
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.tokens).toEqual(mockTokens);
    });

    it('returns null when tokens are not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.tokens).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when request is loading', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy",null]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ca', 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from request state', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy",null]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ca', 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchTokens', () => {
    it('calls getTokens with hook region and action when called without arguments', async () => {
      const store = createMockStore({
        userRegion: mockUserRegion,
      });
      const { result } = renderHook(() => useRampsTokens(undefined, 'sell'), {
        wrapper: wrapper(store),
      });
      await result.current.fetchTokens();
      expect(Engine.context.RampsController.getTokens).toHaveBeenCalledWith(
        'us-ca',
        'sell',
        undefined,
      );
    });

    it('calls getTokens with provided region', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens('us-ny', 'buy'), {
        wrapper: wrapper(store),
      });
      await result.current.fetchTokens('us-tx');
      expect(Engine.context.RampsController.getTokens).toHaveBeenCalledWith(
        'us-tx',
        'buy',
        undefined,
      );
    });

    it('calls getTokens with provided action', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens('us-ca', 'buy'), {
        wrapper: wrapper(store),
      });
      await result.current.fetchTokens(undefined, 'sell');
      expect(Engine.context.RampsController.getTokens).toHaveBeenCalledWith(
        'us-ca',
        'sell',
        undefined,
      );
    });

    it('calls getTokens with options when provided', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchTokens('us-ca', 'buy', { forceRefresh: true });
      expect(Engine.context.RampsController.getTokens).toHaveBeenCalledWith(
        'us-ca',
        'buy',
        { forceRefresh: true },
      );
    });

    it('calls getTokens with provider when provided in options', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchTokens('us-ca', 'buy', {
        provider: 'provider-id',
      });
      expect(Engine.context.RampsController.getTokens).toHaveBeenCalledWith(
        'us-ca',
        'buy',
        { provider: 'provider-id' },
      );
    });

    it('returns tokens data', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      const tokens = await result.current.fetchTokens('us-ca');
      expect(tokens).toEqual(mockTokens);
    });

    it('rejects with error when getTokens fails', async () => {
      const store = createMockStore();
      const mockGetTokens = Engine.context.RampsController
        .getTokens as jest.Mock;
      mockGetTokens.mockReset();
      mockGetTokens.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchTokens()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('provider parameter', () => {
    it('uses provider when provided', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy","provider-id"]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(
        () => useRampsTokens('us-ca', 'buy', 'provider-id'),
        {
          wrapper: wrapper(store),
        },
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('creates separate request state for different providers', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy","provider-1"]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
          'getTokens:["us-ca","buy","provider-2"]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result: result1 } = renderHook(
        () => useRampsTokens('us-ca', 'buy', 'provider-1'),
        {
          wrapper: wrapper(store),
        },
      );
      const { result: result2 } = renderHook(
        () => useRampsTokens('us-ca', 'buy', 'provider-2'),
        {
          wrapper: wrapper(store),
        },
      );
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(true);
    });

    it('works without provider parameter', () => {
      const store = createMockStore({
        requests: {
          'getTokens:["us-ca","buy",null]': {
            status: RequestStatus.SUCCESS,
            data: mockTokens,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsTokens('us-ca', 'buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });
});
