import { PredictError, PredictErrorCode } from '../../errors';
import {
  parsePredictEvent,
  parsePredictEventsPage,
  parsePredictMarketHistory,
  parsePredictVenueStatus,
} from './marketData';

const venueId = 'kalshi';

const createOutcome = (side: 'yes' | 'no', overrides = {}) => ({
  id: `market-1-${side}`,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: side === 'yes' ? '0.42' : '0.61',
  bidPrice: side === 'yes' ? '0.40' : '0.58',
  ...overrides,
});

const createMarket = (overrides = {}) => ({
  id: 'market-1',
  question: 'Will the team win?',
  outcomes: [createOutcome('yes'), createOutcome('no')],
  status: 'open' as const,
  ...overrides,
});

const createEvent = (overrides = {}) => ({
  venueId,
  id: 'event-1',
  title: 'Game outcome',
  markets: [createMarket()],
  ...overrides,
});

const createMarketHistory = (overrides = {}) => ({
  venueId,
  marketId: 'market-1',
  range: '1D',
  observedAt: '2026-08-07T12:00:00Z',
  points: [
    {
      timestamp: '2026-08-07T11:00:00Z',
      yesPrice: '0.42',
      noPrice: '0.58',
    },
  ],
  ...overrides,
});

describe('Predict API canonical response parsers', () => {
  it('parses an event containing prices for each binary outcome', () => {
    const input = createEvent();

    const result = parsePredictEvent(input);

    expect(result).toEqual(input);
  });

  it('parses an event containing an ask without a bid', () => {
    const input = createEvent({
      markets: [
        createMarket({
          outcomes: [
            createOutcome('yes', { bidPrice: undefined }),
            createOutcome('no'),
          ],
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.markets[0].outcomes[0]).toEqual(
      expect.objectContaining({ askPrice: '0.42' }),
    );
    expect(result.markets[0].outcomes[0].bidPrice).toBeUndefined();
  });

  it.each(['0', '0.0', '0.42', '1', '1.000'])(
    'parses the price %s in the inclusive unit interval',
    (price) => {
      const input = createEvent({
        markets: [
          createMarket({
            outcomes: [
              createOutcome('yes', { askPrice: price }),
              createOutcome('no'),
            ],
          }),
        ],
      });

      const result = parsePredictEvent(input);

      expect(result.markets[0].outcomes[0].askPrice).toBe(price);
    },
  );

  it.each(['-0.1', '+0.5', '0.5 ', '1.01', '5e-1', ''])(
    'rejects the price representation %s',
    (price) => {
      const input = createEvent({
        markets: [
          createMarket({
            outcomes: [
              createOutcome('yes', { askPrice: price }),
              createOutcome('no'),
            ],
          }),
        ],
      });

      expect(() => parsePredictEvent(input)).toThrow(
        'Invalid Predict API response.',
      );
    },
  );

  it('discards unknown fields throughout an event', () => {
    const input = {
      ...createEvent(),
      venuePayload: 'discard',
      markets: [
        {
          ...createMarket(),
          venueMarketPayload: 'discard',
          outcomes: [
            { ...createOutcome('yes'), venueOutcomePayload: 'discard' },
            createOutcome('no'),
          ],
        },
      ],
    };

    const result = parsePredictEvent(input);

    expect(result).not.toHaveProperty('venuePayload');
    expect(result.markets[0]).not.toHaveProperty('venueMarketPayload');
    expect(result.markets[0].outcomes[0]).not.toHaveProperty(
      'venueOutcomePayload',
    );
  });

  it('rejects an event without markets', () => {
    const input = createEvent({ markets: [] });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects a market with two outcomes on the same side', () => {
    const input = createEvent({
      markets: [
        createMarket({
          outcomes: [createOutcome('yes'), createOutcome('yes')],
        }),
      ],
    });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects an event with a malformed timestamp', () => {
    const input = createEvent({ startsAt: 'not-a-timestamp' });

    try {
      parsePredictEvent(input);
      throw new Error('Expected parser to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictError);
      expect((error as PredictError).code).toBe(PredictErrorCode.UNKNOWN);
    }
  });

  it('parses a paginated event response', () => {
    const input = { items: [createEvent()], nextCursor: 'next-page' };

    const result = parsePredictEventsPage(input);

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('next-page');
  });

  it('parses an available Venue Status observation', () => {
    const input = {
      venueId,
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
      addition: 'discard',
    };

    const result = parsePredictVenueStatus(input);

    expect(result).toEqual({
      venueId,
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
    });
  });

  it.each(['LIVE', '1D', '1W', '1M', '1Y'] as const)(
    'parses %s Market history',
    (range) => {
      const input = createMarketHistory({ range });

      const result = parsePredictMarketHistory(input);

      expect(result).toEqual(input);
    },
  );

  it('discards unknown fields throughout Market history', () => {
    const input = createMarketHistory({
      addition: 'discard',
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z',
          yesPrice: '0.42',
          noPrice: '0.58',
          pointAddition: 'discard',
        },
      ],
    });

    const result = parsePredictMarketHistory(input);

    expect(result).toEqual({
      venueId,
      marketId: 'market-1',
      range: '1D',
      observedAt: '2026-08-07T12:00:00Z',
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z',
          yesPrice: '0.42',
          noPrice: '0.58',
        },
      ],
    });
  });

  it.each([
    ['venueId', createMarketHistory({ venueId: '' })],
    ['marketId', createMarketHistory({ marketId: '' })],
    ['range', createMarketHistory({ range: 'ALL' })],
    ['observedAt', createMarketHistory({ observedAt: 'not-a-timestamp' })],
    [
      'points',
      createMarketHistory({
        points: [
          {
            timestamp: '2026-08-07T11:00:00Z',
            yesPrice: 0.42,
            noPrice: '0.58',
          },
        ],
      }),
    ],
  ])('rejects malformed Market history %s', (_field, input) => {
    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it.each([
    [
      'timestamp',
      { timestamp: 'not-a-timestamp', yesPrice: '0.42', noPrice: '0.58' },
    ],
    [
      'missing noPrice',
      { timestamp: '2026-08-07T11:00:00Z', yesPrice: '0.42' },
    ],
    [
      'yesPrice',
      {
        timestamp: '2026-08-07T11:00:00Z',
        yesPrice: '1.01',
        noPrice: '0',
      },
    ],
    [
      'noPrice',
      {
        timestamp: '2026-08-07T11:00:00Z',
        yesPrice: '0.42',
        noPrice: '1.01',
      },
    ],
    [
      'non-complementary prices',
      {
        timestamp: '2026-08-07T11:00:00Z',
        yesPrice: '0.42',
        noPrice: '0.57',
      },
    ],
  ])('rejects a malformed Market history point %s', (_field, point) => {
    const input = createMarketHistory({ points: [point] });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects Market history points that are not chronological', () => {
    const input = createMarketHistory({
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z',
          yesPrice: '0.42',
          noPrice: '0.58',
        },
        {
          timestamp: '2026-08-07T10:00:00Z',
          yesPrice: '0.40',
          noPrice: '0.60',
        },
      ],
    });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects duplicate Market history point timestamps', () => {
    const point = {
      timestamp: '2026-08-07T11:00:00Z',
      yesPrice: '0.42',
      noPrice: '0.58',
    };
    const input = createMarketHistory({ points: [point, point] });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects Market history points after the backend observation time', () => {
    const input = createMarketHistory({
      points: [
        {
          timestamp: '2026-08-07T12:00:01Z',
          yesPrice: '0.42',
          noPrice: '0.58',
        },
      ],
    });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });
});
