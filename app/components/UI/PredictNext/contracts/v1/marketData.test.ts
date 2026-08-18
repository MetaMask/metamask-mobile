import { PredictError, PredictErrorCode } from '../../errors';
import {
  parsePredictEvent,
  parsePredictEventsPage,
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
  status: 'active' as const,
  ...overrides,
});

const createEvent = (overrides = {}) => ({
  venueId,
  id: 'event-1',
  title: 'Game outcome',
  markets: [createMarket()],
  ...overrides,
});

describe('Predict API canonical response parsers', () => {
  it('parses an event containing prices for each binary outcome', () => {
    const input = createEvent();

    const result = parsePredictEvent(input);

    expect(result).toEqual(input);
  });

  it('parses a closed Market', () => {
    const input = createEvent({
      markets: [createMarket({ status: 'closed' })],
    });

    expect(parsePredictEvent(input).markets[0].status).toBe('closed');
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

  it('parses category, volume, 24-hour volume, and image URL on an event', () => {
    const input = createEvent({
      category: 'Senate',
      volume: '1500000',
      volume24h: '250000',
      imageUrl: 'https://example.com/event.png',
      markets: [
        createMarket({
          volume: '1000',
          volume24h: '250',
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.category).toBe('Senate');
    expect(result.volume).toBe('1500000');
    expect(result.volume24h).toBe('250000');
    expect(result.markets[0].volume).toBe('1000');
    expect(result.markets[0].volume24h).toBe('250');
    expect(result.imageUrl).toBe('https://example.com/event.png');
  });

  it.each([
    '/images/event.png',
    'http://example.com/event.png',
    'data:image/png;base64,encoded-image',
    'https:example.com/event.png',
  ])('rejects image URL %s', (imageUrl) => {
    const input = createEvent({ imageUrl });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('parses an American-football Game Event', () => {
    const input = createEvent({
      startsAt: '2026-09-11T00:20:00Z',
      sports: {
        sport: { id: 'american-football', label: 'American football' },
        competition: { id: 'nfl', label: 'NFL' },
        game: {
          status: 'in_progress',
          awayTeam: {
            name: 'Arizona Cardinals',
            abbreviation: 'ARI',
            logoUrl: 'https://example.com/ari.png',
            primaryColor: `#${'97233F'}`,
          },
          homeTeam: { name: 'Carolina Panthers' },
          score: { away: '17', home: '21' },
          period: 'Q4',
          clock: '12:22',
          observedAt: '2026-09-11T02:30:00Z',
        },
      },
      markets: [
        createMarket({
          status: 'active',
          outcomes: [
            createOutcome('yes', { gameSelection: 'away' }),
            createOutcome('no', { gameSelection: 'draw' }),
          ],
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result).toEqual(input);
  });

  it.each([
    { field: 'status', value: 'playing' },
    { field: 'observedAt', value: 'yesterday' },
    { field: 'primaryColor', value: 'red' },
    { field: 'logoUrl', value: 'http://example.com/ari.png' },
  ])('rejects Game data with malformed $field', ({ field, value }) => {
    const game = {
      status: 'scheduled',
      awayTeam: { name: 'Arizona Cardinals' },
      homeTeam: { name: 'Carolina Panthers' },
      observedAt: '2026-09-11T00:00:00Z',
    };
    const input = createEvent({
      sports: {
        sport: { id: 'american-football', label: 'American football' },
        game:
          field === 'primaryColor' || field === 'logoUrl'
            ? {
                ...game,
                awayTeam: { ...game.awayTeam, [field]: value },
              }
            : { ...game, [field]: value },
      },
    });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
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
});
