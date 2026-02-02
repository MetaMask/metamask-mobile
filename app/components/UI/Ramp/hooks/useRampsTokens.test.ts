import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsTokens } from './useRampsTokens';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedToken: jest.fn(),
    },
  },
}));

const mockSelectedToken = {
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://example.com/eth-icon.png',
  tokenSupported: true,
};

const mockSelectedToken = {
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://example.com/eth-icon.png',
  tokenSupported: true,
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

const createMockStore = (tokensState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            tokens: {
              data: null,
              selected: null,
              isLoading: false,
              error: null,
              ...tokensState,
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

describe('useRampsTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns tokens, selectedToken, setSelectedToken, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        tokens: null,
        selectedToken: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.setSelectedToken).toBe('function');
    });
  });

  describe('tokens state', () => {
    it('returns tokens from state', () => {
      const store = createMockStore({ data: mockTokens });
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
    it('returns isLoading true when isLoading is true', () => {
      const store = createMockStore({
        isLoading: true,
      });
      const { result } = renderHook(() => useRampsTokens(), {
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
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('selectedToken state', () => {
    it('returns selectedToken from state', () => {
      const store = createMockStore({ selected: mockSelectedToken });
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedToken).toEqual(mockSelectedToken);
    });

    it('returns null when selectedToken is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedToken).toBeNull();
    });
  });

  describe('setSelectedToken', () => {
    it('calls Engine.context.RampsController.setSelectedToken with assetId', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedToken(mockSelectedToken);
      });

      expect(
        Engine.context.RampsController.setSelectedToken,
      ).toHaveBeenCalledWith(mockSelectedToken.assetId);
    });

    it('calls Engine.context.RampsController.setSelectedToken with undefined when token is null', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsTokens(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedToken(null);
      });

      expect(
        Engine.context.RampsController.setSelectedToken,
      ).toHaveBeenCalledWith(undefined);
    });
  });
});
