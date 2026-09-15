import {
  parsePredictActivityPage,
  parsePredictBalance,
  parsePredictPositionsPage,
} from './portfolio';

const createBalance = (overrides = {}) => ({
  venueId: 'kalshi',
  currency: 'USD',
  available: '123.13',
  ...overrides,
});

describe('Predict API canonical Balance parser', () => {
  it('parses a canonical Balance', () => {
    const input = createBalance();

    expect(parsePredictBalance(input)).toEqual(input);
  });

  it('discards unknown fields', () => {
    const input = {
      ...createBalance(),
      balance_dollars: '123.13',
      venuePayload: 'discard',
    };

    expect(parsePredictBalance(input)).toEqual(createBalance());
  });

  it.each([
    ['a negative amount', '-1'],
    ['a zero-prefixed amount', '00.5'],
    ['an exponential amount', '1e3'],
    ['a non-numeric amount', 'free'],
    ['an empty amount', ''],
  ])('rejects %s as available', (_name, available) => {
    const input = createBalance({ available });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects an available amount that is not a string', () => {
    const input = createBalance({ available: 5 });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects a Balance for another Venue', () => {
    const input = createBalance({ venueId: 'other' });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects a Balance in another currency', () => {
    const input = createBalance({ currency: 'EUR' });

    expect(() => parsePredictBalance(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });
});

const createContext = (overrides = {}) => ({
  eventId: 'event-1',
  eventTitle: 'Lakers vs Celtics',
  marketQuestion: 'Will the Lakers win?',
  outcomeId: 'market-1-yes',
  outcomeLabel: 'Lakers',
  ...overrides,
});

const createPosition = (overrides = {}) => ({
  venueId: 'kalshi',
  marketId: 'market-1',
  side: 'yes',
  shares: '75.00',
  marketExposure: '41.25',
  realizedPnl: '-2.50',
  feesPaid: '0.14',
  totalTraded: '41.25',
  updatedAt: '2026-09-01T12:00:00.000Z',
  context: createContext(),
  ...overrides,
});

const createFill = (overrides = {}) => ({
  type: 'fill',
  id: 'fill-1',
  venueId: 'kalshi',
  marketId: 'market-1',
  outcomeSide: 'yes',
  shares: '75.00',
  price: '0.55',
  fee: '0.10',
  timestamp: '2026-09-01T12:00:00.000Z',
  context: createContext(),
  ...overrides,
});

const createSettlement = (overrides = {}) => ({
  type: 'settlement',
  id: 'market-1:2026-09-02T00:00:00.000Z',
  venueId: 'kalshi',
  marketId: 'market-1',
  result: 'yes',
  side: 'yes',
  shares: '75.00',
  proceeds: '75.00',
  costBasis: '41.25',
  fee: '0.00',
  timestamp: '2026-09-02T00:00:00.000Z',
  context: createContext(),
  ...overrides,
});

describe('Predict API canonical Positions parser', () => {
  it('parses a canonical Positions page', () => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition()],
    };

    expect(parsePredictPositionsPage(input)).toEqual(input);
  });

  it('parses a Positions page with degraded entries and no context', () => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition({ context: undefined })],
      nextCursor: 'opaque',
    };

    expect(parsePredictPositionsPage(input)).toEqual(input);
  });

  it('discards unknown fields', () => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition({ venue_shares: '75' })],
      upstreamPayload: 'discard',
    };

    expect(parsePredictPositionsPage(input)).toEqual({
      venueId: 'kalshi',
      positions: [createPosition()],
    });
  });

  it.each([
    ['a signed share count', { shares: '-75' }],
    ['an exponential share count', { shares: '1e3' }],
    ['a malformed timestamp', { updatedAt: 'yesterday' }],
    ['an empty market ID', { marketId: '' }],
    ['an invalid realized PnL', { realizedPnl: '+2.50' }],
  ])('rejects a position with %s', (_name, overrides) => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition(overrides)],
    };

    expect(() => parsePredictPositionsPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects a Positions page for another Venue', () => {
    const input = {
      venueId: 'other',
      positions: [createPosition()],
    };

    expect(() => parsePredictPositionsPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });
});

describe('Predict API canonical Activity parser', () => {
  it('parses a canonical Activity page with Fills and Settlements', () => {
    const input = {
      venueId: 'kalshi',
      activity: [createFill(), createSettlement()],
      nextCursor: 'opaque',
    };

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it('parses degraded Activity entries without catalog context', () => {
    const input = {
      venueId: 'kalshi',
      activity: [
        createFill({ context: undefined }),
        createSettlement({ context: undefined }),
      ],
    };

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it('discards unknown fields', () => {
    const input = {
      venueId: 'kalshi',
      activity: [
        createFill({ order_id: 'order-1', is_taker: true }),
        createSettlement({ revenue_cents: 4150 }),
      ],
    };

    expect(parsePredictActivityPage(input)).toEqual({
      venueId: 'kalshi',
      activity: [createFill(), createSettlement()],
    });
  });

  it('rejects an Activity entry without a known type', () => {
    const input = {
      venueId: 'kalshi',
      activity: [createFill({ type: 'order' })],
    };

    expect(() => parsePredictActivityPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it.each([
    ['a negative share count', { shares: '-75' }],
    ['an out-of-range price', { price: '1.5' }],
    ['a missing timestamp', { timestamp: undefined }],
    ['an invalid outcome side', { outcomeSide: 'maybe' }],
  ])('rejects a Fill with %s', (_name, overrides) => {
    const input = {
      venueId: 'kalshi',
      activity: [createFill(overrides)],
    };

    expect(() => parsePredictActivityPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it.each([
    ['a negative proceeds amount', { proceeds: '-75' }],
    ['an invalid result', { result: 'maybe' }],
    ['a missing proceeds amount', { proceeds: undefined }],
  ])('rejects a Settlement with %s', (_name, overrides) => {
    const input = {
      venueId: 'kalshi',
      activity: [createSettlement(overrides)],
    };

    expect(() => parsePredictActivityPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });

  it('rejects an Activity page for another Venue', () => {
    const input = {
      venueId: 'other',
      activity: [createFill()],
    };

    expect(() => parsePredictActivityPage(input)).toThrow(
      'The prediction service returned an invalid response.',
    );
  });
});
