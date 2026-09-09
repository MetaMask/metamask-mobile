import {
  buildHomepagePredictEventQuery,
  getHomepagePredictEventSlots,
  HOMEPAGE_PREDICT_MARKET_SLOTS,
} from './homepagePredictMarketSlots';

describe('homepagePredictMarketSlots', () => {
  it('defines the August 31–September 13 slots in display order', () => {
    const slots = HOMEPAGE_PREDICT_MARKET_SLOTS;

    expect(slots).toEqual([
      {
        type: 'event',
        id: '202857',
        slug: 'pro-football-2027-champion-20260729185915366',
      },
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
    ]);
  });

  it('derives event-backed slots without the BTC series', () => {
    const eventSlots = getHomepagePredictEventSlots(
      HOMEPAGE_PREDICT_MARKET_SLOTS,
    );

    expect(eventSlots).toEqual([
      {
        type: 'event',
        id: '202857',
        slug: 'pro-football-2027-champion-20260729185915366',
      },
      {
        type: 'event',
        id: '659518',
        slug: 'epl-2027-champion-20260701200428749',
      },
    ]);
  });

  it('queries both event-backed slots as open events', () => {
    const query = buildHomepagePredictEventQuery(HOMEPAGE_PREDICT_MARKET_SLOTS);

    expect(query).toBe(
      'active=true&archived=false&closed=false&id=202857&id=659518',
    );
  });

  it('builds event filters from an arbitrary mixed slot order', () => {
    const query = buildHomepagePredictEventQuery([
      HOMEPAGE_PREDICT_MARKET_SLOTS[2],
      HOMEPAGE_PREDICT_MARKET_SLOTS[1],
      HOMEPAGE_PREDICT_MARKET_SLOTS[0],
    ]);

    expect(query).toBe(
      'active=true&archived=false&closed=false&id=659518&id=202857',
    );
  });

  it('encodes configured event IDs as query values', () => {
    const query = buildHomepagePredictEventQuery([
      { type: 'event', id: '1&closed=true', slug: 'event' },
    ]);

    expect(query).toBe(
      'active=true&archived=false&closed=false&id=1%26closed%3Dtrue',
    );
  });
});
