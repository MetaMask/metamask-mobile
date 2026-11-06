import {
  compareActivityEntries,
  parsePredictActivityPage,
  parsePredictBalance,
  parsePredictPortfolioSummary,
  parsePredictPositionsPage,
} from './portfolio';
import multiPageHoldings from './fixtures/portfolio-contract/multi-page-holdings.json';
import missingQuote from './fixtures/portfolio-contract/missing-quote.json';
import sellBuyAndSettlement from './fixtures/portfolio-contract/sell-buy-and-settlement.json';
import type { PredictActivityEntry } from '../../types';

const INVALID_RESPONSE = 'The prediction service returned an invalid response.';

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
  outcomeLabel: 'Lakers',
  imageUrl: 'https://example.com/lal-bos.png',
  ...overrides,
});

const createPosition = (overrides = {}) => ({
  venueId: 'kalshi',
  marketId: 'market-1',
  side: 'yes',
  status: 'open',
  shares: '75.00',
  averagePrice: '0.55',
  costBasis: '41.25',
  currentValue: '45.00',
  unrealizedPnl: '3.75',
  unrealizedPnlPercent: '9.09',
  context: createContext(),
  ...overrides,
});

const createTrade = (overrides = {}) => ({
  type: 'trade',
  id: '0199f6a0-8c1e-7b3a-9d2e-4f1a2b3c4d5e',
  venueId: 'kalshi',
  marketId: 'market-1',
  side: 'yes',
  action: 'sell',
  shares: '10',
  price: '0.61',
  amount: '5.93',
  fee: '0.17',
  realizedPnl: '0.27',
  timestamp: '2026-09-02T12:00:00.000Z',
  context: createContext(),
  ...overrides,
});

const createSettlement = (overrides = {}) => ({
  type: 'settlement',
  id: 'settlement-market-1-yes-20260901',
  venueId: 'kalshi',
  marketId: 'market-1',
  side: 'yes',
  shares: '75',
  result: 'yes',
  proceeds: '75.00',
  realizedPnl: '33.75',
  timestamp: '2026-09-01T00:00:00.000Z',
  context: createContext(),
  ...overrides,
});

const createSummary = (overrides = {}) => ({
  venueId: 'kalshi',
  currency: 'USD',
  availableBalance: '120.50',
  positionsValue: '33.00',
  claimableValue: '0',
  totalValue: '153.50',
  unrealizedPnl: '0.64',
  unrealizedPnlPercent: '2.32',
  asOf: '2026-10-23T12:00:05.120Z',
  complete: true,
  ...overrides,
});

const pageOf = (activity: unknown[], overrides = {}) => ({
  venueId: 'kalshi',
  activity,
  ...overrides,
});

describe('Predict API canonical Positions parser', () => {
  it('parses a valued Positions page', () => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition()],
    };

    expect(parsePredictPositionsPage(input)).toEqual(input);
  });

  it.each([
    ['first page', multiPageHoldings.firstPage],
    ['second page', multiPageHoldings.secondPage],
    ['top Positions by value', multiPageHoldings.topByValue],
    ['missing-quote page', missingQuote.positions],
  ])('parses the C1 %s fixture unchanged', (_name, input) => {
    expect(parsePredictPositionsPage(input)).toEqual(input);
  });

  it('keeps a Position without a quote valueless rather than zero', () => {
    const [, unquoted] = parsePredictPositionsPage(
      missingQuote.positions,
    ).positions;

    expect(unquoted.costBasis).toBe('2.17');
    expect(unquoted).not.toHaveProperty('currentValue');
    expect(unquoted).not.toHaveProperty('unrealizedPnl');
    expect(unquoted).not.toHaveProperty('unrealizedPnlPercent');
  });

  it('parses a Position the Order ledger cannot account for', () => {
    const input = {
      venueId: 'kalshi',
      positions: [
        createPosition({
          averagePrice: undefined,
          costBasis: undefined,
          unrealizedPnl: undefined,
          unrealizedPnlPercent: undefined,
          context: undefined,
        }),
      ],
      nextCursor: 'opaque',
    };

    expect(parsePredictPositionsPage(input)).toEqual(input);
  });

  it('discards superseded and unknown fields', () => {
    const input = {
      venueId: 'kalshi',
      positions: [
        createPosition({
          marketExposure: '41.25',
          realizedPnl: '-2.50',
          feesPaid: '0.14',
          totalTraded: '41.25',
          updatedAt: '2026-09-01T12:00:00.000Z',
          context: createContext({
            eventImageUrl: 'https://example.com/event.png',
            outcomeId: 'market-1-yes',
          }),
        }),
      ],
      upstreamPayload: 'discard',
    };

    expect(parsePredictPositionsPage(input)).toEqual({
      venueId: 'kalshi',
      positions: [createPosition()],
    });
  });

  it.each([
    ['zero shares', { shares: '0' }],
    ['a signed share count', { shares: '-75' }],
    ['an exponential share count', { shares: '1e3' }],
    ['a missing status', { status: undefined }],
    ['an unknown status', { status: 'redeemable' }],
    ['an empty market ID', { marketId: '' }],
    ['an average price above 1', { averagePrice: '1.5' }],
    ['a signed current value', { currentValue: '-1' }],
    ['an explicitly signed PnL', { unrealizedPnl: '+3.75' }],
    [
      'a PnL without a current value',
      { currentValue: undefined, unrealizedPnlPercent: undefined },
    ],
    [
      'a PnL without a cost basis',
      { costBasis: undefined, unrealizedPnlPercent: undefined },
    ],
    ['a PnL percent without a PnL', { unrealizedPnl: undefined }],
    [
      'a context without an outcome label',
      { context: createContext({ outcomeLabel: undefined }) },
    ],
    [
      'a context with a non-HTTPS image',
      { context: createContext({ imageUrl: 'http://example.com/a.png' }) },
    ],
  ])('rejects a Position with %s', (_name, overrides) => {
    const input = {
      venueId: 'kalshi',
      positions: [createPosition(overrides)],
    };

    expect(() => parsePredictPositionsPage(input)).toThrow(INVALID_RESPONSE);
  });

  it('rejects a Positions page for another Venue', () => {
    const input = {
      venueId: 'other',
      positions: [createPosition()],
    };

    expect(() => parsePredictPositionsPage(input)).toThrow(INVALID_RESPONSE);
  });
});

describe('Predict API canonical Portfolio Summary parser', () => {
  it.each([
    ['complete', multiPageHoldings.summary],
    ['missing-quote', missingQuote.summary],
  ])('parses the C1 %s Summary fixture unchanged', (_name, input) => {
    expect(parsePredictPortfolioSummary(input)).toEqual(input);
  });

  it('keeps an incomplete Summary flagged', () => {
    expect(parsePredictPortfolioSummary(missingQuote.summary).complete).toBe(
      false,
    );
  });

  it('parses a Summary without a PnL percent', () => {
    const input = createSummary({
      unrealizedPnl: '0',
      unrealizedPnlPercent: undefined,
    });

    expect(parsePredictPortfolioSummary(input)).toEqual(input);
  });

  it('discards unknown fields', () => {
    const input = { ...createSummary(), portfolio_value: 15350 };

    expect(parsePredictPortfolioSummary(input)).toEqual(createSummary());
  });

  it.each([
    ['a missing complete flag', { complete: undefined }],
    ['a string complete flag', { complete: 'false' }],
    ['a missing total', { totalValue: undefined }],
    ['a missing unrealized PnL', { unrealizedPnl: undefined }],
    ['a malformed asOf', { asOf: 'now' }],
    ['another currency', { currency: 'EUR' }],
    ['another Venue', { venueId: 'other' }],
    ['a total that is not the exact sum', { totalValue: '153.51' }],
  ])('rejects a Summary with %s', (_name, overrides) => {
    expect(() =>
      parsePredictPortfolioSummary(createSummary(overrides)),
    ).toThrow(INVALID_RESPONSE);
  });
});

describe('Predict API canonical Activity parser', () => {
  it('parses the C1 sell, buy, and Settlement fixture unchanged', () => {
    const input = sellBuyAndSettlement.activity;

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it('parses a Settlement without context and with zero proceeds', () => {
    const [, settlement] = parsePredictActivityPage(
      sellBuyAndSettlement.activity,
    ).activity;

    expect(settlement).toMatchObject({
      type: 'settlement',
      side: 'no',
      result: 'yes',
      proceeds: '0',
      realizedPnl: '-3.36',
    });
    expect(settlement).not.toHaveProperty('context');
  });

  it('keeps the archive horizon on a page', () => {
    const input = pageOf([createTrade()], {
      settlementsCompleteFrom: '2026-08-27T00:00:00.000Z',
    });

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it('accepts a trade before a Settlement at the same timestamp', () => {
    const timestamp = '2026-09-01T00:00:00.000Z';
    const input = pageOf([
      createTrade({ timestamp }),
      createSettlement({ timestamp }),
    ]);

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it('accepts equal-key entries ordered by ascending id', () => {
    const input = pageOf([
      createTrade({ id: 'a' }),
      createTrade({ id: 'b', action: 'buy', realizedPnl: undefined }),
    ]);

    expect(parsePredictActivityPage(input)).toEqual(input);
  });

  it.each([
    [
      'an older entry before a newer one',
      [
        createSettlement({ timestamp: '2026-09-01T00:00:00.000Z' }),
        createTrade({ timestamp: '2026-09-02T00:00:00.000Z' }),
      ],
    ],
    [
      'a Settlement before a trade at the same timestamp',
      [
        createSettlement({ timestamp: '2026-09-01T00:00:00.000Z' }),
        createTrade({ timestamp: '2026-09-01T00:00:00.000Z' }),
      ],
    ],
    [
      'equal-key entries in descending id order',
      [createTrade({ id: 'b' }), createTrade({ id: 'a' })],
    ],
    ['a duplicated entry', [createTrade(), createTrade()]],
  ])('rejects a page with %s', (_name, activity) => {
    expect(() => parsePredictActivityPage(pageOf(activity))).toThrow(
      INVALID_RESPONSE,
    );
  });

  it('discards unknown fields', () => {
    const input = pageOf([
      createTrade({ order_id: 'order-1', is_taker: true }),
      createSettlement({ revenue: 7500, fee_cost: '0.3444' }),
    ]);

    expect(parsePredictActivityPage(input)).toEqual(
      pageOf([createTrade(), createSettlement()]),
    );
  });

  it('rejects a directionless fill entry', () => {
    const input = pageOf([
      {
        type: 'fill',
        id: 'fill-1',
        venueId: 'kalshi',
        marketId: 'market-1',
        outcomeSide: 'yes',
        shares: '75.00',
        price: '0.55',
        timestamp: '2026-09-01T12:00:00.000Z',
      },
    ]);

    expect(() => parsePredictActivityPage(input)).toThrow(INVALID_RESPONSE);
  });

  it.each([
    ['a missing action', { action: undefined }],
    ['an unknown action', { action: 'claim' }],
    ['a missing amount', { amount: undefined }],
    ['a missing fee', { fee: undefined }],
    ['a missing side', { side: undefined }],
    ['an out-of-range price', { price: '1.5' }],
    ['a missing timestamp', { timestamp: undefined }],
    ['a realized PnL on a buy', { action: 'buy' }],
  ])('rejects a trade with %s', (_name, overrides) => {
    expect(() =>
      parsePredictActivityPage(pageOf([createTrade(overrides)])),
    ).toThrow(INVALID_RESPONSE);
  });

  it.each([
    ['a negative proceeds amount', { proceeds: '-75' }],
    ['an invalid result', { result: 'maybe' }],
    ['a missing proceeds amount', { proceeds: undefined }],
    ['a missing side', { side: undefined }],
    ['missing shares', { shares: undefined }],
  ])('rejects a Settlement with %s', (_name, overrides) => {
    expect(() =>
      parsePredictActivityPage(pageOf([createSettlement(overrides)])),
    ).toThrow(INVALID_RESPONSE);
  });

  it('rejects an Activity page for another Venue', () => {
    expect(() =>
      parsePredictActivityPage(pageOf([createTrade()], { venueId: 'other' })),
    ).toThrow(INVALID_RESPONSE);
  });
});

describe('compareActivityEntries', () => {
  it('sorts newest first, then trades, then ascending id', () => {
    const timestamp = '2026-09-01T00:00:00.000Z';
    const entries = [
      createSettlement({ id: 'a', timestamp }),
      createTrade({ id: 'b', timestamp }),
      createTrade({ id: 'a', timestamp }),
      createTrade({ id: 'z', timestamp: '2026-09-02T00:00:00.000Z' }),
    ] as unknown as PredictActivityEntry[];

    const sorted = [...entries].sort(compareActivityEntries);

    expect(sorted.map((entry) => `${entry.type}:${entry.id}`)).toEqual([
      'trade:z',
      'trade:a',
      'trade:b',
      'settlement:a',
    ]);
  });
});
