import {
  HOMEPAGE_PREDICT_EVENT_QUERY,
  HOMEPAGE_PREDICT_MARKET_SLOTS,
} from './homepagePredictMarketSlots';

describe('homepagePredictMarketSlots', () => {
  it('defines the August 3–16 slots in display order', () => {
    const slots = HOMEPAGE_PREDICT_MARKET_SLOTS;

    expect(slots).toEqual([
      {
        type: 'series',
        series: {
          id: '10684',
          slug: 'btc-up-or-down-5m',
          title: 'BTC Up or Down',
          recurrence: '5m',
        },
      },
      {
        type: 'event',
        id: '659518',
        slug: 'epl-2027-champion-20260701200428749',
      },
      {
        type: 'event',
        id: '478277',
        slug: 'nba-2027-champion',
      },
    ]);
  });

  it('queries both event-backed slots as open events', () => {
    const query = HOMEPAGE_PREDICT_EVENT_QUERY;

    expect(query).toBe(
      'active=true&archived=false&closed=false&id=659518&id=478277',
    );
  });
});
