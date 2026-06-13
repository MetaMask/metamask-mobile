import { renderHook } from '@testing-library/react-native';
import {
  __resetVisibleOutcomePriceCacheForTest,
  useVisibleOutcomePrices,
} from './useVisibleOutcomePrices';
import { usePredictPrices } from './usePredictPrices';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import type { PredictOutcomeToken, PriceQuery } from '../types';

jest.mock('./usePredictPrices', () => ({
  usePredictPrices: jest.fn(),
}));

jest.mock('./useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

const token: PredictOutcomeToken = {
  id: 'token-1',
  title: 'Yes',
  price: 0.51,
};

const createToken = (id: string): PredictOutcomeToken => ({
  id,
  title: id,
  price: 0.51,
});

const createQuery = (outcomeTokenId: string): PriceQuery => ({
  marketId: 'market-1',
  outcomeId: `outcome-${outcomeTokenId}`,
  outcomeTokenId,
});

const queries: PriceQuery[] = [
  {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
  },
];

describe('useVisibleOutcomePrices', () => {
  const mockUsePredictPrices = usePredictPrices as jest.MockedFunction<
    typeof usePredictPrices
  >;
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.MockedFunction<
    typeof useLiveMarketPrices
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetVisibleOutcomePriceCacheForTest();

    mockUsePredictPrices.mockReturnValue({
      prices: { providerId: '', results: [] },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseLiveMarketPrices.mockReturnValue({
      prices: new Map(),
      getPrice: jest.fn(() => undefined),
      isConnected: false,
      lastUpdateTime: null,
    });
  });

  it('does not subscribe or fetch when not visible', () => {
    renderHook(() =>
      useVisibleOutcomePrices({
        queries,
        tokens: [token],
        visible: false,
      }),
    );

    expect(mockUsePredictPrices).toHaveBeenCalledWith({
      queries: [],
      enabled: false,
    });
    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
      enabled: false,
    });
  });

  it('fetches once and subscribes when visible', () => {
    renderHook(() =>
      useVisibleOutcomePrices({
        queries,
        tokens: [token],
        visible: true,
      }),
    );

    expect(mockUsePredictPrices).toHaveBeenCalledWith({
      queries,
      enabled: true,
    });
    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(['token-1'], {
      enabled: true,
    });
  });

  it('uses fetched buy price before live websocket data arrives', () => {
    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
            entry: { buy: 0.63, sell: 0.37 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useVisibleOutcomePrices({
        queries,
        tokens: [token],
        visible: true,
      }),
    );

    expect(result.current.getTokenPrice(token)).toBe(0.63);
  });

  it('reuses the cached fetch result on subsequent mounts', () => {
    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
            entry: { buy: 0.63, sell: 0.37 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const first = renderHook(() =>
      useVisibleOutcomePrices({
        queries,
        tokens: [token],
        visible: true,
      }),
    );
    first.unmount();

    mockUsePredictPrices.mockClear();
    mockUsePredictPrices.mockReturnValue({
      prices: { providerId: '', results: [] },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    renderHook(() =>
      useVisibleOutcomePrices({
        queries,
        tokens: [token],
        visible: true,
      }),
    );

    expect(mockUsePredictPrices).toHaveBeenCalledWith({
      queries: [],
      enabled: false,
    });
  });

  it('only fetches uncached tokens when visible batches overlap', () => {
    const token1 = createToken('token-1');
    const token2 = createToken('token-2');
    const token3 = createToken('token-3');
    const query1 = createQuery('token-1');
    const query2 = createQuery('token-2');
    const query3 = createQuery('token-3');

    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: query1.marketId,
            outcomeId: query1.outcomeId,
            outcomeTokenId: query1.outcomeTokenId,
            entry: { buy: 0.63, sell: 0.37 },
          },
          {
            marketId: query2.marketId,
            outcomeId: query2.outcomeId,
            outcomeTokenId: query2.outcomeTokenId,
            entry: { buy: 0.53, sell: 0.47 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const { rerender } = renderHook(
      ({ currentQueries, currentTokens }) =>
        useVisibleOutcomePrices({
          queries: currentQueries,
          tokens: currentTokens,
          visible: true,
        }),
      {
        initialProps: {
          currentQueries: [query1, query2],
          currentTokens: [token1, token2],
        },
      },
    );

    mockUsePredictPrices.mockClear();
    mockUsePredictPrices.mockReturnValue({
      prices: { providerId: '', results: [] },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    rerender({
      currentQueries: [query1, query3],
      currentTokens: [token1, token3],
    });

    expect(mockUsePredictPrices).toHaveBeenCalledWith({
      queries: [query3],
      enabled: true,
    });
  });

  it('does not refetch a token after its first request returns no results', () => {
    const { rerender } = renderHook(
      ({ currentQueries }) =>
        useVisibleOutcomePrices({
          queries: currentQueries,
          tokens: [token],
          visible: true,
        }),
      { initialProps: { currentQueries: queries } },
    );

    expect(mockUsePredictPrices).toHaveBeenLastCalledWith({
      queries,
      enabled: true,
    });

    rerender({ currentQueries: [...queries] });

    expect(mockUsePredictPrices).toHaveBeenLastCalledWith({
      queries: [],
      enabled: false,
    });
  });
});
