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

  it('uses live best ask prices for open outcome tokens', () => {
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: (tokenId: string) =>
        tokenId === 'up-token'
          ? { tokenId, price: 0.7, bestBid: 0.69, bestAsk: 0.71 }
          : { tokenId, price: 0.3, bestBid: 0.29, bestAsk: 0.31 },
    });

    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    expect(result.current.openOutcomes[0].tokens[0].price).toBe(0.71);
    expect(result.current.openOutcomes[0].tokens[1].price).toBe(0.31);
    expect(result.current.yesPercentage).toBe(71);
  });

  it('falls back to REST buy prices when live prices are temporarily unavailable', () => {
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
            entry: { buy: 0.63, sell: 0.37 },
          },
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'down-token',
            entry: { buy: 0.43, sell: 0.57 },
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

    expect(result.current.openOutcomes[0].tokens[0].price).toBe(0.63);
    expect(result.current.openOutcomes[0].tokens[1].price).toBe(0.43);
    expect(result.current.yesPercentage).toBe(63);
  });
});
