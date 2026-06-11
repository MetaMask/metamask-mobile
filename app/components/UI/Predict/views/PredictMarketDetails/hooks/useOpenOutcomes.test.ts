import { renderHook } from '@testing-library/react-native';
import { Recurrence, type PredictMarket } from '../../../types';
import { useLiveMarketPrices } from '../../../hooks/useLiveMarketPrices';
import { useOpenOutcomes } from './useOpenOutcomes';

jest.mock('../../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('falls back to the base market price when live prices are unavailable', () => {
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: () => undefined,
    });

    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    expect(result.current.openOutcomes[0].tokens[0].price).toBe(0.51);
    expect(result.current.openOutcomes[0].tokens[1].price).toBe(0.49);
    expect(result.current.yesPercentage).toBe(51);
  });

  it('subscribes to the open outcome token ids for live prices', () => {
    mockUseLiveMarketPrices.mockReturnValue({ getPrice: () => undefined });

    renderHook(() => useOpenOutcomes({ market: createMarket() }));

    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
      ['up-token', 'down-token'],
      { enabled: true },
    );
  });

  it('does not subscribe when market is null', () => {
    mockUseLiveMarketPrices.mockReturnValue({ getPrice: () => undefined });

    renderHook(() => useOpenOutcomes({ market: null }));

    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
      enabled: false,
    });
  });

  it('does not subscribe when disabled', () => {
    mockUseLiveMarketPrices.mockReturnValue({ getPrice: () => undefined });

    renderHook(() =>
      useOpenOutcomes({ market: createMarket(), enabled: false }),
    );

    expect(mockUseLiveMarketPrices).toHaveBeenCalledWith([], {
      enabled: false,
    });
  });
});
