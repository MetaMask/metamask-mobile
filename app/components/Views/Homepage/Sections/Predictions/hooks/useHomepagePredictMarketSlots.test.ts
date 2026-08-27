import {
  Recurrence,
  type PredictMarket,
} from '../../../../../UI/Predict/types';
import { orderHomepagePredictEventMarkets } from './useHomepagePredictMarketSlots';

const createMarket = (
  id: string,
  slug: string,
  title: string,
): PredictMarket => ({
  id,
  providerId: 'polymarket',
  slug,
  title,
  description: title,
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['sports'],
  outcomes: [],
  liquidity: 1_000_000,
  volume: 500_000,
});

describe('orderHomepagePredictEventMarkets', () => {
  it('returns configured events in slot order', () => {
    const nba = createMarket('478277', 'nba-2027-champion', 'NBA');
    const epl = createMarket(
      '659518',
      'epl-2027-champion-20260701200428749',
      'EPL',
    );

    const result = orderHomepagePredictEventMarkets([nba, epl]);

    expect(result).toEqual([epl, nba]);
  });

  it('excludes an event when its slug does not match config', () => {
    const staleEvent = createMarket('659518', 'reassigned-event', 'Unexpected');

    const result = orderHomepagePredictEventMarkets([staleEvent]);

    expect(result).toEqual([]);
  });
});
