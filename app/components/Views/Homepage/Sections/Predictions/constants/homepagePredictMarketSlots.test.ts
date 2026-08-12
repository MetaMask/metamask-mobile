import {
  HOMEPAGE_PREDICT_EVENT_QUERY,
  HOMEPAGE_PREDICT_MARKET_SLOTS,
} from './homepagePredictMarketSlots';

describe('homepagePredictMarketSlots', () => {
  it('defines the August 17–30 slots in display order', () => {
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
        id: '659548',
        slug: 'laliga-2027-champion-20260701200737375',
      },
      {
        type: 'event',
        id: '681261',
        slug: 'bundesliga-2027-champion-20260708164840303',
      },
      {
        type: 'event',
        id: '659488',
        slug: 'serie-a-2027-champion-20260701200118390',
      },
    ]);
  });

  it('queries all event-backed slots as open events', () => {
    const query = HOMEPAGE_PREDICT_EVENT_QUERY;

    expect(query).toBe(
      'active=true&archived=false&closed=false&id=659518&id=659548&id=681261&id=659488',
    );
  });
});
