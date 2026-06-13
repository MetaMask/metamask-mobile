import { renderHook } from '@testing-library/react-native';
import { Recurrence, type PredictMarket } from '../../../types';
import { useOpenOutcomes } from './useOpenOutcomes';

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
  it('returns the base open outcomes and snapshot yes percentage', () => {
    const { result } = renderHook(() =>
      useOpenOutcomes({ market: createMarket() }),
    );

    expect(result.current.openOutcomes[0].tokens[0].price).toBe(0.51);
    expect(result.current.openOutcomes[0].tokens[1].price).toBe(0.49);
    expect(result.current.yesPercentage).toBe(51);
  });

  it('returns empty outcomes and zero yes percentage when market is null', () => {
    const { result } = renderHook(() => useOpenOutcomes({ market: null }));
    expect(result.current.openOutcomes).toEqual([]);
    expect(result.current.closedOutcomes).toEqual([]);
    expect(result.current.yesPercentage).toBe(0);
  });
});
