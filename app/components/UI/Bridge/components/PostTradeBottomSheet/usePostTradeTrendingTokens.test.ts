import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getTrendingTokens,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import {
  POST_TRADE_TRENDING_TOKENS_LIMIT,
  usePostTradeTrendingTokens,
} from './usePostTradeTrendingTokens';
import type { BridgeToken } from '../../types';

jest.mock('@metamask/assets-controllers', () => ({
  getTrendingTokens: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

const mockGetTrendingTokens = jest.mocked(getTrendingTokens);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    logger: {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper };
};

const createBridgeToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: '0x1',
  ...overrides,
});

const createTrendingToken = (
  assetId: string,
  symbol: string,
  marketCap?: number,
): TrendingAsset =>
  ({
    assetId,
    symbol,
    name: symbol,
    decimals: 18,
    marketCap,
    price: '1',
    aggregatedUsdVolume: 1000,
    priceChangePct: { h24: '1' },
  }) as TrendingAsset;

describe('usePostTradeTrendingTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTrendingTokens.mockResolvedValue([]);
  });

  it('fetches, sorts by market cap descending, and caps results', async () => {
    const { Wrapper } = createWrapper();
    const tokens = [
      createTrendingToken(
        'eip155:137/erc20:0x0000000000000000000000000000000000000001',
        'POLY',
        5000,
      ),
      ...Array.from({ length: 25 }, (_, index) =>
        createTrendingToken(
          `eip155:1/erc20:0x${(index + 1).toString(16).padStart(40, '0')}`,
          `ETH${index + 1}`,
          index + 1,
        ),
      ),
      createTrendingToken(
        'eip155:1/erc20:0xffffffffffffffffffffffffffffffffffffffff',
        'NOCAP',
      ),
    ];
    mockGetTrendingTokens.mockResolvedValueOnce(tokens);

    const { result } = renderHook(
      () => usePostTradeTrendingTokens({ destToken: createBridgeToken() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetTrendingTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainIds: ['eip155:1'],
        sort: 'h24_trending',
      }),
    );
    expect(mockGetTrendingTokens).not.toHaveBeenCalledWith(
      expect.objectContaining({
        includeTokenSecurityData: true,
      }),
    );
    expect(mockGetTrendingTokens).not.toHaveBeenCalledWith(
      expect.objectContaining({
        vsCurrency: expect.any(String),
      }),
    );
    expect(mockGetTrendingTokens).toHaveBeenCalledTimes(1);
    expect(result.current.tokens).toHaveLength(
      POST_TRADE_TRENDING_TOKENS_LIMIT,
    );
    expect(result.current.tokens[0].symbol).toBe('POLY');
    expect(result.current.tokens[1].symbol).toBe('ETH25');
    expect(result.current.tokens[19].symbol).toBe('ETH7');
    expect(
      result.current.tokens.some((token) => token.symbol === 'NOCAP'),
    ).toBe(false);
  });

  it('does not fetch when disabled', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePostTradeTrendingTokens({
          destToken: createBridgeToken(),
          enabled: false,
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.tokens).toEqual([]);
    expect(mockGetTrendingTokens).not.toHaveBeenCalled();
  });

  it('fills sparse destination results with Ethereum tokens', async () => {
    const { Wrapper } = createWrapper();
    const lineaToken = createTrendingToken(
      'eip155:59144/erc20:0x0000000000000000000000000000000000000001',
      'LINEA',
      1,
    );
    const ethereumTokens = Array.from({ length: 20 }, (_, index) =>
      createTrendingToken(
        `eip155:1/erc20:0x${(index + 1).toString(16).padStart(40, '0')}`,
        `ETH${index + 1}`,
        index + 1,
      ),
    );
    let resolveEthereumTokens: (tokens: TrendingAsset[]) => void = () =>
      undefined;
    const ethereumTokensPromise = new Promise<TrendingAsset[]>((resolve) => {
      resolveEthereumTokens = resolve;
    });
    mockGetTrendingTokens
      .mockResolvedValueOnce([lineaToken])
      .mockReturnValueOnce(ethereumTokensPromise);

    const { result } = renderHook(
      () =>
        usePostTradeTrendingTokens({
          destToken: createBridgeToken({ chainId: '0xe708' }),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockGetTrendingTokens).toHaveBeenCalledTimes(2);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokens).toEqual([]);

    expect(mockGetTrendingTokens).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        chainIds: ['eip155:59144'],
        minLiquidity: 100000,
        minVolume24hUsd: 25000,
      }),
    );
    expect(mockGetTrendingTokens).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chainIds: ['eip155:1'],
        minLiquidity: 100000,
        minVolume24hUsd: 500000,
      }),
    );

    await act(async () => {
      resolveEthereumTokens(ethereumTokens);
    });

    await waitFor(() => {
      expect(result.current.tokens).toHaveLength(
        POST_TRADE_TRENDING_TOKENS_LIMIT,
      );
    });

    expect(result.current.tokens).toHaveLength(
      POST_TRADE_TRENDING_TOKENS_LIMIT,
    );
    expect(result.current.tokens[0]).toBe(lineaToken);
    expect(result.current.tokens[1].symbol).toBe('ETH20');
  });

  it('returns destination results when the Ethereum fallback fails', async () => {
    const { Wrapper } = createWrapper();
    const lineaToken = createTrendingToken(
      'eip155:59144/erc20:0x0000000000000000000000000000000000000001',
      'LINEA',
      1,
    );
    mockGetTrendingTokens
      .mockResolvedValueOnce([lineaToken])
      .mockRejectedValueOnce(new Error('Ethereum unavailable'));

    const { result } = renderHook(
      () =>
        usePostTradeTrendingTokens({
          destToken: createBridgeToken({ chainId: '0xe708' }),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockGetTrendingTokens).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tokens).toEqual([lineaToken]);
    expect(result.current.error).toBeNull();
  });

  it('does not request an Ethereum fallback for sparse Ethereum results', async () => {
    const { Wrapper } = createWrapper();
    const ethereumToken = createTrendingToken(
      'eip155:1/erc20:0x0000000000000000000000000000000000000001',
      'ETH1',
      1,
    );
    mockGetTrendingTokens.mockResolvedValueOnce([ethereumToken]);

    const { result } = renderHook(
      () => usePostTradeTrendingTokens({ destToken: createBridgeToken() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetTrendingTokens).toHaveBeenCalledTimes(1);
    expect(result.current.tokens).toEqual([ethereumToken]);
  });
});
