import { renderHook } from '@testing-library/react-native';
import { useVisibleOutcomePrices , __resetVisibleOutcomePriceCacheForTest } from './useVisibleOutcomePrices';
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
      queries,
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
      queries,
      enabled: false,
    });
  });
});
