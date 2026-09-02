import {
  Recurrence,
  type PredictMarket,
} from '../../../../../UI/Predict/types';
import { HOMEPAGE_PREDICT_MARKET_SLOTS } from '../constants/homepagePredictMarketSlots';
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
    const nfl = createMarket(
      '202857',
      'pro-football-2027-champion-20260729185915366',
      'NFL',
    );
    const epl = createMarket(
      '659518',
      'epl-2027-champion-20260701200428749',
      'EPL',
    );

    const result = orderHomepagePredictEventMarkets(
      [epl, nfl],
      HOMEPAGE_PREDICT_MARKET_SLOTS,
    );

    expect(result).toEqual([nfl, epl]);
  });

  it('excludes an event when its slug does not match config', () => {
    const staleEvent = createMarket('659518', 'reassigned-event', 'Unexpected');

    const result = orderHomepagePredictEventMarkets(
      [staleEvent],
      HOMEPAGE_PREDICT_MARKET_SLOTS,
    );

    expect(result).toEqual([]);
  });

  it('restores event response order from a dynamic series-event-event list', () => {
    const nfl = createMarket(
      '202857',
      'pro-football-2027-champion-20260729185915366',
      'NFL',
    );
    const epl = createMarket(
      '659518',
      'epl-2027-champion-20260701200428749',
      'EPL',
    );
    const slots = [
      HOMEPAGE_PREDICT_MARKET_SLOTS[1],
      HOMEPAGE_PREDICT_MARKET_SLOTS[2],
      HOMEPAGE_PREDICT_MARKET_SLOTS[0],
    ];

    const result = orderHomepagePredictEventMarkets([nfl, epl], slots);

    expect(result).toEqual([epl, nfl]);
  });
});
