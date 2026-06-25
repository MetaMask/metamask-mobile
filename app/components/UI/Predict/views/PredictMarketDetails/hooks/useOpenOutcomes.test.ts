import { renderHook } from '@testing-library/react-native';
import { Recurrence, type PredictMarket } from '../../../types';
import { useLiveMarketPrices } from '../../../hooks/useLiveMarketPrices';
import { usePredictPrices } from '../../../hooks/usePredictPrices';
import { useOpenOutcomes } from './useOpenOutcomes';

jest.mock('../../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

jest.mock('../../../hooks/usePredictPrices', () => ({
  usePredictPrices: jest.fn(),
}));

const createMarket = (): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-up-or-down',
  title: 'BTC Up or Down',
  description: 'BTC Up or Down',
  endDate: new Date(Date.now() + 60_000).toISOString(),
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto'],
  liquidity: 1000,
  volume: 1000,
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'BTC Up or Down',
      description: 'BTC Up or Down',
      image: 'https://example.com/btc.png',
      status: 'open',
      volume: 1000,
      groupItemTitle: 'BTC',
      tokens: [
        { id: 'up-token', title: 'Up', price: 0.51 },
        { id: 'down-token', title: 'Down', price: 0.49 },
      ],
    },
  ],
});

describe('useOpenOutcomes', () => {
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;
  const mockUsePredictPrices = usePredictPrices as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPrices.mockReturnValue({
      prices: { providerId: '', results: [] },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('uses the live mid for odds (price) and the best ask for buyPrice', () => {
    // Wide-spread book: up mid 0.70 (bid 0.50 / ask 0.90), down mid 0.30.
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: (tokenId: string) =>
        tokenId === 'up-token'
          ? { tokenId, price: 0.7, bestBid: 0.5, bestAsk: 0.9 }
          : { tokenId, price: 0.3, bestBid: 0.1, bestAsk: 0.5 },
    });

    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    // Odds (price) = mid, NOT the ask.
    expect(result.current.openOutcomes[0].tokens[0].price).toBe(0.7);
    expect(result.current.openOutcomes[0].tokens[1].price).toBe(0.3);
    // BUY CTA price = best ask.
    expect(result.current.openOutcomes[0].tokens[0].buyPrice).toBe(0.9);
    expect(result.current.openOutcomes[0].tokens[1].buyPrice).toBe(0.5);
    expect(result.current.yesPercentage).toBe(70);
  });

  it('derives odds from the REST mid (ask+bid)/2, buyPrice from the ask, on a wide-spread market', () => {
    // Mirrors the reported Almeria case: ask 0.92 / bid 0.34 -> mid 0.63.
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: () => undefined,
    });
    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'up-token',
            // entry.buy = ask, entry.sell = bid
            entry: { buy: 0.92, sell: 0.34 },
          },
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'down-token',
            entry: { buy: 0.66, sell: 0.08 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    // Odds (price) = mid: (0.92 + 0.34) / 2 = 0.63, (0.66 + 0.08) / 2 = 0.37.
    expect(result.current.openOutcomes[0].tokens[0].price).toBeCloseTo(0.63);
    expect(result.current.openOutcomes[0].tokens[1].price).toBeCloseTo(0.37);
    // BUY CTA price = ask.
    expect(result.current.openOutcomes[0].tokens[0].buyPrice).toBe(0.92);
    expect(result.current.openOutcomes[0].tokens[1].buyPrice).toBe(0.66);
    expect(result.current.yesPercentage).toBe(63);
  });

  it('falls back to the base token price for both odds and buyPrice when no live or REST prices exist', () => {
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: () => undefined,
    });
    // usePredictPrices already mocked to empty results in beforeEach.

    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    const token = result.current.openOutcomes[0].tokens[0];
    expect(token.price).toBe(0.51); // base mid
    expect(token.buyPrice).toBe(0.51); // ask falls back to base mid
    expect(result.current.yesPercentage).toBe(51);
  });

  it('preserves token object identity across re-renders when prices are unchanged', () => {
    const makeGetPrice = () => (tokenId: string) =>
      tokenId === 'up-token'
        ? { tokenId, price: 0.7, bestBid: 0.5, bestAsk: 0.9 }
        : { tokenId, price: 0.3, bestBid: 0.1, bestAsk: 0.5 };

    mockUseLiveMarketPrices.mockReturnValue({ getPrice: makeGetPrice() });

    const market = createMarket();
    const { result, rerender } = renderHook(() => useOpenOutcomes({ market }));
    const firstToken = result.current.openOutcomes[0].tokens[0];

    // New getPrice reference but identical values forces the memo to recompute
    // and exercise the identity-preservation reuse path.
    mockUseLiveMarketPrices.mockReturnValue({ getPrice: makeGetPrice() });
    rerender({});
    const secondToken = result.current.openOutcomes[0].tokens[0];

    expect(secondToken).toBe(firstToken);
  });
});
